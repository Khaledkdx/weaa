export const serviceGroups = [
  {
    title: 'عقود تشغيلية',
    options: [
      { title: 'إدارة وتشغيل مشروع لوجستي' },
      { title: 'عقد استشارات وتطوير' },
      { title: 'عقد إنشاء وتأسيس مشروع لوجستي' },
      { title: 'باقة كوادر' },
      { title: 'عقد جلب أعمال وتشغيل مستودعات' },
      { title: 'عقد إشراف وتطوير أعمال' },
    ],
  },
  {
    title: 'الاستثمار',
    options: [
      { title: 'عقد الهرم الماسي', description: 'استثمار المبالغ المالية في القطاع اللوجستي' },
      { title: 'عقد اتحاد الطبقة الأولى', description: 'التشغيل الثلاثي في توفير المستودعات والمنتجات وتشغيلها ونقلها' },
    ],
  },
] as const;

export function inquiryDetails(company: string, city: string, selections: string[]) {
  const categories = serviceGroups.map(group => {
    const chosen = group.options.filter(option => selections.includes(option.title));
    return chosen.length ? `${group.title}:\n${chosen.map(option => `- ${option.title}`).join('\n')}` : '';
  }).filter(Boolean);
  return [`اسم الشركة: ${company.trim() || 'لم يُذكر'}`, `المدينة: ${city.trim()}`, ...categories].join('\n\n');
}
