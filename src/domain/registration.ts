// Registration checks for a fictional personal account.
// Pure validation only: nothing is stored and no login is created.

import { DEMO_DATE, isCalendarDate } from './model';

export type RegistrationField =
  | 'givenName'
  | 'familyName'
  | 'email'
  | 'mobile'
  | 'dateOfBirth'
  | 'addressLine'
  | 'city'
  | 'postcode'
  | 'acceptedTerms';

export interface RegistrationDraft {
  givenName: string;
  familyName: string;
  email: string;
  mobile: string;
  dateOfBirth: string;
  addressLine: string;
  city: string;
  postcode: string;
  acceptedTerms: boolean;
}

/** Normalized details that passed validation. Still not an opened account. */
export interface Registration {
  givenName: string;
  familyName: string;
  email: string;
  mobile: string;
  dateOfBirth: string;
  addressLine: string;
  city: string;
  postcode: string;
  acceptedTerms: true;
}

export interface RegistrationFieldError {
  field: RegistrationField;
  message: string;
}

export type RegistrationResult =
  { ok: true; registration: Registration } | { ok: false; errors: RegistrationFieldError[] };

const MIN_AGE = 18;
const MAX_AGE = 120;
const NAME_MAX = 40;
const ADDRESS_MAX = 80;
const PERSON_NAME = /^\p{L}+(?:['’ -]\p{L}+)*$/u;
const UK_POSTCODE =
  /^(?:GIR\s*0AA|[A-PR-UWYZ](?:[0-9]{1,2}|[A-HK-Y][0-9](?:[0-9ABEHMNPRV-Y])?|[0-9][A-HJKPSTUW])\s*[0-9][ABD-HJLNP-UW-Z]{2})$/i;
const PAYMENT_NUMBER = /(?:\d[ -]?){12}\d/;
const PAYMENT_MESSAGE = 'Card and bank account numbers are not accepted';

export function blankRegistrationDraft(): RegistrationDraft {
  return {
    givenName: '',
    familyName: '',
    email: '',
    mobile: '',
    dateOfBirth: '',
    addressLine: '',
    city: '',
    postcode: '',
    acceptedTerms: false,
  };
}

/**
 * Field errors for a registration draft. Empty means the draft can be normalized.
 * `asOf` is the rehearsal date used for the age check and defaults to the demo date.
 */
export function validateRegistration(
  draft: RegistrationDraft,
  asOf = DEMO_DATE,
): RegistrationFieldError[] {
  return assessRegistration(draft, asOf).errors;
}

/**
 * Validate and normalize a registration draft. Does not persist or mutate the input.
 */
export function prepareRegistration(
  draft: RegistrationDraft,
  asOf = DEMO_DATE,
): RegistrationResult {
  const { errors, registration } = assessRegistration(draft, asOf);
  if (errors.length > 0 || !registration) return { ok: false, errors };
  return { ok: true, registration };
}

function assessRegistration(
  draft: RegistrationDraft,
  asOf: string,
): { errors: RegistrationFieldError[]; registration: Registration | null } {
  const errors: RegistrationFieldError[] = [];
  const givenName = readName(draft?.givenName, 'Given name', NAME_MAX);
  const familyName = readName(draft?.familyName, 'Family name', NAME_MAX);
  const email = readEmail(draft?.email);
  const mobile = readMobile(draft?.mobile);
  const dateOfBirth = readDateOfBirth(draft?.dateOfBirth, asOf);
  const addressLine = readAddress(draft?.addressLine);
  const city = readName(draft?.city, 'City', NAME_MAX);
  const postcode = readPostcode(draft?.postcode);

  push(errors, 'givenName', givenName.error);
  push(errors, 'familyName', familyName.error);
  push(errors, 'email', email.error);
  push(errors, 'mobile', mobile.error);
  push(errors, 'dateOfBirth', dateOfBirth.error);
  push(errors, 'addressLine', addressLine.error);
  push(errors, 'city', city.error);
  push(errors, 'postcode', postcode.error);
  if (draft?.acceptedTerms !== true) {
    errors.push({
      field: 'acceptedTerms',
      message: 'Confirm this is a fictional demo before continuing',
    });
  }

  if (
    errors.length > 0 ||
    !givenName.value ||
    !familyName.value ||
    !email.value ||
    !mobile.value ||
    !dateOfBirth.value ||
    !addressLine.value ||
    !city.value ||
    !postcode.value
  ) {
    return { errors, registration: null };
  }

  return {
    errors,
    registration: {
      givenName: givenName.value,
      familyName: familyName.value,
      email: email.value,
      mobile: mobile.value,
      dateOfBirth: dateOfBirth.value,
      addressLine: addressLine.value,
      city: city.value,
      postcode: postcode.value,
      acceptedTerms: true,
    },
  };
}

function push(errors: RegistrationFieldError[], field: RegistrationField, message: string | null) {
  if (message) errors.push({ field, message });
}

function readName(
  value: unknown,
  label: string,
  max: number,
): { value: string | null; error: string | null } {
  if (typeof value !== 'string' || value.trim() === '') {
    return { value: null, error: `${label} is required` };
  }
  if (hasControlCharacter(value)) {
    return { value: null, error: `${label} contains invalid characters` };
  }
  const text = value.trim().replace(/\s+/g, ' ');
  if (text.length > max)
    return { value: null, error: `${label} must be ${max} characters or fewer` };
  if (containsPaymentNumber(text)) {
    return { value: null, error: PAYMENT_MESSAGE };
  }
  if (!PERSON_NAME.test(text)) {
    return { value: null, error: 'Use letters, spaces, hyphens or apostrophes' };
  }
  return { value: text, error: null };
}

function readEmail(value: unknown): { value: string | null; error: string | null } {
  if (typeof value !== 'string' || value.trim() === '') {
    return { value: null, error: 'Email is required' };
  }
  const email = value.trim().toLowerCase();
  if (containsPaymentNumber(email)) {
    return { value: null, error: PAYMENT_MESSAGE };
  }
  if (!isEmail(email)) return { value: null, error: 'Enter a valid email address' };
  return { value: email, error: null };
}

function isEmail(email: string): boolean {
  if (email.length > 254) return false;
  const at = email.indexOf('@');
  if (at <= 0 || at !== email.lastIndexOf('@')) return false;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return false;
  }
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return false;
  if (
    domain.length > 253 ||
    domain.startsWith('.') ||
    domain.endsWith('.') ||
    domain.includes('..')
  ) {
    return false;
  }
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(domain)) return false;
  const labels = domain.split('.');
  if (labels.some((label) => label.length > 63 || label.startsWith('-') || label.endsWith('-'))) {
    return false;
  }
  return /^[a-z]{2,}$/i.test(labels[labels.length - 1]);
}

function readMobile(value: unknown): { value: string | null; error: string | null } {
  if (typeof value !== 'string' || value.trim() === '') {
    return { value: null, error: 'Mobile number is required' };
  }
  const compact = value.replace(/[\s().-]/g, '');
  let national: string | null = null;
  if (/^07\d{9}$/.test(compact)) national = compact.slice(1);
  else if (/^\+447\d{9}$/.test(compact)) national = compact.slice(3);
  else if (/^\+4407\d{9}$/.test(compact)) national = compact.slice(4);
  else if (/^00447\d{9}$/.test(compact)) national = compact.slice(4);
  else if (/^004407\d{9}$/.test(compact)) national = compact.slice(5);
  if (!national) {
    return { value: null, error: 'Enter a UK mobile number, such as 07700 900123' };
  }
  return { value: `+44${national}`, error: null };
}

function readDateOfBirth(
  value: unknown,
  asOf: string,
): { value: string | null; error: string | null } {
  if (typeof value !== 'string' || value.trim() === '') {
    return { value: null, error: 'Date of birth is required' };
  }
  const date = value.trim();
  if (!isCalendarDate(date)) return { value: null, error: 'Enter a real date as YYYY-MM-DD' };
  if (!isCalendarDate(asOf)) {
    return { value: null, error: 'Unable to check age against the rehearsal date' };
  }
  if (date > asOf) return { value: null, error: 'Date of birth cannot be in the future' };
  const age = completedYears(date, asOf);
  if (age < MIN_AGE) return { value: null, error: 'You must be 18 or older to register' };
  if (age > MAX_AGE) return { value: null, error: 'Check the date of birth' };
  return { value: date, error: null };
}

function completedYears(dob: string, asOf: string): number {
  const [year, month, day] = dob.split('-').map(Number);
  const [asOfYear, asOfMonth, asOfDay] = asOf.split('-').map(Number);
  let age = asOfYear - year;
  if (asOfMonth < month || (asOfMonth === month && asOfDay < day)) age -= 1;
  return age;
}

function readAddress(value: unknown): { value: string | null; error: string | null } {
  if (typeof value !== 'string' || value.trim() === '') {
    return { value: null, error: 'Address is required' };
  }
  if (hasControlCharacter(value)) {
    return { value: null, error: 'Address contains invalid characters' };
  }
  const text = value.trim().replace(/\s+/g, ' ');
  if (text.length > ADDRESS_MAX) {
    return { value: null, error: `Address must be ${ADDRESS_MAX} characters or fewer` };
  }
  if (containsPaymentNumber(text)) {
    return { value: null, error: PAYMENT_MESSAGE };
  }
  if (!/[\p{L}\p{N}]/u.test(text)) return { value: null, error: 'Enter a street address' };
  return { value: text, error: null };
}

function readPostcode(value: unknown): { value: string | null; error: string | null } {
  if (typeof value !== 'string' || value.trim() === '') {
    return { value: null, error: 'Postcode is required' };
  }
  const compact = value.trim().replace(/\s+/g, '').toUpperCase();
  if (!UK_POSTCODE.test(compact)) {
    return { value: null, error: 'Enter a UK postcode, such as BS1 4ST' };
  }
  if (compact === 'GIR0AA') return { value: 'GIR 0AA', error: null };
  return { value: `${compact.slice(0, -3)} ${compact.slice(-3)}`, error: null };
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
}

function containsPaymentNumber(value: string): boolean {
  const compact = value.replace(/\s+/g, '');
  if (/GB\d{2}[A-Z]{4}\d{14}/i.test(compact)) return true;
  return PAYMENT_NUMBER.test(value);
}
