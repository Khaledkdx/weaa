import { describe, expect, it } from 'vitest';
import { normalizeCms } from './data';
import { contentMediaError } from './media';
import { seed } from './seed';

describe('public CMS imagery', () => {
  it('keeps optional image fields when loading existing content', () => {
    const cms = normalizeCms({ ...seed, serviceModels: [{ ...seed.serviceModels[0], imageUrl: '/images/card.webp', detailImageUrl: '/images/detail.webp' }] });
    expect(cms.serviceModels[0].imageUrl).toBe('/images/card.webp');
    expect(cms.serviceModels[0].detailImageUrl).toBe('/images/detail.webp');
  });
  it('rejects the same photo in two published positions', () => {
    const cms = structuredClone(seed);
    cms.serviceModels[0].imageUrl = '/images/same.webp';
    cms.serviceModels[0].detailImageUrl = '/images/same.webp';
    expect(contentMediaError(cms)).toContain('أكثر من موضع');
  });
  it('accepts distinct images and ignores unpublished listing images', () => {
    const cms = structuredClone(seed);
    cms.serviceModels[0].imageUrl = '/images/card.webp';
    cms.serviceModels[0].detailImageUrl = '/images/detail.webp';
    cms.companyListings = [{ slug: 'hidden', name: 'مخفية', sector: '', city: '', status: '', summary: '', contactUrl: '', metadata: {}, enabled: false, imageUrl: '/images/card.webp' }];
    expect(contentMediaError(cms)).toBeNull();
  });
  it('rejects unsafe image URL schemes', () => {
    const cms = structuredClone(seed);
    cms.joinForms[0].imageUrl = 'javascript:alert(1)';
    expect(contentMediaError(cms)).toContain('رابط الصورة');
  });
});
