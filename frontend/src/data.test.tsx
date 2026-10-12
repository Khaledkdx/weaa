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
  it('adds car labels to a saved internal form without overwriting edits or touching external', () => {
    const internal = { ...seed.joinForms[1], fields: seed.joinForms[1].fields.filter(field => !['owns_car', 'car_model', 'car_year'].includes(field.key)).map(field => field.key === 'name' ? { ...field, label: 'اسم المتقدم' } : field) };
    const external = structuredClone(seed.joinForms[2]);
    const raw = { ...seed, joinForms: [internal, external], courierCarFieldsMigrated: false };
    const result = normalizeCms(raw);
    expect(result.joinForms[0].fields.find(field => field.key === 'name')?.label).toBe('اسم المتقدم');
    expect(result.joinForms[0].fields.slice(-3).map(field => field.key)).toEqual(['owns_car', 'car_model', 'car_year']);
    expect(result.joinForms[1]).toEqual(external);
    expect(normalizeCms(result).joinForms[0].fields).toEqual(result.joinForms[0].fields);
    expect(internal.fields).toHaveLength(seed.joinForms[1].fields.length - 3);
  });
  it('does not restore a deleted courier form while migrating car fields', () => {
    const result = normalizeCms({ ...seed, joinForms: [], courierCarFieldsMigrated: false });
    expect(result.joinForms).toEqual([]);
  });
  it('adds the sponsorship label to saved internal forms once and preserves custom labels', () => {
    const internal = { ...seed.joinForms[1], fields: seed.joinForms[1].fields.filter(field => field.key !== 'sponsorship_transfer_count').map(field => field.key === 'city' ? { ...field, label: 'أماكن العمل' } : field) };
    const external = structuredClone(seed.joinForms[2]);
    const result = normalizeCms({ ...seed, joinForms: [internal, external], courierInternalDetailsMigrated: false });
    expect(result.joinForms[0].fields.find(field => field.key === 'sponsorship_transfer_count')?.required).toBe(false);
    expect(result.joinForms[0].fields.find(field => field.key === 'city')?.label).toBe('أماكن العمل');
    expect(result.joinForms[1]).toEqual(external);
    expect(normalizeCms(result).joinForms[0].fields).toEqual(result.joinForms[0].fields);
    expect(internal.fields.some(field => field.key === 'sponsorship_transfer_count')).toBe(false);
  });
  it('renames only legacy city and relocation labels', () => {
    const internal = { ...seed.joinForms[1], fields: seed.joinForms[1].fields.map(field => field.key === 'city' ? { ...field, label: 'المدينة' } : field.key === 'can_relocate' ? { ...field, label: 'قابلية الانتقال' } : field) };
    const result = normalizeCms({ ...seed, joinForms: [internal], courierInternalDetailsMigrated: false });
    expect(result.joinForms[0].fields.find(field => field.key === 'city')?.label).toBe('المدن');
    expect(result.joinForms[0].fields.find(field => field.key === 'can_relocate')?.label).toBe('قابلية الانتقال لمدينة أخرى');
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
