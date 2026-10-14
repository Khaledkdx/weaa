import { describe, expect, it } from 'vitest';
import { inquiryDetails, serviceGroups } from './serviceInquiry';

describe('service inquiry', () => {
  it('contains the requested service categories and nested choices', () => {
    expect(serviceGroups.map(group => group.title)).toEqual(['ترخيص لوجستك', 'عقود', 'مناديب', 'مركبات', 'مستودعات', 'إدارة وتشغيل', 'الاستثمار', 'استشارات']);
    expect(serviceGroups[1].sections).toHaveLength(3);
    expect(serviceGroups[6].sections[0].options[0].description).toContain('القطاع اللوجستي');
  });

  it('formats nested selections and courier requirements for the existing request API', () => {
    expect(inquiryDetails(['أمازون (سيدان-فان)', 'مناديب نقل كفالة'], { count: '5', city: 'جدة', sponsorshipSpecs: 'خبرة سنتين', ajeerSpecs: '' }))
      .toContain('عقود:\nعقود مع شركات طرود\n- أمازون (سيدان-فان)\n\nمناديب:\n- مناديب نقل كفالة\n\nعدد المناديب المطلوب: 5\nمدينة العمل: جدة\nمواصفات مناديب نقل كفالة: خبرة سنتين');
  });
});
