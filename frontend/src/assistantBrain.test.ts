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
  it('understands obvious speech and typing mistakes without asking to repeat', () => {
    expect(answer('عاوز فورم مناذيب الداهل').navigateTo).toBe('/join-us/courier-internal');
    expect(answer('عايز اسجل مناديب الخارح').navigateTo).toBe('/join-us/courier-external');
    expect(answer('انا محاصب عاوز اشتغل').navigateTo).toBe('/join-us/join-accountant');
  });
  it('uses the previous courier question to understand a short answer', () => {
    const first = answer('عاوز اسجل مندوب');
    expect(first.navigateTo).toBeUndefined();
    expect(first.text).toContain('داخل المملكة ولا خارج المملكة');
    const reply = localAnswer('الداخل', index, cms.company, { history: [{ role: 'user', text: 'عاوز اسجل مندوب' }, { role: 'assistant', text: first.text }] });
    expect(reply.navigateTo).toBe('/join-us/courier-internal');
    expect(localAnswer('الخارج', index, cms.company, { history: [{ role: 'user', text: 'عاوز اسجل مندوب' }] }).navigateTo).toBe('/join-us/courier-external');
  });
  it('uses a clear previous request for open it, without guessing when context is absent', () => {
    expect(localAnswer('افتحه', index, cms.company, { history: [{ role: 'user', text: 'ابي اسجل مندوب داخل المملكة' }] }).navigateTo).toBe('/join-us/courier-internal');
    expect(answer('افتحه').navigateTo).toBeUndefined();
    expect(answer('الداخل').navigateTo).toBeUndefined();
  });
  it('respects a negative request and asks when both regions are mentioned', () => {
    expect(answer('مش عاوز افتح فورم مناديب الداخل').navigateTo).toBeUndefined();
    expect(answer('مناديب داخل ولا خارج المملكة').navigateTo).toBeUndefined();
  });
  it('does not turn a delivery customer into a courier applicant', () => {
    expect(answer('عاوز اطلب توصيل طرود').navigateTo).not.toContain('courier-');
    expect(answer('مرحبا عاوز شاحنة تنقل بضاعة').navigateTo).toBe(roadTransportPath);
  });
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
