import { describe, expect, it } from 'vitest';
import { normalizeCms } from './data';
import { saudiMobile, normalizeDigits } from './forms';
import { seed } from './seed';

describe('CMS compatibility', () => {
  it('preserves current content and homepage order', () => {
    const result = normalizeCms({ ...seed, homepageSections: [seed.homepageSections[1], seed.homepageSections[0]], company: { ...seed.company, nameAr: 'عنوان معدل' } });
    expect(result.company.nameAr).toBe('عنوان معدل');
    expect(result.homepageSections.map(section => section.id)).toEqual(['founder', 'intro']);
  });
  it('does not restore removed join forms after migration', () => {
    const result = normalizeCms({ ...seed, joinForms: [], accountantFormMigrated: true, courierFormsMigrated: true });
    expect(result.joinForms).toEqual([]);
  });
  it('does not restore deleted pages after saving', () => {
    const result = normalizeCms({ ...seed, pages: { home: seed.pages.home } });
    expect(Object.keys(result.pages)).toEqual(['home']);
  });
  it('adds courier forms once to old content', () => {
    const result = normalizeCms({ joinForms: [], accountantFormMigrated: true });
    expect(result.joinForms.map(form => form.slug)).toEqual(['courier-internal', 'courier-external']);
  });
});

describe('courier phone input', () => {
  it('normalizes Arabic and Persian digits', () => {
    expect(normalizeDigits('٥٠۱۲')).toBe('5012');
  });
  it('accepts Saudi local and international prefixes', () => {
    expect(saudiMobile('٠٥٦٧٠١٨٩٧٧')).toBe('567018977');
    expect(saudiMobile('+966 567018977')).toBe('567018977');
  });
});
