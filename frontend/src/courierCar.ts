export function prepareInternalCarSubmission(values: Record<string, string>, files: Record<string, File[]>, year = new Date().getFullYear()) {
  const nextValues = { ...values };
  const nextFiles = { ...files };
  const ownsCar = nextValues.owns_car || '';
  if (!['', '0', '1'].includes(ownsCar)) throw new Error('اختر إجابة صحيحة لسؤال ملكية السيارة.');
  if (ownsCar !== '1') {
    delete nextValues.car_model;
    delete nextValues.car_year;
    delete nextFiles.registration_files;
    if (ownsCar === '') delete nextValues.owns_car;
    return { values: nextValues, files: nextFiles };
  }
  const model = nextValues.car_model?.trim() || '';
  if (model.length < 2 || model.length > 160 || /[<>\x00-\x1f\x7f]/.test(model)) {
    throw new Error('أدخل نوع وموديل السيارة من 2 إلى 160 حرفًا دون رموز HTML.');
  }
  const carYear = nextValues.car_year || '';
  if (!/^\d{4}$/.test(carYear) || Number(carYear) < 1900 || Number(carYear) > year + 1) {
    throw new Error(`أدخل سنة صنع صحيحة بين 1900 و${year + 1}.`);
  }
  nextValues.car_model = model;
  return { values: nextValues, files: nextFiles };
}
