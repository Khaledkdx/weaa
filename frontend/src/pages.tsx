import React from 'react';
import { Icon } from '@iconify/react';
import { Link, Route, Routes, useParams } from 'react-router-dom';
import { useCms, supabase } from './data';
import { Action, PageHeading, SectionHeading, Shell } from './shell';
import { ContactForm, CourierForm, DynamicForm, ServiceForm } from './forms';
import { Admin } from './admin';
import type { CmsContent, CmsItem, HomeCard, HomeSection } from './types';

function safeExternal(url: string) { try { const parsed = new URL(url); return ['https:', 'http:'].includes(parsed.protocol) ? parsed.toString() : null; } catch { return null; } }
function youtubeEmbed(url?: string) {
  if (!url) return null;
  try {
    const parsed = new URL(url); const host = parsed.hostname.replace(/^www\./, '');
    const id = host === 'youtu.be' ? parsed.pathname.split('/')[1] : ['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host) ? (parsed.searchParams.get('v') || parsed.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]) : null;
    return id && /^[A-Za-z0-9_-]{6,}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch { return null; }
}
function cardTarget(card: HomeCard, cms: CmsContent) {
  if (card.destinationType === 'service') return cms.serviceModels.find(item => item.id === card.target)?.slug ? `/services/${cms.serviceModels.find(item => item.id === card.target)!.slug}` : null;
  if (card.destinationType === 'form') return cms.joinForms.find(form => form.id === card.target)?.slug ? `/join-us/${cms.joinForms.find(form => form.id === card.target)!.slug}` : null;
  if (card.destinationType === 'external' || card.destinationType === 'download') return safeExternal(card.target);
  if (card.destinationType === 'contact') return `/contact?subject=${encodeURIComponent(card.title)}`;
  return card.target.startsWith('/') && !card.target.startsWith('//') ? card.target : null;
}
function ContentCard({ title, description, to, index, media, actionLabel }: { title: string; description?: string; to: string; index?: number; media?: string; actionLabel?: string }) {
  return <Link to={to} className={`content-card${media ? ' has-media' : ''}`} data-reveal>
    <div className="content-card-top"><span className="card-index">{String((index || 0) + 1).padStart(2, '0')}</span><Icon icon="solar:arrow-up-left-linear" /></div>
    {media && <img src={media} alt="" loading="lazy" />}
    <div><h3>{title}</h3>{description && <p>{description}</p>}{actionLabel && <span className="card-action">{actionLabel}</span>}</div>
  </Link>;
}
function HomeCardView({ card, cms, index, media }: { card: HomeCard; cms: CmsContent; index: number; media?: string }) {
  const target = cardTarget(card, cms); if (!card.enabled || !target) return null;
  if (/^https?:\/\//.test(target)) return <a href={target} className={`content-card${media ? ' has-media' : ''}`} target="_blank" rel="noopener noreferrer" data-reveal><div className="content-card-top"><span className="card-index">{String(index + 1).padStart(2, '0')}</span><Icon icon="solar:arrow-up-left-linear" /></div>{media && <img src={media} alt="" loading="lazy" />}<div><h3>{card.title}</h3><p>{card.description}</p><span className="card-action">{card.buttonLabel || 'استكشف'}</span></div></a>;
  return <ContentCard title={card.title} description={card.description} to={target} index={index} media={media} actionLabel={card.buttonLabel} />;
}

const editorialImages = {
  freight: `${import.meta.env.BASE_URL}images/freight.webp`,
  delivery: `${import.meta.env.BASE_URL}images/delivery.webp`,
  yard: `${import.meta.env.BASE_URL}images/yard.webp`,
  market: `${import.meta.env.BASE_URL}images/market.webp`,
  sedan: `${import.meta.env.BASE_URL}images/sedan.webp`,
  bus: `${import.meta.env.BASE_URL}images/bus.webp`,
  motorcycle: `${import.meta.env.BASE_URL}images/motorcycle.webp`,
  contract: `${import.meta.env.BASE_URL}images/contract.webp`,
  parcel: `${import.meta.env.BASE_URL}images/parcel.webp`,
  feasibility: `${import.meta.env.BASE_URL}images/feasibility.webp`,
  courierFleet: `${import.meta.env.BASE_URL}images/courier-fleet.webp`,
  licensing: `${import.meta.env.BASE_URL}images/licensing.webp`,
  heavyTruck: `${import.meta.env.BASE_URL}images/heavy-truck.webp`,
  lightTruck: `${import.meta.env.BASE_URL}images/light-truck.webp`,
  boxTruck: `${import.meta.env.BASE_URL}images/box-truck.webp`,
  executiveSedan: `${import.meta.env.BASE_URL}images/executive-sedan.webp`,
  companySale: `${import.meta.env.BASE_URL}images/company-sale.webp`,
  companyBuy: `${import.meta.env.BASE_URL}images/company-buy.webp`,
  opportunities: `${import.meta.env.BASE_URL}images/opportunities.webp`,
  localCourier: `${import.meta.env.BASE_URL}images/local-courier.webp`,
  internationalCourier: `${import.meta.env.BASE_URL}images/international-courier.webp`,
  careers: `${import.meta.env.BASE_URL}images/careers.webp`,
  parcels: `${import.meta.env.BASE_URL}images/parcels.webp`,
  network: `${import.meta.env.BASE_URL}images/network.webp`,
};

const cardImageById: Record<string, string> = {
  light: editorialImages.parcel,
  feasibility: editorialImages.feasibility,
  vehicles: editorialImages.sedan,
  couriers: editorialImages.courierFleet,
  contracts: editorialImages.contract,
  licenses: editorialImages.licensing,
  'transport-0': editorialImages.heavyTruck,
  'transport-1': editorialImages.lightTruck,
  'transport-2': editorialImages.boxTruck,
  'transport-3': editorialImages.bus,
  'transport-4': editorialImages.motorcycle,
  'transport-5': editorialImages.executiveSedan,
  sell: editorialImages.companySale,
  buy: editorialImages.companyBuy,
  'market-all': editorialImages.opportunities,
  inside: editorialImages.localCourier,
  outside: editorialImages.internationalCourier,
  jobs: editorialImages.careers,
};
const spareCardImages = [...Object.values(cardImageById), editorialImages.parcels, editorialImages.network];

function preferredHomeImage(section: HomeSection, card: HomeCard) {
  const ownImage = safeExternal(card.imageUrl);
  if (ownImage) return ownImage;
  const title = card.title;
  if (section.type === 'market') {
    if (/بيع/.test(title)) return editorialImages.companySale;
    if (/شراء/.test(title)) return editorialImages.companyBuy;
    return editorialImages.opportunities;
  }
  if (section.id === 'join' || /انضم إلينا/.test(section.title)) {
    if (/داخل/.test(title)) return editorialImages.localCourier;
    if (/خارج/.test(title)) return editorialImages.internationalCourier;
    return editorialImages.careers;
  }
  if (section.id === 'transport' || /النقل البري/.test(section.title)) {
    if (/ثقيل/.test(title)) return editorialImages.heavyTruck;
    if (/خفيف/.test(title)) return editorialImages.lightTruck;
    if (/دينات/.test(title)) return editorialImages.boxTruck;
    if (/حافلات/.test(title)) return editorialImages.bus;
    if (/دراجات/.test(title)) return editorialImages.motorcycle;
    if (/سيدان|سيارات/.test(title)) return editorialImages.executiveSedan;
  }
  if (/جدوى/.test(title)) return editorialImages.feasibility;
  if (/فردية/.test(title)) return editorialImages.parcel;
  if (/مناديب/.test(title)) return editorialImages.courierFleet;
  if (/عقود/.test(title)) return editorialImages.contract;
  if (/ترخيص/.test(title)) return editorialImages.licensing;
  if (/سيارات/.test(title)) return editorialImages.sedan;
  return cardImageById[card.id];
}

function imageKey(src: string) {
  try { const url = new URL(src, 'https://weaa.local'); return `${url.pathname}${url.search}`; }
  catch { return src; }
}

const categories = [
  { title: 'خدمات خفيفة', to: '/services/light', image: editorialImages.delivery },
  { title: 'خدمات وعقود', to: '/services/contracts', image: editorialImages.yard },
  { title: 'النقل البري', to: '/services/contracts', image: editorialImages.freight },
  { title: 'عالم التقبيل', to: '/company-market', image: editorialImages.market },
];

function CategoryRail({ images }: { images: string[] }) {
  return <section className="category-band" aria-label="استكشف أقسام وعاء"><div className="site-container"><div className="category-band-heading"><span>ابدأ من هنا</span><h2>كل ما تحتاجه، في مكان واحد.</h2></div><div className="category-rail">{categories.map((category, index) => <Link key={category.title} to={category.to} className="category-link"><img src={images[index]} alt="" loading="lazy" /><span>{category.title}<Icon icon="solar:arrow-left-linear" /></span></Link>)}</div></div></section>;
}

function Home() {
  const { cms } = useCms();
  const sections = cms.homepageSections.filter(section => section.enabled);
  const hero = sections.find(section => section.type === 'hero');
  const heroImage = safeExternal(hero?.imageUrl || '') || `${import.meta.env.BASE_URL}images/weaa-logistics-hero.webp`;
  const usedImages = new Set<string>([imageKey(heroImage)]);
  const reserveImage = (preferred?: string) => {
    const image = [preferred, ...spareCardImages].find(candidate => candidate && !usedImages.has(imageKey(candidate)));
    if (image) usedImages.add(imageKey(image));
    return image;
  };
  const categoryImages = categories.map(category => reserveImage(category.image)!);
  const cardMedia = new Map<string, string>();
  const listingMedia = new Map<string, string>();
  const bioMedia = new Map<string, string>();
  for (const section of sections) {
    if (section.id === hero?.id) continue;
    if (section.type === 'bio' && section.description.trim()) {
      const image = safeExternal(section.imageUrl);
      if (image && !usedImages.has(imageKey(image))) {
        usedImages.add(imageKey(image));
        bioMedia.set(section.id, image);
      }
    }
    for (const card of section.cards) {
      if (!card.enabled || !cardTarget(card, cms)) continue;
      const image = reserveImage(preferredHomeImage(section, card));
      if (image) cardMedia.set(`${section.id}:${card.id}`, image);
    }
    if (section.type === 'market') {
      for (const listing of cms.companyListings.filter(item => item.enabled).slice(0, 2)) {
        const image = reserveImage(editorialImages.network);
        if (image) listingMedia.set(listing.slug, image);
      }
    }
  }
  const heroActions = hero?.cards.filter(card => card.enabled && cardTarget(card, cms)) || [];
  return <Shell>
    <section className="hero" style={{ backgroundImage: `linear-gradient(270deg,rgba(10,10,9,.87) 5%,rgba(10,10,9,.55) 54%,rgba(10,10,9,.08)),url(${heroImage})` }}>
      <div className="hero-inner"><span className="hero-rule hero-animate">وعاء للخدمات اللوجستية والإدارية</span><h1 className="hero-animate">{hero?.title || cms.pages.home?.title || 'اللوجستيات تبدأ من وعاء'}</h1><p className="hero-animate">{hero?.description || cms.pages.home?.body || 'خدمات لوجستية وإدارية تناسب احتياجاتك.'}</p><div className="hero-actions hero-animate">{heroActions.length ? heroActions.map((card, index) => <Action key={card.id} to={cardTarget(card, cms)!} secondary={index !== 0} icon={index === 0 ? 'solar:arrow-left-linear' : undefined}>{card.buttonLabel || card.title}</Action>) : <><Action to="/services" icon="solar:arrow-left-linear">استكشف الخدمات</Action><Action to="/join-us" secondary>سجل الآن</Action></>}</div></div>
      <div className="hero-bottom"><span>من جدة، نحو أعمال أكثر تنظيمًا</span><span>مرر لاكتشاف المزيد <Icon icon="solar:arrow-down-linear" /></span></div>
    </section>
    <CategoryRail images={categoryImages} />
    {sections.filter(section => section.id !== hero?.id).map((section, sectionIndex) => <HomeSectionView key={section.id} section={section} cms={cms} index={sectionIndex} cardMedia={cardMedia} listingMedia={listingMedia} bioMedia={bioMedia} />)}
  </Shell>;
}
function HomeSectionView({ section, cms, index, cardMedia, listingMedia, bioMedia }: { section: HomeSection; cms: CmsContent; index: number; cardMedia: Map<string, string>; listingMedia: Map<string, string>; bioMedia: Map<string, string> }) {
  if (section.type === 'bio' && !section.description.trim()) return null;
  if (section.type === 'contact') return <section className="contact-band" data-reveal><div className="site-container"><span className="eyebrow">ابدأ من هنا</span><h2>{section.title}</h2><p>{section.description || 'فريق وعاء جاهز لسماع احتياجك.'}</p><Action to="/contact" icon="solar:arrow-left-linear">تواصل معنا</Action></div></section>;
  const cards = section.cards.filter(card => card.enabled && cardTarget(card, cms));
  const isMarket = section.type === 'market';
  return <section className={`home-band home-band-${index % 2} home-band-${section.type}`}><div className="site-container">
    <SectionHeading eyebrow={String(index + 1).padStart(2, '0')} title={section.title} body={section.description} to={isMarket ? '/company-market' : undefined} />
    {section.type === 'bio' ? <div className="bio-layout" data-reveal><p>{section.description}</p>{bioMedia.has(section.id) && <img src={bioMedia.get(section.id)} alt="" loading="lazy" />}</div> : <div className="card-grid">{cards.map((card, i) => <HomeCardView key={card.id} card={card} cms={cms} index={i} media={cardMedia.get(`${section.id}:${card.id}`)} />)}{isMarket && cms.companyListings.filter(item => item.enabled).slice(0, 2).map((listing, i) => <ContentCard key={listing.slug} title={listing.name} description={`${listing.sector} · ${listing.city}`} to={`/company-market/${listing.slug}`} index={cards.length + i} media={listingMedia.get(listing.slug)} />)}</div>}
  </div></section>;
}

function ServicesHub() {
  const { cms } = useCms(); const page = cms.pages.services || { kicker: 'الخدمات', title: 'خدمات وعاء', body: '' };
  return <Shell><div className="site-container page-body"><PageHeading {...{ eyebrow: page.kicker, title: page.title, body: page.body }} /><div className="two-grid"><ContentCard title="خدمات خفيفة" description="خدمات مرنة للأعمال والأفراد." to="/services/light" index={0} /><ContentCard title="خدمات وعقود" description="حلول تشغيلية بعقود واضحة." to="/services/contracts" index={1} /></div></div></Shell>;
}
function ServiceListing({ category }: { category?: string }) {
  const { cms } = useCms(); const items = [...cms.generalInfo, ...cms.serviceModels].filter(item => !category || item.serviceCategory === category);
  const title = category === 'light' ? 'خدمات خفيفة' : category === 'contracts' ? 'خدمات وعقود' : 'جميع الخدمات';
  return <Shell><div className="site-container page-body"><PageHeading eyebrow="خدمات وعاء" title={title} body="اختر الخدمة المناسبة وتعرّف على تفاصيلها." /><div className="card-grid">{items.map((item, index) => <ContentCard key={item.id || item.titleAr} title={item.titleAr} description={item.description} to={item.slug ? `/services/${item.slug}` : `/contact?subject=${encodeURIComponent(item.titleAr)}`} index={index} />)}</div></div></Shell>;
}
function ServiceDetail() {
  const { slug } = useParams(); const { cms } = useCms(); const service = cms.serviceModels.find(item => item.slug === slug) || cms.generalInfo.find(item => item.slug === slug);
  if (!service) return <NotFound />;
  const embed = youtubeEmbed(service.videoUrl);
  return <Shell><div className="site-container page-body"><div className="detail-heading"><Link className="back-link" to="/services"><Icon icon="solar:arrow-right-linear" /> الخدمات</Link><PageHeading eyebrow="تفاصيل الخدمة" title={service.titleAr} body={service.description} /></div>
    {service.benefits.length > 0 && <section className="content-section"><SectionHeading title="ما الذي ستحصل عليه؟" /><div className="benefits-grid">{service.benefits.map((benefit, index) => <div key={index} data-reveal><Icon icon="solar:check-circle-linear" /><span>{benefit}</span></div>)}</div></section>}
    {embed && <section className="content-section"><SectionHeading title="فيديو الخدمة" /><div className="video-wrap"><iframe title={`فيديو ${service.titleAr}`} src={embed} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div></section>}
    {service.videoUrl && !embed && safeExternal(service.videoUrl) && <section className="content-section"><Action to={service.videoUrl} secondary icon="solar:arrow-up-left-linear">مشاهدة فيديو الخدمة</Action></section>}
    <section className="content-section form-section"><SectionHeading eyebrow="طلب خدمة" title={`اطلب ${service.titleAr}`} body="أكمل بياناتك وسيتواصل معك فريق وعاء." /><ServiceForm service={service} form={cms.serviceFormOverrides[service.slug || ''] || cms.defaultServiceForm} /></section>
    {service.paymentEnabled && service.paymentPriceSar > 0 && <PaymentPanel service={service} />}
    {service.reviews.length > 0 && <section className="content-section"><SectionHeading title="آراء العملاء" /><div className="card-grid">{service.reviews.map((review, i) => <blockquote className="quote-card" key={i}><div className="stars" aria-label={`التقييم ${review.rating} من 5`}>{'★'.repeat(Math.max(0, Math.min(5, review.rating)))}</div><p>{review.body}</p><footer>{review.customer} · {review.dateLabel}</footer></blockquote>)}</div></section>}
  </div></Shell>;
}
function PaymentPanel({ service }: { service: CmsItem }) {
  const [busy, setBusy] = React.useState(false); const [error, setError] = React.useState('');
  const start = async () => {
    if (!supabase || !service.slug) { setError('الدفع غير متاح حاليًا.'); return; }
    setBusy(true); setError('');
    try {
      const { data, error: cause } = await supabase.functions.invoke('create-service-checkout', { body: { serviceSlug: service.slug, successUrl: new URL('/payment-success', location.origin).toString(), cancelUrl: location.href } });
      if (cause) throw cause;
      const parsed = new URL(data?.url);
      if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('رابط الدفع غير صالح.');
      location.assign(parsed.toString());
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر فتح الدفع.'); setBusy(false); }
  };
  return <section className="payment-band"><div><span className="eyebrow">الدفع الإلكتروني</span><h2>{service.paymentDescription || service.titleAr}</h2><p>{service.paymentPriceSar.toLocaleString('ar-SA')} ر.س</p></div><button type="button" className="action action-primary" disabled={busy} onClick={() => void start()}>{busy ? 'جاري فتح الدفع...' : 'ادفع الآن'}</button>{error && <p role="alert" className="error">{error}</p>}</section>;
}

function Initiatives() { const { cms } = useCms(); const page = cms.pages.initiatives || { kicker: 'المبادرات', title: 'مبادرات وعاء', body: '' }; return <Shell><div className="site-container page-body"><PageHeading eyebrow={page.kicker} title={page.title} body={page.body} /><div className="card-grid">{cms.initiatives.map((item, i) => <ContentCard key={item.id || i} title={item.titleAr} description={item.description} to={`/contact?subject=${encodeURIComponent(item.titleAr)}`} index={i} />)}</div></div></Shell>; }
function Testimonials() { const { cms } = useCms(); const page = cms.pages.about || { kicker: 'قالوا عنا', title: 'قالوا عنا', body: '' }; const items = cms.socialTestimonials.filter(item => item.enabled); return <Shell><div className="site-container page-body"><PageHeading eyebrow={page.kicker} title={page.title} body={page.body} />{items.length ? <div className="card-grid">{items.map((item, i) => <a className="content-card" href={safeExternal(item.videoUrl) || '#'} target="_blank" rel="noopener noreferrer" key={item.id} data-reveal><div className="content-card-top"><span className="card-index">{String(i + 1).padStart(2, '0')}</span><Icon icon="solar:play-circle-linear" /></div><h3>{item.title}</h3><p>{item.customer} · {item.platform}</p><span className="card-action">شاهد الفيديو</span></a>)}</div> : <div className="empty-state">تجارب العملاء ستظهر هنا عند إضافتها.</div>}</div></Shell>; }
function Market() { const { cms } = useCms(); const page = cms.pages['company-market']; const items = cms.companyListings.filter(item => item.enabled); return <Shell><div className="site-container page-body"><PageHeading eyebrow={page.kicker} title={page.title} body={page.body} /><div className="market-actions"><Action to="/contact?subject=أريد%20بيع%20شركة">أريد بيع شركة</Action><Action secondary to="/contact?subject=أريد%20شراء%20شركة">أريد شراء شركة</Action></div>{items.length ? <div className="card-grid">{items.map((item, i) => <ContentCard key={item.slug} title={item.name} description={`${item.sector} · ${item.city} · ${item.status}`} to={`/company-market/${item.slug}`} index={i} />)}</div> : <div className="empty-state">لا توجد شركات منشورة الآن.</div>}</div></Shell>; }
function MarketDetail() { const { slug } = useParams(); const { cms } = useCms(); const listing = cms.companyListings.find(item => item.slug === slug && item.enabled); if (!listing) return <NotFound />; return <Shell><div className="site-container page-body"><Link className="back-link" to="/company-market"><Icon icon="solar:arrow-right-linear" /> عالم التقبيل</Link><PageHeading eyebrow={listing.sector} title={listing.name} body={listing.summary} /><div className="detail-list"><div><strong>المدينة</strong><span>{listing.city}</span></div><div><strong>الحالة</strong><span>{listing.status}</span></div>{Object.entries(listing.metadata).map(([key, value]) => <div key={key}><strong>{key}</strong><span>{value}</span></div>)}</div><Action to={safeExternal(listing.contactUrl) || `/contact?subject=${encodeURIComponent(listing.name)}`}>تواصل حول الفرصة</Action></div></Shell>; }
function Contact() { const { cms } = useCms(); const page = cms.pages.contact || { kicker: 'تواصل', title: 'تواصل مع وعاء', body: '' }; const body = /جاهزة لاحقًا|ربط.*لاحقًا|Supabase/i.test(page.body) ? 'اكتب تفاصيل طلبك، وسيتواصل معك فريق وعاء.' : page.body; return <Shell><div className="site-container page-body"><PageHeading eyebrow={page.kicker} title={page.title} body={body} /><div className="contact-layout"><ContactForm /><aside className="contact-details"><h2>بيانات التواصل</h2><a href={`tel:${cms.company.phone}`}>{cms.company.phone}</a><a href={`mailto:${cms.company.email}`}>{cms.company.email}</a><p>{cms.company.headquarters}</p></aside></div></div></Shell>; }
function Join() { const { cms } = useCms(); return <Shell><div className="site-container page-body"><PageHeading eyebrow="انضم إلينا" title="مسارك يبدأ من هنا" body="اختر الفئة المناسبة، ثم انتقل إلى نموذج التسجيل الخاص بها." /><div className="card-grid join-grid">{cms.joinForms.filter(form => form.enabled).map((form, i) => <ContentCard key={form.id || form.slug} title={form.title} description={form.audience} to={`/join-us/${form.slug}`} index={i} />)}</div></div></Shell>; }
function JoinDetail() { const { slug } = useParams(); const { cms } = useCms(); const form = cms.joinForms.find(item => item.slug === slug && item.enabled); if (!form) return <NotFound />; return <Shell><div className="site-container page-body narrow-page"><Link className="back-link" to="/join-us"><Icon icon="solar:arrow-right-linear" /> العودة إلى الفئات</Link><PageHeading eyebrow="انضم إلينا" title={form.title} body={form.description} />{form.submissionType.startsWith('courier-') ? <CourierForm form={form} /> : <DynamicForm form={form} />}</div></Shell>; }
function PaymentSuccess() { return <Shell><div className="site-container page-body narrow-page"><PageHeading eyebrow="الدفع" title="اكتملت العودة من صفحة الدفع" body="راجع بريدك للحصول على حالة عملية الدفع، أو تواصل مع فريق وعاء عند الحاجة." /><Action to="/services">العودة للخدمات</Action></div></Shell>; }
function NotFound() { return <Shell><div className="site-container page-body narrow-page"><PageHeading eyebrow="الصفحة غير متاحة" title="لم نجد هذا الرابط" body="قد يكون المحتوى قد تغير أو أُزيل." /><Action to="/">العودة للرئيسية</Action></div></Shell>; }

export function App() { return <Routes>
  <Route path="/" element={<Home />} /><Route path="/services" element={<ServicesHub />} /><Route path="/services/light" element={<ServiceListing category="light" />} /><Route path="/services/contracts" element={<ServiceListing category="contracts" />} /><Route path="/services/:slug" element={<ServiceDetail />} /><Route path="/frameworks" element={<ServiceListing />} />
  <Route path="/initiatives" element={<Initiatives />} /><Route path="/about" element={<Testimonials />} /><Route path="/company-market" element={<Market />} /><Route path="/company-market/:slug" element={<MarketDetail />} /><Route path="/contact" element={<Contact />} /><Route path="/join-us" element={<Join />} /><Route path="/join-us/:slug" element={<JoinDetail />} /><Route path="/payment-success" element={<PaymentSuccess />} /><Route path="/admin" element={<Admin />} /><Route path="*" element={<NotFound />} />
</Routes>; }
