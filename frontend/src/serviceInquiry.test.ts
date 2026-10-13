import { describe, expect, it } from 'vitest';
import { inquiryDetails, serviceGroups } from './serviceInquiry';

describe('service inquiry', () => {
  it('contains the requested operational contracts and investment descriptions', () => {
    expect(serviceGroups[0].options).toHaveLength(6);
    expect(serviceGroups[1].options).toHaveLength(2);
    expect(serviceGroups[1].options[0].description).toContain('القطاع اللوجستي');
  });

  it('formats selections for the existing service requests table', () => {
    expect(inquiryDetails('', 'جدة', ['باقة كوادر', 'عقد الهرم الماسي'])).toContain('اسم الشركة: لم يُذكر\n\nالمدينة: جدة\n\nعقود تشغيلية:\n- باقة كوادر\n\nالاستثمار:\n- عقد الهرم الماسي');
  });
});
