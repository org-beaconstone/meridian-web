#!/usr/bin/env node
/* global Buffer, URL, console, process */
import fs from 'node:fs';
import path from 'node:path';

const templateDir = resolveTemplateDir();

function resolveTemplateDir() {
  const candidates = [
    path.join(process.cwd(), '.jira', 'templates'),
    path.join(path.dirname(new URL(import.meta.url).pathname), '.jira', 'templates'),
  ];
  return candidates.find((dir) => fs.existsSync(dir)) ?? candidates[0];
}

function fail(errors, extra = {}) {
  console.log(JSON.stringify({ status: 'fail', errors, ...extra }, null, 2));
  process.exit(1);
}

function pass(payload) {
  console.log(JSON.stringify({ status: 'pass', ...payload }, null, 2));
  process.exit(0);
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const body = arg.slice(2);
    const eq = body.indexOf('=');
    if (eq !== -1) {
      flags[body.slice(0, eq)] = body.slice(eq + 1);
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      flags[body] = true;
    } else {
      flags[body] = next;
      i += 1;
    }
  }
  return { positional, flags };
}

function stripInlineComment(value) {
  let quote = '';
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (quote) {
      if (ch === '\\' && quote === '"') {
        i += 1;
        continue;
      }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '#' && (i === 0 || value[i - 1] === ' ')) return value.slice(0, i).trim();
  }
  return value.trim();
}

function parseScalar(raw) {
  const value = stripInlineComment(raw);
  if (value.startsWith('"')) {
    let out = '';
    for (let i = 1; i < value.length; i += 1) {
      const ch = value[i];
      if (ch === '\\') {
        i += 1;
        out += value[i] ?? '';
        continue;
      }
      if (ch === '"') return out;
      out += ch;
    }
    throw new Error(`Unterminated string: ${raw}`);
  }
  if (value.startsWith("'")) {
    const end = value.indexOf("'", 1);
    if (end === -1) throw new Error(`Unterminated string: ${raw}`);
    return value.slice(1, end).replaceAll("''", "'");
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~' || value === '') return null;
  return value;
}

function nextMeaningful(lines, start) {
  for (let i = start; i < lines.length; i += 1) {
    const raw = lines[i];
    if (raw.trim() === '' || raw.trim().startsWith('#')) continue;
    const indent = raw.match(/^ */)[0].length;
    return { indent, text: raw.slice(indent) };
  }
  return null;
}

function readBlock(lines, start, parentIndent, fold) {
  const parts = [];
  let i = start;
  for (; i < lines.length; i += 1) {
    const raw = lines[i];
    if (raw.trim() === '') {
      parts.push('');
      continue;
    }
    const indent = raw.match(/^ */)[0].length;
    if (indent <= parentIndent) break;
    parts.push(raw.slice(indent));
  }
  while (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
  const text = fold
    ? parts
        .join('\n')
        .replace(/([^\n])\n(?!\n)/g, '$1 ')
        .replace(/\n{2,}/g, '\n')
        .trim()
    : parts.join('\n');
  return { text, next: i };
}

function parseYaml(source) {
  const lines = source.split(/\r?\n/);
  const root = {};
  const stack = [{ indent: -1, value: root }];
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    if (raw.trim() === '' || raw.trim().startsWith('#')) {
      i += 1;
      continue;
    }
    const indent = raw.match(/^ */)[0].length;
    const text = raw.slice(indent);
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].value;

    if (text.startsWith('- ')) {
      if (!Array.isArray(parent)) throw new Error(`List item is not inside a list: ${text}`);
      const rest = text.slice(2).trim();
      const colon = rest.indexOf(':');
      if (colon === -1) {
        parent.push(parseScalar(rest));
      } else {
        const item = {};
        parent.push(item);
        const key = rest.slice(0, colon).trim();
        const val = rest.slice(colon + 1).trim();
        if (val === '|' || val === '>') {
          const block = readBlock(lines, i + 1, indent, val === '>');
          item[key] = block.text;
          stack.push({ indent, value: item });
          i = block.next;
          continue;
        }
        item[key] = parseScalar(val);
        stack.push({ indent, value: item });
      }
      i += 1;
      continue;
    }

    const colon = text.indexOf(':');
    if (colon === -1) throw new Error(`Expected key: ${text}`);
    const key = text.slice(0, colon).trim();
    const val = text.slice(colon + 1).trim();
    if (Array.isArray(parent)) throw new Error(`Mapping key inside a list: ${key}`);
    if (val === '|' || val === '>') {
      const block = readBlock(lines, i + 1, indent, val === '>');
      parent[key] = block.text;
      i = block.next;
      continue;
    }
    if (val === '') {
      const upcoming = nextMeaningful(lines, i + 1);
      const container = upcoming && upcoming.indent > indent && upcoming.text.startsWith('- ') ? [] : {};
      parent[key] = container;
      stack.push({ indent, value: container });
      i += 1;
      continue;
    }
    parent[key] = parseScalar(val);
    i += 1;
  }
  return root;
}

function loadTemplates() {
  if (!fs.existsSync(templateDir)) fail([`Template directory not found: ${templateDir}`]);
  return fs
    .readdirSync(templateDir)
    .filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'))
    .map((filename) => {
      const filePath = path.join(templateDir, filename);
      let doc;
      try {
        doc = parseYaml(fs.readFileSync(filePath, 'utf8'));
      } catch (error) {
        fail([`${filename}: ${error.message}`]);
      }
      const stem = filename.replace(/\.ya?ml$/, '');
      const name = typeof doc.name === 'string' ? doc.name : stem;
      const kind = typeof doc.kind === 'string' ? doc.kind : '';
      const required = Array.isArray(doc.required) ? doc.required.map(String) : [];
      const fields = normalizeFields(doc.fields);
      const errors = [];
      if (!kind) errors.push(`${filename}: kind is missing`);
      if (!name) errors.push(`${filename}: name is missing`);
      for (const field of fields) {
        if (!field.name) errors.push(`${filename}: a field is missing name`);
        if (!field.heading) errors.push(`${filename}: ${field.name || 'field'} is missing heading`);
        if (!field.guidance) errors.push(`${filename}: ${field.name || 'field'} is missing guidance`);
      }
      const known = new Set(fields.map((field) => field.name));
      for (const entry of required) {
        if (!known.has(entry)) errors.push(`${filename}: required field ${entry} is not declared`);
      }
      return { filename, name, kind, required, fields, errors };
    });
}

function normalizeFields(value) {
  if (Array.isArray(value)) {
    return value.map((field) => ({
      name: String(field?.name ?? ''),
      heading: String(field?.heading ?? ''),
      guidance: String(field?.guidance ?? ''),
    }));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([name, field]) => ({
      name,
      heading: String(field?.heading ?? ''),
      guidance: String(field?.guidance ?? ''),
    }));
  }
  return [];
}

function selectTemplates(templates, flags) {
  return templates.filter((template) => !flags.kind || template.kind === flags.kind);
}

function presentFields(template) {
  const required = new Set(template.required);
  return template.fields.map((field) => ({
    name: field.name,
    heading: field.heading,
    guidance: field.guidance,
    required: required.has(field.name),
  }));
}

async function readFieldsObject(flags) {
  let parsed;
  if (typeof flags.fields === 'string') {
    parsed = JSON.parse(flags.fields);
  } else if (typeof flags['fields-file'] === 'string') {
    parsed = JSON.parse(fs.readFileSync(flags['fields-file'], 'utf8'));
  } else if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString('utf8').trim();
    if (!text) return null;
    parsed = JSON.parse(text);
  } else {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('fields object must be a JSON object');
  }
  if (parsed.fields && typeof parsed.fields === 'object' && !Array.isArray(parsed.fields)) {
    return parsed.fields;
  }
  return parsed;
}

function filled(value) {
  return typeof value === 'string' && value.trim() !== '';
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [group, action, name] = positional;
  const templates = loadTemplates();
  const broken = templates.flatMap((template) => template.errors);
  if (broken.length > 0) fail(broken);

  if (group === 'template' && action === 'show') {
    const matches = selectTemplates(templates, flags).filter((template) => template.name === name);
    if (matches.length !== 1) {
      fail([`Template not found: ${name ?? '(missing)'}${flags.kind ? ` kind ${flags.kind}` : ''}`], {
        command: 'template show',
      });
    }
    const template = matches[0];
    pass({
      command: 'template show',
      kind: template.kind,
      template: template.name,
      required: template.required,
      fields: presentFields(template),
    });
  }

  if (group === 'template' && action === 'list') {
    const matches = selectTemplates(templates, flags);
    if (matches.length === 0) {
      fail([`No templates${flags.kind ? ` for kind ${flags.kind}` : ''}`], { command: 'template list' });
    }
    pass({
      command: 'template list',
      kind: flags.kind ?? null,
      templates: matches.map((template) => ({
        name: template.name,
        kind: template.kind,
        required: template.required,
        fields: template.fields.map((field) => field.name),
      })),
    });
  }

  if (group === 'work-item' && action === 'draft-validate') {
    const templateName = typeof flags.template === 'string' ? flags.template : name;
    const matches = selectTemplates(templates, flags).filter((template) => template.name === templateName);
    if (matches.length !== 1) {
      fail([`Template not found: ${templateName ?? '(missing)'}`], { command: 'work-item draft-validate' });
    }
    const template = matches[0];
    let fields;
    try {
      fields = await readFieldsObject(flags);
    } catch (error) {
      fail([error.message], { command: 'work-item draft-validate', template: template.name });
    }
    if (!fields) {
      fail(['A fields object is required'], { command: 'work-item draft-validate', template: template.name });
    }
    const missing = template.required.filter((entry) => !filled(fields[entry]));
    if (missing.length > 0) {
      fail(
        missing.map((entry) => `Missing required field: ${entry}`),
        { command: 'work-item draft-validate', template: template.name, kind: template.kind, missing },
      );
    }
    pass({
      command: 'work-item draft-validate',
      template: template.name,
      kind: template.kind,
      required: template.required,
    });
  }

  fail(['Usage: jira-cli.mjs template show <name> [--kind work-item] | template list [--kind work-item] | work-item draft-validate --template <name>']);
}

main();
