import { describe, expect, it } from 'vitest';
import { courierOfferDetails, internalCourierOffers, internalCourierConditions } from './courierOffers';

describe('internal courier offers', () => {
  it('stores one or both offers using the supplied figures without recalculating totals', () => {
    const jeddah = courierOfferDetails(['jeddah']);
    expect(jeddah['العروض المختارة']).not.toContain('الرياض');
    expect(jeddah['تفاصيل العروض المختارة']).toContain('إجمالي الدخل: 4,500 ريال.');
    expect(jeddah['تفاصيل العروض المختارة']).toContain('حوافز: 3,700 ريال.');
    const both = courierOfferDetails(['jeddah', 'riyadh']);
    for (const offer of internalCourierOffers) {
      expect(both['العروض المختارة']).toContain(offer.title);
      expect(both['تفاصيل العروض المختارة']).toContain(offer.details);
    }
    expect(both['شروط التقديم على العرضين']).toBe(internalCourierConditions);
  });
  it('rejects missing or unknown offers', () => {
    expect(() => courierOfferDetails([])).toThrow();
    expect(() => courierOfferDetails(['unknown'])).toThrow();
  });
});
