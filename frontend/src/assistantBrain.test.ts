import { describe, expect, it } from 'vitest';
import { buildSiteIndex, localAnswer, normalizeArabic, queryTokens } from './assistantBrain';
import { roadTransportPath } from './roadTransport';
import { seed } from './seed';
import type { CmsContent } from './types';

const cms = seed as CmsContent;
const index = buildSiteIndex(cms);
const answer = (query: string) => localAnswer(query, index, cms.company);

describe('site index', () => {
  it('lists the public pages, forms and contract services with their paths', () => {
    const paths = index.map(entry => entry.path);
    expect(paths).toEqual(expect.arrayContaining(['/', '/services', '/services/contracts', '/join-us/request-services', roadTransportPath, '/company-market', '/contact', '/join-us/courier-internal', '/join-us/join-accountant', '/services/iron-dome']));
    expect(paths).not.toContain('/services/warehousing');
  });
});

describe('arabic normalisation', () => {
  it('strips diacritics and unifies letter forms', () => {
    expect(normalizeArabic('الخِدْمَاتُ الإدارية؟')).toBe('الخدمات الاداريه');
  });
  it('drops filler words that carry no destination', () => {
    expect(queryTokens('ابي اروح لصفحة المناديب لو سمحت')).toEqual(['المناديب']);
  });
});

describe('local answers', () => {
  it('takes a courier inside the kingdom to the internal courier form', () => {
    expect(answer('ابي اسجل مندوب داخل المملكة').navigateTo).toBe('/join-us/courier-internal');
  });
  it('takes an accountant to the accountant form', () => {
    expect(answer('انا محاسب وابغى اشتغل معكم').navigateTo).toBe('/join-us/join-accountant');
  });
  it('routes transport requests to the road transport form', () => {
    expect(answer('عندي بضاعة ابغى شاحنة تنقلها').navigateTo).toBe(roadTransportPath);
  });
  it('routes selling a company to the market', () => {
    expect(answer('ابي ابيع شركتي').navigateTo).toBe('/company-market');
  });
  it('finds a contract service by its name', () => {
    expect(answer('وش هي القبة الحديدية').navigateTo).toBe('/services/iron-dome');
  });
  it('answers contact questions with the real details', () => {
    const reply = answer('كيف اتواصل معكم؟');
    expect(reply.text).toContain(cms.company.phone);
    expect(reply.text).toContain(cms.company.email);
    expect(reply.navigateTo).toBe('/contact');
  });
  it('greets without navigating and offers the main paths', () => {
    const reply = answer('مرحبا');
    expect(reply.text).toContain('أهلاً وسهلاً');
    expect(reply.navigateTo).toBeUndefined();
    expect(reply.suggestions?.length).toBeGreaterThan(2);
  });
  it('asks instead of guessing when nothing matches', () => {
    const reply = answer('كم سعر الذهب اليوم');
    expect(reply.navigateTo).toBeUndefined();
    expect(reply.text).toContain(cms.company.phone);
  });
});
