import type { CmsContent } from './types';

export function contentMediaError(cms: CmsContent): string | null {
  const urls = [
    ...Object.entries(cms.pages).filter(([key]) => key !== 'admin').map(([, page]) => page.imageUrl),
    ...[...cms.generalInfo, ...cms.serviceModels, ...cms.initiatives].flatMap(item => [item.imageUrl, item.detailImageUrl]),
    ...cms.companyListings.filter(item => item.enabled).flatMap(item => [item.imageUrl, item.detailImageUrl]),
    ...cms.socialTestimonials.filter(item => item.enabled).map(item => item.imageUrl),
    ...cms.joinForms.filter(form => form.enabled).map(form => form.imageUrl),
    ...cms.homepageSections.filter(section => section.enabled).flatMap(section => [section.imageUrl, ...section.cards.filter(card => card.enabled).map(card => card.imageUrl)]),
  ].filter((url): url is string => Boolean(url?.trim())).map(url => url.trim());
  if (urls.some(url => !url.startsWith('https://') && (!url.startsWith('/') || url.startsWith('//')))) {
    return 'رابط الصورة يجب أن يبدأ بـ https:// أو بمسار محلي /.';
  }
  if (new Set(urls).size !== urls.length) {
    return 'رابط الصورة مستخدم في أكثر من موضع. اختر صورة مختلفة لكل موضع.';
  }
  return null;
}
