import { describe, expect, it } from 'vitest';
import { formatIban, ibanMod97, normalizeIban, validateIban } from './iban';

describe('validateIban', () => {
  it('accepts the standard German example, ignoring spaces and case', () => {
    const result = validateIban('de89 3704 0044 0532 0130 00');
    expect(result).toMatchObject({
      status: 'valid',
      iban: 'DE89370400440532013000',
      countryCode: 'DE',
      countryName: 'Germany',
    });
    expect(ibanMod97('DE89370400440532013000')).toBe(1);
  });

  it('accepts a Netherlands IBAN of the published length', () => {
    expect(validateIban('NL91 ABNA 0417 1643 00')).toMatchObject({
      status: 'valid',
      countryCode: 'NL',
      countryName: 'Netherlands',
    });
  });

  it('rejects a changed check digit', () => {
    expect(validateIban('DE89370400440532013001')).toMatchObject({
      status: 'invalid',
      message: 'IBAN check digits are invalid',
      countryName: 'Germany',
    });
  });

  it('rejects an unknown country code', () => {
    expect(validateIban('US89370400440532013000').status).toBe('invalid');
    expect(validateIban('XX89370400440532013000')).toMatchObject({
      message: 'Unrecognised IBAN country code',
    });
  });

  it('rejects the wrong length for a known country', () => {
    expect(validateIban('DE893704004405320130')).toMatchObject({
      message: 'Germany IBANs are 22 characters',
    });
  });

  it('rejects characters outside the IBAN alphabet', () => {
    expect(validateIban('DE89-3704')).toMatchObject({
      message: 'IBAN can only contain letters and numbers',
    });
  });

  it('stays empty until the customer types', () => {
    expect(validateIban('   ')).toEqual({ status: 'empty' });
  });

  it('formats a normalised IBAN in groups of four', () => {
    expect(normalizeIban('de89 3704')).toBe('DE893704');
    expect(formatIban('DE89370400440532013000')).toBe('DE89 3704 0044 0532 0130 00');
  });
});
