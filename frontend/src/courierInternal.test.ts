import { describe, expect, it } from 'vitest';
import { courierCities, prepareInternalCourierFields, serializeCourierCities, validIdentityExpiry } from './courierInternal';
import { normalizeDigits } from './forms';

describe('internal courier fields', () => {
  it('uses the approved city list without outdated or duplicate spellings', () => {
    expect(courierCities).toContain('القصيم');
    expect(courierCities).toContain('الشرقية');
    expect(courierCities).not.toContain('القيصومة');
    expect(new Set(courierCities).size).toBe(courierCities.length);
  });

  it('sends one deduplicated city string', () => {
    expect(serializeCourierCities(['جدة', 'الرياض', 'جدة', 'الشرقية'])).toBe('جدة، الرياض، الشرقية');
    expect(prepareInternalCourierFields({}, ['القصيم', 'الشرقية']).city).toBe('القصيم، الشرقية');
  });

  it('rejects empty, unapproved, overlong and too many cities', () => {
    expect(() => serializeCourierCities([])).toThrow();
    expect(() => serializeCourierCities(['القيصومة'])).toThrow();
    expect(() => serializeCourierCities([...courierCities.slice(0, 21)])).toThrow();
    expect(() => serializeCourierCities([...courierCities.slice(0, 20)])).toThrow(/100/);
  });

  it('omits an unspecified sponsorship count but preserves zero and Arabic numerals', () => {
    expect(prepareInternalCourierFields({ sponsorship_transfer_count: '' }, ['جدة'])).toEqual({ city: 'جدة' });
    expect(prepareInternalCourierFields({ sponsorship_transfer_count: '0' }, ['جدة']).sponsorship_transfer_count).toBe('0');
    expect(prepareInternalCourierFields({ sponsorship_transfer_count: normalizeDigits('۲') }, ['جدة']).sponsorship_transfer_count).toBe('2');
  });

  it('rejects negative, fractional, scientific and out-of-range counts', () => {
    for (const sponsorship_transfer_count of ['-1', '1.5', '1e2', '1000', 'نعم']) {
      expect(() => prepareInternalCourierFields({ sponsorship_transfer_count }, ['جدة'])).toThrow();
    }
    expect(prepareInternalCourierFields({ sponsorship_transfer_count: '999' }, ['جدة']).sponsorship_transfer_count).toBe('999');
  });

  it('checks actual Gregorian dates within the allowed years', () => {
    expect(validIdentityExpiry('2030-12-31')).toBe(true);
    expect(validIdentityExpiry('2028-02-29')).toBe(true);
    for (const date of ['2026-02-30', '2025-02-29', '1899-12-31', '2201-01-01', '1447-01-01', '2030-13-01']) {
      expect(validIdentityExpiry(date)).toBe(false);
    }
  });
});
