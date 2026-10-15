export type ServiceOption = { title: string; description?: string };
export type ServiceSection = { title?: string; options: ServiceOption[] };
export type ServiceGroup = { title: string; description: string; icon: string; sections: ServiceSection[] };

export const serviceGroups: ServiceGroup[] = [
  { title: 'التراخيص', description: 'تراخيص نقل البضائع والركاب والمركبات', icon: 'solar:clipboard-text-linear', sections: [
    { title: 'النقل الخفيف', options: ['ترخيص النقل الخفيف للبضائع على الطرق البرية', 'ترخيص الدراجات الآلية لنقل البضائع'].map(title => ({ title })) },
    { title: 'النقل الثقيل', options: ['ترخيص النقل الثقيل للبضائع للأغراض التجارية للمنشأة', 'ترخيص النقل الثقيل للبضائع للأغراض التجارية للمنشأة - للغير'].map(title => ({ title })) },
    { title: 'نقل الركاب', options: ['ترخيص النقل الخاص للركاب بالحافلات', 'ترخيص النقل التعليمي', 'ترخيص نقل متخصص'].map(title => ({ title })) },
    { title: 'تراخيص أخرى', options: ['ترخيص أجرة عامة (تاكسي)', 'ترخيص سحب ونقل المركبات'].map(title => ({ title })) },
  ] },
  { title: 'عقود', description: 'عقود مع شركات الطرود والمطاعم والماركت', icon: 'solar:document-text-linear', sections: [
    { title: 'عقود مع شركات طرود', options: ['أمازون (سيدان-فان)', 'نون', 'آي مايل iMile', 'زاجل', 'ناقل', 'سمسا', 'DHL', 'أخرى - طرود'].map(title => ({ title })) },
    { title: 'عقود مع شركات المطاعم', options: ['هنقرستيشن', 'كيتا', 'نينجا', 'تويو', 'مرسول', 'جاهز', 'داشينز', 'أخرى - مطاعم'].map(title => ({ title })) },
    { title: 'عقود مع شركات ماركت (بقالات)', options: ['أمازون ماركت', 'نون ماركت', 'هنقرستيشن K Mart', 'كيتا Keemart', 'نينجا ماركت', 'جاهز ماركت', 'مرسول ماركت', 'أخرى - ماركت'].map(title => ({ title })) },
  ] },
  { title: 'مناديب', description: 'توفير مناديب بكفالة أو عقد أجير', icon: 'solar:users-group-rounded-linear', sections: [{ options: [
    { title: 'مناديب نقل كفالة' }, { title: 'مناديب عقد أجير' },
  ] }] },
  { title: 'مركبات', description: 'سيارات ودراجات للنقل الخفيف', icon: 'solar:delivery-linear', sections: [
    { title: 'نقل خفيف', options: ['سيارات إيجار شهري', 'إيجار ينتهي بالتمليك', 'دبابات إيجار شهري', 'دبابات كهربائية إيجار شهري'].map(title => ({ title })) },
  ] },
  { title: 'مستودعات', description: 'تأجير، استئجار وإدارة المستودعات', icon: 'solar:buildings-linear', sections: [{ options: [
    { title: 'تأجير مستودعات' }, { title: 'استئجار مستودعات' }, { title: 'إدارة مستودعات' },
  ] }] },
  { title: 'عقود تشغيلية', description: 'عقود تأسيس وتشغيل وتطوير المشاريع اللوجستية', icon: 'solar:settings-linear', sections: [{ options: [
    { title: 'إدارة وتشغيل مشروع لوجستي' },
    { title: 'عقد استشارات وتطوير' },
    { title: 'عقد إنشاء وتأسيس مشروع لوجستي' },
    { title: 'باقة كوادر' },
    { title: 'عقد جلب أعمال وتشغيل مستودعات' },
    { title: 'عقد إشراف وتطوير أعمال' },
  ] }] },
  { title: 'الاستثمار', description: 'فرص استثمارية في القطاع اللوجستي', icon: 'solar:diamond-linear', sections: [{ options: [
    { title: 'عقد الهرم الماسي', description: 'استثمار المبالغ المالية في القطاع اللوجستي' },
    { title: 'عقد اتحاد الطبقة الأولى', description: 'التشغيل الثلاثي في توفير المستودعات والمنتجات وتشغيلها ونقلها' },
  ] }] },
  { title: 'استشارات', description: 'استشارات لوجستية متخصصة', icon: 'solar:lightbulb-linear', sections: [{ options: [
    { title: 'بدء شركة لوجستية' }, { title: 'بدء مشروع لوجستي' }, { title: 'تشغيل مشروع لوجستي' }, { title: 'إجابات وحلول للمشكلات' }, { title: 'أخرى' },
  ] }] },
];

export type CourierRequirements = { count: string; city: string; sponsorshipSpecs: string; ajeerSpecs: string };
export type InquiryContext = { company?: string; city?: string; dateLabel?: string; courier?: CourierRequirements };

export function inquiryDetails(selections: string[], { company, city, dateLabel, courier }: InquiryContext = {}) {
  const prefix = [
    company?.trim() && `اسم الشركة: ${company.trim()}`,
    city?.trim() && `المدينة: ${city.trim()}`,
    dateLabel && `تاريخ الطلب: ${dateLabel}`,
  ].filter(Boolean);
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
  return [...prefix, ...categories].join('\n\n');
}
