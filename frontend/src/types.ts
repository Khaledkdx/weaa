export type PageContent = { kicker: string; title: string; body: string };
export type Company = {
  nameAr: string; nameEn: string; taglineAr: string; taglineEn: string;
  phone: string; email: string; website: string; headquarters: string;
  vat: string; cr: string; vision: string; mission: string;
};
export type Review = { customer: string; body: string; dateLabel: string; rating: number };
export type CmsItem = {
  id: string; titleAr: string; titleEn: string; description: string;
  iconCodePoint?: number; slug?: string; videoUrl?: string;
  benefits: string[]; reviews: Review[]; serviceCategory: string;
  paymentEnabled: boolean; paymentPriceSar: number; paymentDescription: string;
};
export type FormFieldType = 'text' | 'number' | 'phone' | 'email' | 'date' | 'select' | 'multiline' | 'textarea' | 'details' | 'file';
export type FormField = { key: string; label: string; type: FormFieldType; required: boolean; options: string[] };
export type FormDefinition = {
  id: string; slug: string; title: string; description: string; audience: string;
  kind: string; enabled: boolean; fields: FormField[]; submissionType: string;
};
export type HomeCard = { id: string; title: string; description: string; imageUrl: string; buttonLabel: string; destinationType: string; target: string; enabled: boolean };
export type HomeSection = { id: string; title: string; description: string; type: string; imageUrl: string; enabled: boolean; cards: HomeCard[] };
export type CompanyListing = { slug: string; name: string; sector: string; city: string; status: string; summary: string; contactUrl: string; metadata: Record<string, string>; enabled: boolean };
export type SocialTestimonial = { id: string; customer: string; platform: string; title: string; videoUrl: string; enabled: boolean };
export type AdminRole = { id: string; name: string; permissions: string[] };
export type CmsContent = {
  company: Company; pages: Record<string, PageContent>;
  generalInfo: CmsItem[]; serviceModels: CmsItem[]; initiatives: CmsItem[];
  values: string[]; formLabels: string[]; adminRoles: AdminRole[];
  defaultServiceForm: FormDefinition; serviceFormOverrides: Record<string, FormDefinition>;
  joinForms: FormDefinition[]; companyListings: CompanyListing[];
  socialTestimonials: SocialTestimonial[]; homepageSections: HomeSection[];
  accountantFormMigrated?: boolean; courierFormsMigrated?: boolean;
  [key: string]: unknown;
};
export type ServiceRequest = {
  id: string; service_slug: string; service_title: string; name: string;
  phone: string; email: string; details: string; status: string;
  created_at?: string; created_at_label?: string;
};
export type JoinRequest = {
  id: string; form_slug: string; form_title: string; name: string;
  phone: string; email: string; fields: Record<string, string>;
  attachment_path?: string; status: string; created_at?: string;
  created_at_label?: string;
};

export const requestStatuses = ['طلب جديد', 'قيد المتابعة', 'تم التواصل', 'مؤكد', 'مغلق'];
export const messageStatuses = ['جديدة', 'قيد الرد', 'تم الرد', 'مؤرشفة'];
export const permissions = ['الصفحات', 'الخدمات', 'الريفيوز', 'الرسائل', 'الحجوزات', 'بيانات الشركة'];
