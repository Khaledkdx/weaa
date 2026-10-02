import type { CmsContent, CmsItem, FormDefinition, HomeCard, HomeSection } from './types';

const item = (titleAr: string, description: string, slug: string, serviceCategory = 'light'): CmsItem => ({
  id: `service:${slug}`, titleAr, titleEn: '', description, slug,
  benefits: [], reviews: [], serviceCategory, paymentEnabled: false,
  paymentPriceSar: 0, paymentDescription: '',
});
const field = (key: string, label: string, type: FormDefinition['fields'][number]['type'] = 'text', required = true) => ({key, label, type, required, options: []});
const card = (id: string, title: string, target: string, destinationType = 'page'): HomeCard => ({
  id, title, description: '', imageUrl: '', buttonLabel: 'استكشف', destinationType, target, enabled: true,
});
const section = (id: string, title: string, type: string, cards: HomeCard[] = [], description = ''): HomeSection => ({
  id, title, type, cards, description, imageUrl: '', enabled: true,
});

export const courierForms: FormDefinition[] = [
  { id: 'form:courier-internal', slug: 'courier-internal', title: 'مناديب داخل المملكة', description: 'انضم إلى فريق المناديب داخل المملكة.', audience: 'مناديب داخل المملكة', kind: 'join', enabled: true, submissionType: 'courier-internal', fields: [
    field('name', 'الاسم'), field('phone', 'رقم التواصل', 'phone'), field('nationality', 'الجنسية'), field('identity_number', 'رقم الهوية / الإقامة', 'text', false), field('identity_expires_on', 'انتهاء الهوية', 'date'), field('city', 'المدينة'), field('profession', 'المهنة في الإقامة'), field('license_type', 'نوع الرخصة', 'select'), field('can_relocate', 'قابلية الانتقال', 'select'),
  ]},
  { id: 'form:courier-external', slug: 'courier-external', title: 'مناديب خارج المملكة', description: 'انضم إلى فريق المناديب من خارج المملكة.', audience: 'مناديب خارج المملكة', kind: 'join', enabled: true, submissionType: 'courier-external', fields: [
    field('name', 'الاسم'), field('phone', 'رقم الجوال مع رمز البلد', 'phone'), field('marital_status', 'الحالة الاجتماعية', 'select'), field('education', 'التعليم'), field('has_license', 'هل لديك رخصة؟', 'select'), field('country', 'البلد'), field('age', 'السن بالسنوات', 'number'),
  ]},
];

export const seed: CmsContent = {
  company: { nameAr: 'شركة وعاء للخدمات اللوجستية والإدارية', nameEn: 'WEAA Logistics', taglineAr: 'الطبقة الأولى المتكاملة في عالم اللوجستيات', taglineEn: '', phone: '+966567018977', email: 'info@weaa-sa.com', website: 'https://weaa-sa.com', headquarters: 'جدة، حي المروة، شارع عبدالله اليماني', vat: '314375725200003', cr: '7052452385', vision: '', mission: '' },
  pages: {
    home: { kicker: 'وعاء', title: 'اللوجستيات تبدأ من وعاء', body: 'خدمات لوجستية وإدارية تجمع احتياجات الأفراد والشركات في مكان واحد.' },
    services: { kicker: 'الخدمات', title: 'اختر مسار الخدمة المناسب', body: 'حلول مرنة للأفراد والأعمال.' },
    frameworks: { kicker: 'خدمات وعقود', title: 'حلول تشغيلية بعقود واضحة', body: 'نماذج وخدمات قابلة للتنفيذ والقياس.' },
    initiatives: { kicker: 'المبادرات', title: 'القطاع لا يكبر بالأرقام وحدها', body: 'مبادرات وعاء تضع العامل والعميل والمستثمر داخل منظومة أوضح.' },
    about: { kicker: 'قالوا عنا', title: 'تجارب من عملائنا', body: 'شاهد آراء وتجارب العملاء عبر منصات التواصل الاجتماعي.' },
    'company-market': { kicker: 'عالم التقبيل', title: 'فرص بيع وشراء الشركات', body: 'اكتشف الفرص المتاحة أو تواصل معنا بشأن شركتك.' },
    contact: { kicker: 'تواصل', title: 'لنبدأ المحادثة', body: 'أرسل رسالتك وسيصل طلبك إلى فريق وعاء.' },
    admin: { kicker: 'الإدارة', title: 'لوحة إدارة وعاء', body: 'محتوى الموقع والطلبات في مكان واحد.' },
  },
  generalInfo: [
    item('التخزين', 'إدارة السعة والمخزون ونقاط الجاهزية.', 'warehousing'),
    item('التوصيل للمستهلك', 'تسليم مباشر لآخر ميل.', 'delivery'),
    item('الشحن بين المدن', 'مسارات للشركات بوضوح في التكلفة والزمن.', 'intercity'),
    item('الشحن الدولي', 'توصيل سلاسل التوريد عالميًا.', 'international'),
    item('الخدمات الإدارية والاستشارية', 'بنية إدارية واستشارية للمشروعات.', 'advisory'),
  ],
  serviceModels: [
    item('القبة الحديدية', 'تشغيل وإدارة أصول الغير من خلال حوكمة تضبط الأداء والمسؤولية.', 'iron-dome', 'contracts'),
    item('الهرم الماسي', 'تجهيز المشروع كنموذج قابل للتكرار والتوسع التجاري.', 'diamond-pyramid', 'contracts'),
    item('المثلث الذهبي', 'نموذج تشغيلي متكامل يربط أطراف المنظومة.', 'golden-triangle', 'contracts'),
  ],
  initiatives: [], values: [], formLabels: ['الاسم الكامل', 'رقم الجوال', 'البريد الإلكتروني', 'تفاصيل الطلب'],
  adminRoles: [ { id: 'owner', name: 'مالك', permissions: ['الصفحات', 'الخدمات', 'الريفيوز', 'الرسائل', 'الحجوزات', 'بيانات الشركة'] }, { id: 'editor', name: 'محرر محتوى', permissions: ['الصفحات', 'الخدمات', 'الريفيوز'] }, { id: 'requests', name: 'متابع طلبات', permissions: ['الرسائل', 'الحجوزات'] } ],
  defaultServiceForm: { id: 'form:default-service', slug: 'default-service', title: 'طلب خدمة', description: '', audience: '', kind: 'service', enabled: true, submissionType: 'supabase', fields: [ field('name', 'الاسم الكامل'), field('phone', 'رقم الجوال', 'phone'), field('email', 'البريد الإلكتروني', 'email'), field('details', 'تفاصيل الطلب', 'textarea', false) ] },
  serviceFormOverrides: {},
  joinForms: [
    { id: 'form:join-accountant', slug: 'join-accountant', title: 'إذا كنت محاسبًا', description: 'تقدم للانضمام إلى فريق وعاء.', audience: 'المحاسبون', kind: 'join', enabled: true, submissionType: 'supabase', fields: [field('name', 'الاسم'), field('phone', 'الجوال', 'phone'), field('email', 'البريد الإلكتروني', 'email'), field('experience', 'الخبرة', 'textarea'), field('cv', 'السيرة الذاتية', 'file')]},
    ...courierForms,
  ],
  companyListings: [], socialTestimonials: [],
  homepageSections: [
    section('intro', 'اللوجستيات تبدأ من وعاء', 'hero', [{ ...card('explore', 'استكشف الخدمات', '/services'), buttonLabel: 'استكشف الخدمات' }, { ...card('register', 'سجل الآن', '/join-us'), buttonLabel: 'سجل الآن' }], 'خدمات لوجستية وإدارية تجمع احتياجات الأفراد والشركات في مكان واحد.'),
    section('founder', 'نبذة عن خادم القوم', 'bio'),
    section('individual', 'الخدمات الفردية', 'cards', [card('light', 'الخدمات الفردية', '/services/light'), { ...card('feasibility', 'دراسات الجدوى', ''), destinationType: 'contact', description: 'ناقش مشروعك وخطواته مع فريق وعاء.' }, { ...card('books', 'الكتب المتاحة للتحميل', ''), destinationType: 'download', buttonLabel: 'تحميل الكتاب' }], 'ابدأ باحتياجك، واختر الخدمة المناسبة لك.'),
    section('operations', 'خدمات التشغيل والعقود', 'cards', [{ ...card('vehicles', 'السيارات', ''), destinationType: 'contact' }, card('couriers', 'المناديب', '/join-us'), card('contracts', 'العقود', '/services/contracts'), { ...card('licenses', 'الترخيص', ''), destinationType: 'contact' }], 'خيارات واضحة لتجهيز أعمالك وتشغيلها.'),
    section('transport', 'النقل البري', 'cards', ['النقل الثقيل', 'النقل الخفيف', 'الدينات', 'الحافلات', 'الدراجات', 'السيارات السيدان'].map((title, index) => ({ ...card(`transport-${index}`, title, ''), destinationType: 'contact' })), 'اختر نوع النقل، وأخبرنا بما تحتاجه.'),
    section('market', 'عالم التقبيل', 'market', [{ ...card('sell', 'أريد بيع شركة', ''), destinationType: 'contact' }, { ...card('buy', 'أريد شراء شركة', ''), destinationType: 'contact' }, card('market-all', 'استكشف الفرص', '/company-market')], 'فرص بيع وشراء الشركات، وخطوتك التالية نحو الاستثمار.'),
    section('join', 'انضم إلينا', 'cards', [{ ...card('inside', 'مناديب داخل المملكة', 'form:courier-internal'), destinationType: 'form' }, { ...card('outside', 'مناديب خارج المملكة', 'form:courier-external'), destinationType: 'form' }, card('jobs', 'طالب وظيفة', '/join-us')], 'اختر المسار الأقرب إليك وسجل بياناتك.'),
    section('contact', 'لنبقَ على تواصل', 'contact'),
  ],
  accountantFormMigrated: true, courierFormsMigrated: true,
};
