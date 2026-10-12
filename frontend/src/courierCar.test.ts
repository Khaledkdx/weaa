import { describe, expect, it } from 'vitest';
import { prepareInternalCarSubmission } from './courierCar';

describe('internal courier car submission', () => {
  const registration = new File(['pdf'], 'registration.pdf', { type: 'application/pdf' });
  const identity = new File(['pdf'], 'identity.pdf', { type: 'application/pdf' });
  const files = { registration_files: [registration], identity_files: [identity] };

  it('keeps complete car details and registration for yes', () => {
    const result = prepareInternalCarSubmission({ name: 'أحمد', owns_car: '1', car_model: ' تويوتا كورولا ', car_year: '2020' }, files, 2026);
    expect(result.values).toMatchObject({ owns_car: '1', car_model: 'تويوتا كورولا', car_year: '2020' });
    expect(result.files.registration_files).toEqual([registration]);
  });

  it('sends no car details or registration for no', () => {
    const result = prepareInternalCarSubmission({ owns_car: '0', car_model: 'سيارة', car_year: '2020' }, files);
    expect(result.values).toEqual({ owns_car: '0' });
    expect(result.files).toEqual({ identity_files: [identity] });
  });

  it('omits every new field when unanswered', () => {
    const result = prepareInternalCarSubmission({ owns_car: '', car_model: 'سيارة', car_year: '2020' }, files);
    expect(result.values).toEqual({});
    expect(result.files).toEqual({ identity_files: [identity] });
  });

  it('requires a clean model and a valid four-digit year for yes', () => {
    const valid = { owns_car: '1', car_model: 'تويوتا كورولا', car_year: '2027' };
    expect(() => prepareInternalCarSubmission(valid, {}, 2026)).not.toThrow();
    for (const car_year of ['1899', '2028', '2020.5', '2020-01-01', '']) {
      expect(() => prepareInternalCarSubmission({ ...valid, car_year }, {}, 2026)).toThrow();
    }
    for (const car_model of ['أ', '<b>سيارة</b>', 'سيارة\nجديدة']) {
      expect(() => prepareInternalCarSubmission({ ...valid, car_model }, {}, 2026)).toThrow();
    }
  });
});
