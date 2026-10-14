export type ServiceOption = { title: string; description?: string };
export type ServiceSection = { title?: string; options: ServiceOption[] };
export type ServiceGroup = { title: string; description: string; icon: string; sections: ServiceSection[] };

export const serviceGroups: ServiceGroup[] = [
  { title: 'ترخيص لوجستك', description: 'تراخيص النقل والهيئات الرسمية', icon: 'solar:clipboard-text-linear', sections: [{ options: [
    { title: 'ترخيص هيئة النقل النهائي' }, { title: 'ترخيص نقل خفيف' }, { title: 'ترخيص نقل ثقيل' }, { title: 'ترخيص موجه تقني' },
  ] }] },
  { title: 'عقود', description: 'عقود مع شركات الطرود والمطاعم والماركت', icon: 'solar:document-text-linear', sections: [
    { title: 'عقود مع شركات طرود', options: ['أمازون (سيدان-فان)', 'نون', 'آي مايل iMile', 'زاجل', 'ناقل', 'سمسا', 'DHL', 'أخرى - طرود'].map(title => ({ title })) },
    { title: 'عقود مع شركات المطاعم', options: ['هنقرستيشن', 'كيتا', 'نينجا', 'تويو', 'مرسول', 'جاهز', 'داشينز', 'أخرى - مطاعم'].map(title => ({ title })) },
    { title: 'عقود مع شركات ماركت (بقالات)', options: ['أمازون ماركت', 'نون ماركت', 'هنقرستيشن K Mart', 'كيتا Keemart', 'نينجا ماركت', 'جاهز ماركت', 'مرسول ماركت', 'أخرى - ماركت'].map(title => ({ title })) },
  ] },
  { title: 'مناديب', description: 'توفير مناديب بكفالة أو عقد أجير', icon: 'solar:users-group-rounded-linear', sections: [{ options: [
    { title: 'مناديب نقل كفالة' }, { title: 'مناديب عقد أجير' },
  ] }] },
  { title: 'مركبات', description: 'نقل خفيف وثقيل، فان وباص', icon: 'solar:delivery-linear', sections: [
    { title: 'نقل خفيف', options: ['سيارات إيجار شهري', 'إيجار ينتهي بالتمليك', 'دبابات إيجار شهري', 'دبابات كهربائية إيجار شهري'].map(title => ({ title })) },
    { title: 'نقل ثقيل', options: ['دينات تبريد / جاف', 'تريلات'].map(title => ({ title })) },
    { title: 'أخرى', options: ['فان', 'باص'].map(title => ({ title })) },
  ] },
  { title: 'مستودعات', description: 'تأجير، استئجار وإدارة المستودعات', icon: 'solar:buildings-linear', sections: [{ options: [
    { title: 'تأجير مستودعات' }, { title: 'استئجار مستودعات' }, { title: 'إدارة مستودعات' },
  ] }] },
  { title: 'إدارة وتشغيل', description: 'إدارة المشاريع اللوجستية الكاملة', icon: 'solar:settings-linear', sections: [{ options: [
    { title: 'إدارة وتشغيل المشروع اللوجستي' },
  ] }] },
  { title: 'الاستثمار', description: 'فرص استثمارية في القطاع اللوجستي', icon: 'solar:diamond-linear', sections: [{ options: [
    { title: 'استثمار الهرم الماسي', description: 'استثمار المبالغ المالية في القطاع اللوجستي' },
  ] }] },
  { title: 'استشارات', description: 'استشارات لوجستية متخصصة', icon: 'solar:lightbulb-linear', sections: [{ options: [
    { title: 'بدء شركة لوجستية' }, { title: 'بدء مشروع لوجستي' }, { title: 'تشغيل مشروع لوجستي' }, { title: 'إجابات وحلول للمشكلات' }, { title: 'أخرى' },
  ] }] },
];

export type CourierRequirements = { count: string; city: string; sponsorshipSpecs: string; ajeerSpecs: string };

export function inquiryDetails(selections: string[], courier?: CourierRequirements) {
  const categories = serviceGroups.map(group => {
    const sections = group.sections.map(section => {
      const chosen = section.options.filter(option => selections.includes(option.title));
      if (!chosen.length) return '';
      return [section.title, ...chosen.map(option => `- ${option.title}`)].filter(Boolean).join('\n');
    }).filter(Boolean);
    return sections.length ? `${group.title}:\n${sections.join('\n')}` : '';
  }).filter(Boolean);
  if (courier && serviceGroups[2].sections[0].options.some(option => selections.includes(option.title))) {
    const extras = [
      courier.count.trim() && `عدد المناديب المطلوب: ${courier.count.trim()}`,
      courier.city.trim() && `مدينة العمل: ${courier.city.trim()}`,
      courier.sponsorshipSpecs.trim() && `مواصفات مناديب نقل كفالة: ${courier.sponsorshipSpecs.trim()}`,
      courier.ajeerSpecs.trim() && `مواصفات مناديب عقد أجير: ${courier.ajeerSpecs.trim()}`,
    ].filter(Boolean);
    if (extras.length) categories.push(extras.join('\n'));
  }
  return categories.join('\n\n');
}
