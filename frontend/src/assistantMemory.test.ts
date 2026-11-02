import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetProfile, loadProfile, recall, rememberValues } from './assistantMemory';

// Node 25+ hides jsdom's localStorage behind its own unconfigured one; a fresh in-memory store per test.
beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, String(value)); }, removeItem: (key: string) => { store.delete(key); } });
});
afterEach(() => vi.unstubAllGlobals());

describe('what the orb remembers about a visitor', () => {
  it('keeps the values given to a form, by label, and knows the visitor by first name', () => {
    const profile = rememberValues({ 'الاسم الكامل': 'خالد محمد', 'رقم الجوال': '0512345678', 'المدينة': 'الرياض' });
    expect(profile?.name).toBe('خالد');
    expect(loadProfile()?.values['رقم الجوال']).toBe('0512345678');
  });
  it('never keeps identity numbers, documents or dates', () => {
    const profile = rememberValues({ 'رقم الهوية': '1234567890', 'تاريخ انتهاء الهوية': '2030-05-20', 'الاسم': 'خالد' });
    expect(Object.keys(profile!.values)).toEqual(['الاسم']);
  });
  it('offers a saved value to a differently worded field of the same kind, and can forget everything', () => {
    const profile = rememberValues({ 'الاسم الكامل': 'خالد محمد', 'رقم الجوال': '0512345678', 'اسم الشركة': 'النور' });
    expect(recall(profile, 'الاسم')).toBe('خالد محمد');
    expect(recall(profile, 'رقم التواصل')).toBe('0512345678');
    expect(recall(profile, 'اسم الشركة')).toBe('النور');
    expect(recall(profile, 'رقم الهوية')).toBeUndefined();
    forgetProfile();
    expect(loadProfile()).toBeNull();
  });
});
