import { describe, expect, it } from 'vitest';
import { inquiryDetails, serviceGroups } from './serviceInquiry';

describe('service inquiry', () => {
  it('contains the requested service categories and nested choices', () => {
    expect(serviceGroups.map(group => group.title)).toEqual(['التراخيص', 'عقود', 'مناديب', 'مركبات', 'مستودعات', 'عقود تشغيلية', 'الاستثمار', 'استشارات']);
    expect(serviceGroups[0].sections.map(section => section.title)).toEqual(['النقل الخفيف', 'النقل الثقيل', 'نقل الركاب', 'تراخيص أخرى']);
    expect(serviceGroups[0].sections.map(section => section.options.length)).toEqual([2, 2, 3, 2]);
    expect(serviceGroups[0].sections[1].options.map(option => option.title)).toEqual([
      'ترخيص النقل الثقيل للبضائع للأغراض التجارية للمنشأة',
      'ترخيص النقل الثقيل للبضائع للأغراض التجارية للمنشأة - للغير',
    ]);
    expect(serviceGroups[3].sections.map(section => section.title)).toEqual(['نقل خفيف']);
    expect(serviceGroups[3].sections[0].options.map(option => option.title)).toEqual([
      'سيارات إيجار شهري', 'إيجار ينتهي بالتمليك', 'دبابات إيجار شهري', 'دبابات كهربائية إيجار شهري',
    ]);
    expect(serviceGroups[1].sections).toHaveLength(3);
    expect(serviceGroups[5].sections[0].options.map(option => option.title)).toEqual([
      'إدارة وتشغيل مشروع لوجستي', 'عقد استشارات وتطوير', 'عقد إنشاء وتأسيس مشروع لوجستي',
      'باقة كوادر', 'عقد جلب أعمال وتشغيل مستودعات', 'عقد إشراف وتطوير أعمال',
    ]);
    expect(serviceGroups[6].sections[0].options.map(option => option.title)).toEqual(['عقد الهرم الماسي', 'عقد اتحاد الطبقة الأولى']);
    expect(serviceGroups[6].sections[0].options[0].description).toContain('القطاع اللوجستي');
  });

  it('formats nested selections and courier requirements for the existing request API', () => {
    expect(inquiryDetails(['أمازون (سيدان-فان)', 'مناديب نقل كفالة'], {
      company: 'شركة مثال', city: 'الرياض', dateLabel: '15/10/2026, 14:00',
      courier: { count: '5', city: 'جدة', sponsorshipSpecs: 'خبرة سنتين', ajeerSpecs: '' },
    })).toContain('اسم الشركة: شركة مثال\n\nالمدينة: الرياض\n\nتاريخ الطلب: 15/10/2026, 14:00\n\nعقود:\nعقود مع شركات طرود\n- أمازون (سيدان-فان)\n\nمناديب:\n- مناديب نقل كفالة\n\nعدد المناديب المطلوب: 5\nمدينة العمل: جدة\nمواصفات مناديب نقل كفالة: خبرة سنتين');
  });

  it('includes selected licenses under their sections in the request details', () => {
    expect(inquiryDetails(['ترخيص الدراجات الآلية لنقل البضائع', 'ترخيص النقل التعليمي'])).toBe(
      'التراخيص:\nالنقل الخفيف\n- ترخيص الدراجات الآلية لنقل البضائع\nنقل الركاب\n- ترخيص النقل التعليمي',
    );
  });
});
