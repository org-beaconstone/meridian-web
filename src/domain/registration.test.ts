import { describe, expect, it } from 'vitest';
import { DEMO_DATE } from './model';
import {
  blankRegistrationDraft,
  prepareRegistration,
  validateRegistration,
  type RegistrationDraft,
} from './registration';

const valid = (): RegistrationDraft => ({
  givenName: 'Alex',
  familyName: 'Morgan',
  email: 'alex.morgan@example.com',
  mobile: '07700 900123',
  dateOfBirth: '1994-03-12',
  addressLine: '14 Harbour Lane',
  city: 'Bristol',
  postcode: 'BS1 4ST',
  acceptedTerms: true,
});

describe('registration validation', () => {
  it('accepts a fictional applicant and normalizes the fields', () => {
    const draft: RegistrationDraft = {
      ...valid(),
      givenName: '  Renée  ',
      familyName: " O'Brien ",
      email: 'Alex.Morgan@Example.com',
      mobile: '+44 (0) 7700 900123',
      addressLine: '  14   Harbour Lane ',
      city: 'Stoke-on-Trent',
      postcode: 'bs1  4st',
    };
    const snapshot = structuredClone(draft);
    const result = prepareRegistration(draft, DEMO_DATE);
    expect(draft).toEqual(snapshot);
    expect(result).toEqual({
      ok: true,
      registration: {
        givenName: 'Renée',
        familyName: "O'Brien",
        email: 'alex.morgan@example.com',
        mobile: '+447700900123',
        dateOfBirth: '1994-03-12',
        addressLine: '14 Harbour Lane',
        city: 'Stoke-on-Trent',
        postcode: 'BS1 4ST',
        acceptedTerms: true,
      },
    });
    expect(validateRegistration(draft, DEMO_DATE)).toEqual([]);
  });

  it('uses the demo date when no rehearsal date is passed', () => {
    expect(prepareRegistration(valid()).ok).toBe(true);
    expect(prepareRegistration({ ...valid(), dateOfBirth: '2010-01-01' }).ok).toBe(false);
  });

  it('reports every missing field', () => {
    expect(validateRegistration(blankRegistrationDraft()).map((error) => error.field)).toEqual([
      'givenName',
      'familyName',
      'email',
      'mobile',
      'dateOfBirth',
      'addressLine',
      'city',
      'postcode',
      'acceptedTerms',
    ]);
  });

  it.each([
    ['givenName', 'A'.repeat(41), '40 characters or fewer'],
    ['familyName', 'Morgan2', 'letters, spaces, hyphens or apostrophes'],
    ['city', 'Bristol!', 'letters, spaces, hyphens or apostrophes'],
    ['email', 'alex.morgan', 'valid email address'],
    ['email', 'alex..morgan@example.com', 'valid email address'],
    ['mobile', '020 7946 0958', 'UK mobile number'],
    ['mobile', '0770090012', 'UK mobile number'],
    ['addressLine', '4111 1111 1111 1111', 'not accepted'],
    ['addressLine', 'GB29 NWBK 6016 1331 9268 19', 'not accepted'],
    ['postcode', '12345', 'UK postcode'],
    ['postcode', 'Q1 1AA', 'UK postcode'],
  ] as const)('rejects %s value %s', (field, value, message) => {
    const result = prepareRegistration({ ...valid(), [field]: value });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([{ field, message: expect.stringContaining(message) }]);
    }
  });

  it.each(['07700900123', '+447700900123', '0044 7700 900123', '07700-900-123'])(
    'normalizes UK mobile %s',
    (mobile) => {
      const result = prepareRegistration({ ...valid(), mobile });
      expect(result.ok && result.registration.mobile).toBe('+447700900123');
    },
  );

  it.each(['SW1A 1AA', 'EC1A1BB', 'M1 1AE', 'W1A 0AX', 'B33 8TH', 'GIR 0AA'])(
    'normalizes postcode %s',
    (postcode) => {
      const result = prepareRegistration({ ...valid(), postcode });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.registration.postcode).toMatch(/^[A-Z0-9]{2,4} [A-Z0-9]{3}$/);
    },
  );

  it('accepts an applicant who turns 18 on the rehearsal date', () => {
    expect(prepareRegistration({ ...valid(), dateOfBirth: '2008-09-18' }, DEMO_DATE).ok).toBe(true);
  });

  it('rejects an applicant who turns 18 the next day', () => {
    const result = prepareRegistration({ ...valid(), dateOfBirth: '2008-09-19' }, DEMO_DATE);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].message).toContain('18 or older');
  });

  it('counts a leap-day birthday only after it has passed', () => {
    expect(prepareRegistration({ ...valid(), dateOfBirth: '2008-02-29' }, '2026-02-28').ok).toBe(
      false,
    );
    expect(prepareRegistration({ ...valid(), dateOfBirth: '2008-02-29' }, '2026-03-01').ok).toBe(
      true,
    );
  });

  it.each([
    ['2026-02-31', 'real date'],
    ['2026-09-19', 'in the future'],
    ['1905-09-18', 'Check the date of birth'],
  ])('rejects date of birth %s', (dateOfBirth, message) => {
    const result = validateRegistration({ ...valid(), dateOfBirth }, DEMO_DATE);
    expect(result.map((error) => error.message).join(' ')).toContain(message);
  });

  it('accepts a 120th birthday and rejects the day after that age', () => {
    expect(prepareRegistration({ ...valid(), dateOfBirth: '1906-09-18' }, DEMO_DATE).ok).toBe(true);
    expect(prepareRegistration({ ...valid(), dateOfBirth: '1905-09-18' }, DEMO_DATE).ok).toBe(
      false,
    );
  });

  it('does not check age when the rehearsal date is not a real calendar date', () => {
    const result = validateRegistration(valid(), '2026-02-31');
    expect(result).toEqual([
      { field: 'dateOfBirth', message: 'Unable to check age against the rehearsal date' },
    ]);
  });

  it('rejects control characters in an address', () => {
    const result = validateRegistration({ ...valid(), addressLine: '14 Harbour\u0000Lane' });
    expect(result.map((error) => error.message).join(' ')).toContain('invalid characters');
  });

  it('requires an explicit terms confirmation', () => {
    const result = validateRegistration({ ...valid(), acceptedTerms: false });
    expect(result).toEqual([
      { field: 'acceptedTerms', message: 'Confirm this is a fictional demo before continuing' },
    ]);
  });
});
