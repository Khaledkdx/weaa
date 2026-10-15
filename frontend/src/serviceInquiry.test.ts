import { describe, expect, it } from 'vitest';
import { inquiryDetails, serviceGroups } from './serviceInquiry';

describe('service inquiry', () => {
  it('contains the requested service categories and nested choices', () => {
    expect(serviceGroups.map(group => group.title)).toEqual(['ترخيص لوجستك', 'عقود', 'مناديب', 'مركبات', 'مستودعات', 'عقود تشغيلية', 'الاستثمار', 'استشارات']);
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
});
