import type { FormField } from './types';

export const salePath = '/join-us/company-sale';
export const executiveSalePath = '/join-us/company-sale-executive';
export const attachmentPrefix = 'company_document:';
export const saleSuccess = 'شكرًا لثقتكم بشركة وعاء للخدمات اللوجستية والإدارية. تم استلام طلبكم بنجاح، وسيقوم الفريق المختص بمراجعة بيانات الشركة والتواصل معكم لاستكمال الإجراءات اللازمة.';
const field = (key: string, label: string, type: FormField['type'] = 'text', required = true, options: string[] = []): FormField => ({ key, label, type, required, options });
export const companyContactFields = [
  field('company_name', 'اسم الشركة'), field('phone', 'رقم الهاتف', 'phone'),
  field('name', 'اسم ممثل الشركة'), field('email', 'البريد الإلكتروني الرسمي', 'email'),
];
export const representativeFields = [
  field('representative_role', 'بصفته', 'select', true, ['مالك', 'مدير مفوض', 'وكيل', 'وسيط', 'أخرى']),
  field('headquarters_city', 'مدينة المقر الرئيسي'),
];
export const otherRoleField = field('representative_role_other', 'الصفة الأخرى');
export const operatingGroups = [
  { title: 'الأنشطة والتراخيص', fields: [field('activities', 'ما هي أنشطة الشركة؟', 'textarea'), field('transport_licenses', 'ما هي تراخيص هيئة النقل المتاحة لدى الشركة؟', 'textarea')] },
  { title: 'العقود', fields: [field('current_contracts', 'ما هي الشركات والعقود المتعاقد معهم بالوقت الحالي؟', 'textarea')] },
  { title: 'أسطول الشركة', fields: [field('owned_vehicles', 'ما هو نوع المركبات التي تمتلكها الشركة؟', 'textarea'), field('rented_vehicles', 'هل لدى الشركة مركبات مستأجرة؟', 'textarea')] },
  { title: 'كوادر العمل', fields: [field('employees', 'ماذا تمتلك الشركة من موظفين؟', 'textarea'), field('sponsored_couriers', 'كم عدد مناديب التوصيل على كفالة الشركة؟'), field('ajeer_couriers', 'هل يوجد لدى الشركة مناديب بعقد أجير؟'), field('other_workers', 'عمالة أخرى', 'textarea', false)] },
  { title: 'الأصول والممتلكات', fields: [field('branches', 'كم عدد أفرع الشركة؟'), field('headquarters_location', 'أين يقع المقر الرئيسي للشركة؟'), field('courier_housing', 'هل يتوفر سكن للعمالة (المناديب)؟', 'select', true, ['نعم', 'لا']), field('other_assets', 'هل يوجد أصول أخرى لدى الشركة؟', 'textarea')] },
];
export const companyDocuments = [
  field('commercial_register', 'السجل التجاري', 'file'),
  field('tax_number', 'الرقم الضريبي', 'file'),
  field('national_address', 'العنوان الوطني', 'file'),
  field('articles_of_association', 'عقد التأسيس (للشركات)', 'file', false),
  field('iban_certificate', 'شهادة الآيبان', 'file'),
  field('transport_licenses', 'تراخيص هيئة النقل', 'file'),
  field('municipality_license', 'رخصة البلدية إن وجدت', 'file', false),
  field('employee_statement', 'كشف الموظفين والمناديب (مقيم / أبشر أعمال)', 'file'),
  field('vehicle_registrations', 'استمارات السيارات المملوكة', 'file', false),
  field('vehicle_rental_contract', 'عقد تأجير السيارات إن وجد', 'file', false),
  field('vehicle_operating_cards', 'بطاقات تشغيل المركبات', 'file', false),
  field('operating_contracts', 'عقود التشغيل المتاحة حاليًا مع الشركات', 'file', false),
  field('partnerships', 'مذكرات تفاهم أو شراكات أخرى إن وجدت', 'file', false),
  field('housing_contract', 'عقد إيجار سكن المناديب إن وجد', 'file', false),
  field('headquarters_contract', 'عقد إيجار / ملكية مقر الشركة إن وجد', 'file', false),
  field('financial_statements', 'أحدث القوائم المالية إن وجدت', 'file', false),
  field('operating_receivables', 'أحدث فواتير / كشف مستحقات التشغيل إن وجد', 'file', false),
  field('other_documents', 'مستندات أخرى', 'file', false),
];
export const salePriceFields = [field('last_revenue_sar', 'قيمة آخر إيراد فعلي للشركة (بالريال السعودي)', 'number'), field('expected_price', 'الثمن المتوقع لبيع الشركة')];
