// Local IBAN checks for the fictional EUR transfer flow.
// This is the public ISO 13616 format and MOD-97 checksum, not a bank lookup.

export interface IbanCountry {
  length: number;
  name: string;
}

/** Recognised IBAN lengths for this demo. Not a live SWIFT directory. */
export const IBAN_COUNTRIES: Record<string, IbanCountry> = {
  AD: { length: 24, name: 'Andorra' },
  AT: { length: 20, name: 'Austria' },
  BE: { length: 16, name: 'Belgium' },
  BG: { length: 22, name: 'Bulgaria' },
  CH: { length: 21, name: 'Switzerland' },
  CY: { length: 28, name: 'Cyprus' },
  CZ: { length: 24, name: 'Czechia' },
  DE: { length: 22, name: 'Germany' },
  DK: { length: 18, name: 'Denmark' },
  EE: { length: 20, name: 'Estonia' },
  ES: { length: 24, name: 'Spain' },
  FI: { length: 18, name: 'Finland' },
  FO: { length: 18, name: 'Faroe Islands' },
  FR: { length: 27, name: 'France' },
  GB: { length: 22, name: 'United Kingdom' },
  GI: { length: 23, name: 'Gibraltar' },
  GL: { length: 18, name: 'Greenland' },
  GR: { length: 27, name: 'Greece' },
  HR: { length: 21, name: 'Croatia' },
  HU: { length: 28, name: 'Hungary' },
  IE: { length: 22, name: 'Ireland' },
  IS: { length: 26, name: 'Iceland' },
  IT: { length: 27, name: 'Italy' },
  LI: { length: 21, name: 'Liechtenstein' },
  LT: { length: 20, name: 'Lithuania' },
  LU: { length: 20, name: 'Luxembourg' },
  LV: { length: 21, name: 'Latvia' },
  MC: { length: 27, name: 'Monaco' },
  MT: { length: 31, name: 'Malta' },
  NL: { length: 18, name: 'Netherlands' },
  NO: { length: 15, name: 'Norway' },
  PL: { length: 28, name: 'Poland' },
  PT: { length: 25, name: 'Portugal' },
  RO: { length: 24, name: 'Romania' },
  SE: { length: 24, name: 'Sweden' },
  SI: { length: 19, name: 'Slovenia' },
  SK: { length: 24, name: 'Slovakia' },
  SM: { length: 27, name: 'San Marino' },
  VA: { length: 22, name: 'Vatican City' },
  XK: { length: 20, name: 'Kosovo' },
};

export type IbanValidation =
  | { status: 'empty' }
  | { status: 'valid'; iban: string; countryCode: string; countryName: string }
  | { status: 'invalid'; message: string; countryCode?: string; countryName?: string };

export function normalizeIban(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

export function formatIban(input: string): string {
  return normalizeIban(input)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

/** ISO 13616: rearrange, expand letters, remainder must be 1. */
export function ibanMod97(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const code = char.charCodeAt(0);
    const digits = code >= 65 && code <= 90 ? String(code - 55) : char;
    for (const digit of digits) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder;
}

export function validateIban(input: string): IbanValidation {
  const iban = normalizeIban(input);
  if (!iban) return { status: 'empty' };

  if (!/^[A-Z0-9]+$/.test(iban)) {
    return { status: 'invalid', message: 'IBAN can only contain letters and numbers' };
  }

  if (iban.length < 2 || !/^[A-Z]{2}/.test(iban)) {
    return { status: 'invalid', message: 'Enter a two-letter country code' };
  }

  const countryCode = iban.slice(0, 2);
  const country = IBAN_COUNTRIES[countryCode];
  if (!country) {
    return { status: 'invalid', message: 'Unrecognised IBAN country code', countryCode };
  }

  if (iban.length !== country.length) {
    return {
      status: 'invalid',
      message: `${country.name} IBANs are ${country.length} characters`,
      countryCode,
      countryName: country.name,
    };
  }

  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) {
    return {
      status: 'invalid',
      message: 'IBAN format is invalid',
      countryCode,
      countryName: country.name,
    };
  }

  if (ibanMod97(iban) !== 1) {
    return {
      status: 'invalid',
      message: 'IBAN check digits are invalid',
      countryCode,
      countryName: country.name,
    };
  }

  return { status: 'valid', iban, countryCode, countryName: country.name };
}
