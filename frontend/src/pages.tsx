import React from 'react';
import { Icon } from '@iconify/react';
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useCms, supabase } from './data';
import { Action, SectionHeading, Shell } from './shell';
import { ContactForm, CourierForm, DynamicForm, ServiceForm } from './forms';
import { ServiceInquiry } from './serviceInquiryForm';
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
function ContentCard({ title, description, to, index, media, actionLabel, illustrative = false, fallbackMedia }: { title: string; description?: string; to: string; index?: number; media?: string; actionLabel?: string; illustrative?: boolean; fallbackMedia?: string }) {
  const [fallbackUsed, setFallbackUsed] = React.useState(false);
  return <Link to={to} className={`content-card${media ? ' has-media' : ''}`} data-reveal>
    <div className="content-card-top"><span className="card-index">{String((index || 0) + 1).padStart(2, '0')}</span><Icon icon="solar:arrow-up-left-linear" /></div>
    {media && <div className="interior-card-media"><img src={media} alt="" loading="lazy" onError={event => { if (fallbackMedia && event.currentTarget.src !== new URL(fallbackMedia, location.href).href) { event.currentTarget.src = fallbackMedia; setFallbackUsed(true); } else event.currentTarget.hidden = true; }} />{(illustrative || fallbackUsed) && <span>صورة توضيحية</span>}</div>}
    <div><h3>{title}</h3>{description && <p>{description}</p>}{actionLabel && <span className="card-action">{actionLabel}</span>}</div>
  </Link>;
}
const interiorImage = (name: string) => `${import.meta.env.BASE_URL}images/interior-${name}.webp`;
const serviceImages: Record<string, string> = {
  warehousing: 'warehousing', delivery: 'delivery', intercity: 'intercity', international: 'international',
  advisory: 'advisory', 'iron-dome': 'iron-dome', 'diamond-pyramid': 'diamond-pyramid', 'golden-triangle': 'golden-triangle',
};
function imageFor(value: string | undefined, fallback?: string) {
  if (value && ((safeExternal(value)?.startsWith('https://')) || (value.startsWith('/') && !value.startsWith('//')))) return value;
  return fallback ? interiorImage(fallback) : undefined;
}
function InteriorIntro({ eyebrow, title, body, image, fallbackImage, illustrative = false, children }: { eyebrow: string; title: string; body?: string; image?: string; fallbackImage?: string; illustrative?: boolean; children?: React.ReactNode }) {
  const [fallbackUsed, setFallbackUsed] = React.useState(false);
  const path = location.pathname.replace(/\/$/, '');
  const backup = fallbackImage || (path.includes('/company-market/') ? interiorImage('market-detail') : ({ '/company-market': interiorImage('market-index'), '/contact': interiorImage('contact'), '/initiatives': interiorImage('initiatives'), '/about': interiorImage('testimonials') } as Record<string, string>)[path.slice(path.lastIndexOf('/'))]);
  return <header className={`interior-intro${image ? ' with-image' : ''}`} data-reveal>{image && <img className="interior-intro-image" src={image} alt="" onError={event => { if (backup && event.currentTarget.src !== new URL(backup, location.href).href) { event.currentTarget.src = backup; setFallbackUsed(true); } else event.currentTarget.hidden = true; }} />}<div className="interior-intro-copy"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{body && <p>{body}</p>}{children}</div>{(illustrative || fallbackUsed) && image && <span className="interior-image-label">صورة توضيحية</span>}</header>;
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
  return <Shell><main className="site-container page-body interior-page"><InteriorIntro eyebrow={page.kicker} title={page.title} body={page.body}><Action to="/request-services" icon="solar:arrow-left-linear">اطلب خدمة الآن</Action></InteriorIntro><div className="interior-category-grid"><ContentCard title="خدمات خفيفة" description="خدمات مرنة للأعمال والأفراد." to="/services/light" index={0} media={interiorImage('hub-light')} actionLabel="استكشف الخدمات" /><ContentCard title="خدمات وعقود" description="حلول تشغيلية بعقود واضحة." to="/services/contracts" index={1} media={interiorImage('hub-contracts')} actionLabel="استكشف العقود" /></div></main></Shell>;
}
function RequestServices() { return <Shell><main className="site-container page-body narrow-page interior-page interior-form-page"><Link className="back-link" to="/services"><Icon icon="solar:arrow-right-linear" /> العودة إلى الخدمات</Link><InteriorIntro eyebrow="طلب خدمة" title="نموذج الخدمات اللوجستية" body="حدد الخدمات التي تحتاجها، وسنتواصل معك لمناقشة طلبك." /><ServiceInquiry /></main></Shell>; }
function ServiceListing({ category }: { category?: string }) {
  const { cms } = useCms(); const items = [...cms.generalInfo, ...cms.serviceModels].filter(item => !category || item.serviceCategory === category);
  const title = category === 'light' ? 'خدمات خفيفة' : category === 'contracts' ? 'خدمات وعقود' : 'جميع الخدمات';
  return <Shell><main className="site-container page-body interior-page"><Link className="back-link" to="/services"><Icon icon="solar:arrow-right-linear" /> جميع الخدمات</Link><InteriorIntro eyebrow="خدمات وعاء" title={title} body="اختر ما يناسب أعمالك، ثم اطلع على التفاصيل وقدّم طلبك مباشرة." /><div className="interior-service-grid">{items.map((item, index) => { const fallback = serviceImages[item.slug || ''] ? `list-${serviceImages[item.slug || '']}` : undefined; return <ContentCard key={item.id || item.titleAr} title={item.titleAr} description={item.description} to={item.slug ? `/services/${item.slug}` : `/contact?subject=${encodeURIComponent(item.titleAr)}`} index={index} media={imageFor(item.imageUrl, fallback)} fallbackMedia={fallback ? interiorImage(fallback) : undefined} actionLabel="تفاصيل الخدمة" />; })}</div></main></Shell>;
}
function ServiceDetail() {
  const { slug } = useParams(); const { cms } = useCms(); const service = cms.serviceModels.find(item => item.slug === slug) || cms.generalInfo.find(item => item.slug === slug);
  if (!service) return <NotFound />;
  const embed = youtubeEmbed(service.videoUrl);
  const fallback = serviceImages[service.slug || ''] ? `detail-${serviceImages[service.slug || '']}` : undefined;
  return <Shell><main className="site-container page-body interior-page"><Link className="back-link" to="/services"><Icon icon="solar:arrow-right-linear" /> الخدمات</Link><div className="service-detail-intro"><div><span className="eyebrow">تفاصيل الخدمة</span><h1>{service.titleAr}</h1><p>{service.description}</p><a className="action action-primary" href="#service-request">اطلب الخدمة <Icon icon="solar:arrow-left-linear" /></a></div>{imageFor(service.detailImageUrl, fallback) && <img src={imageFor(service.detailImageUrl, fallback)} alt="" onError={event => { if (fallback) event.currentTarget.src = interiorImage(fallback); else event.currentTarget.hidden = true; }} />}</div>
    {service.benefits.length > 0 && <section className="content-section"><SectionHeading title="ما الذي ستحصل عليه؟" /><div className="benefits-grid">{service.benefits.map((benefit, index) => <div key={index} data-reveal><Icon icon="solar:check-circle-linear" /><span>{benefit}</span></div>)}</div></section>}
    {embed && <section className="content-section"><SectionHeading title="فيديو الخدمة" /><div className="video-wrap"><iframe title={`فيديو ${service.titleAr}`} src={embed} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div></section>}
    {service.videoUrl && !embed && safeExternal(service.videoUrl) && <section className="content-section"><Action to={service.videoUrl} secondary icon="solar:arrow-up-left-linear">مشاهدة فيديو الخدمة</Action></section>}
    <section id="service-request" className="content-section form-section"><SectionHeading eyebrow="طلب خدمة" title={`اطلب ${service.titleAr}`} body="أكمل بياناتك وسيتواصل معك فريق وعاء." /><ServiceForm service={service} form={cms.serviceFormOverrides[service.slug || ''] || cms.defaultServiceForm} /></section>
    {service.paymentEnabled && service.paymentPriceSar > 0 && <PaymentPanel service={service} />}
    {service.reviews.length > 0 && <section className="content-section"><SectionHeading title="آراء العملاء" /><div className="card-grid">{service.reviews.map((review, i) => <blockquote className="quote-card" key={i}><div className="stars" aria-label={`التقييم ${review.rating} من 5`}>{'★'.repeat(Math.max(0, Math.min(5, review.rating)))}</div><p>{review.body}</p><footer>{review.customer} · {review.dateLabel}</footer></blockquote>)}</div></section>}
  </main></Shell>;
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

function Initiatives() { const { cms } = useCms(); const page = cms.pages.initiatives || { kicker: 'المبادرات', title: 'مبادرات وعاء', body: '' }; return <Shell><main className="site-container page-body interior-page"><InteriorIntro eyebrow={page.kicker} title={page.title} body={page.body} image={imageFor(page.imageUrl, 'initiatives')} />{cms.initiatives.length ? <div className="interior-service-grid">{cms.initiatives.map((item, i) => <ContentCard key={item.id || i} title={item.titleAr} description={item.description} to={`/contact?subject=${encodeURIComponent(item.titleAr)}`} index={i} media={imageFor(item.imageUrl)} actionLabel="تواصل بشأن المبادرة" />)}</div> : <div className="interior-empty"><h2>المبادرات قيد الإعداد</h2><p>ستظهر المبادرات المنشورة هنا عند إضافتها من لوحة الإدارة.</p><Action to="/contact">تواصل معنا</Action></div>}</main></Shell>; }
function Testimonials() { const { cms } = useCms(); const page = cms.pages.about || { kicker: 'قالوا عنا', title: 'قالوا عنا', body: '' }; const items = cms.socialTestimonials.filter(item => item.enabled && safeExternal(item.videoUrl)); return <Shell><main className="site-container page-body interior-page"><InteriorIntro eyebrow={page.kicker} title={page.title} body={page.body} image={imageFor(page.imageUrl, 'testimonials')} />{items.length ? <div className="interior-service-grid">{items.map((item, i) => <a className={`content-card${imageFor(item.imageUrl) ? ' has-media' : ''}`} href={safeExternal(item.videoUrl)!} target="_blank" rel="noopener noreferrer" key={item.id} data-reveal><div className="content-card-top"><span className="card-index">{String(i + 1).padStart(2, '0')}</span><Icon icon="solar:play-circle-linear" /></div>{imageFor(item.imageUrl) && <div className="interior-card-media"><img src={imageFor(item.imageUrl)} alt="" loading="lazy" /></div>}<div><h3>{item.title}</h3><p>{item.customer} · {item.platform}</p><span className="card-action">شاهد الفيديو</span></div></a>)}</div> : <div className="interior-empty"><h2>لا توجد فيديوهات منشورة بعد</h2><p>عند إضافة تجارب موثقة ستظهر هنا.</p></div>}</main></Shell>; }
function Market() {
  const { cms } = useCms();
  const page = cms.pages['company-market'] || { kicker: 'عالم التقبيل', title: 'عالم التقبيل', body: '' };
  const items = cms.companyListings.filter(item => item.enabled);
  return <Shell><main className="site-container page-body interior-page">
    <InteriorIntro eyebrow={page.kicker} title={page.title} body={page.body} image={imageFor(page.imageUrl, 'market-index')} illustrative>
      <div className="market-actions"><Action to="/contact?subject=أريد%20بيع%20شركة">أريد بيع شركة</Action><Action secondary to="/contact?subject=أريد%20شراء%20شركة">أريد شراء شركة</Action></div>
    </InteriorIntro>
    <div className="interior-section-head"><span className="eyebrow">الفرص المنشورة</span><h2>استكشف الشركات</h2></div>
    {items.length ? <div className="interior-service-grid">{items.map((item, i) => {
      const fallback = i < 5 ? (i === 0 ? 'spare-company' : `market-list-${i + 1}`) : undefined;
      return <ContentCard key={item.slug} title={item.name} description={`${item.sector} · ${item.city} · ${item.status}`} to={`/company-market/${item.slug}`} index={i} media={imageFor(item.imageUrl, fallback)} fallbackMedia={fallback ? interiorImage(fallback) : undefined} illustrative={!item.imageUrl && Boolean(fallback)} actionLabel="عرض التفاصيل" />;
    })}</div> : <div className="interior-empty"><h2>لا توجد شركات منشورة الآن</h2><p>يمكنك إرسال طلب بيع أو شراء، وسيتواصل معك الفريق.</p></div>}
  </main></Shell>;
}
function MarketDetail() { const { slug } = useParams(); const { cms } = useCms(); const listing = cms.companyListings.find(item => item.slug === slug && item.enabled); if (!listing) return <NotFound />; return <Shell><main className="site-container page-body interior-page"><Link className="back-link" to="/company-market"><Icon icon="solar:arrow-right-linear" /> عالم التقبيل</Link><InteriorIntro eyebrow={listing.sector} title={listing.name} body={listing.summary} image={imageFor(listing.detailImageUrl, 'market-detail')} illustrative={!listing.detailImageUrl} /><div className="market-detail-layout"><div className="detail-list"><div><strong>المدينة</strong><span>{listing.city}</span></div><div><strong>الحالة</strong><span>{listing.status}</span></div>{Object.entries(listing.metadata).map(([key, value]) => <div key={key}><strong>{key}</strong><span>{value}</span></div>)}</div><aside><span className="eyebrow">مهتم بهذه الفرصة؟</span><h2>لنبدأ المحادثة</h2><p>أرسل استفسارك مباشرة إلى فريق وعاء للحصول على التفاصيل المتاحة.</p><Action to={safeExternal(listing.contactUrl) || `/contact?subject=${encodeURIComponent(listing.name)}`}>تواصل حول الفرصة</Action></aside></div></main></Shell>; }
function Contact() { const { cms } = useCms(); const page = cms.pages.contact || { kicker: 'تواصل', title: 'تواصل مع وعاء', body: '' }; const body = /جاهزة لاحقًا|ربط.*لاحقًا|Supabase/i.test(page.body) ? 'اكتب تفاصيل طلبك، وسيتواصل معك فريق وعاء.' : page.body; return <Shell><main className="site-container page-body interior-page"><InteriorIntro eyebrow={page.kicker} title={page.title} body={body} image={imageFor(page.imageUrl, 'contact')} /><div className="contact-layout"><ContactForm /><aside className="contact-details"><h2>بيانات التواصل</h2><a href={`tel:${cms.company.phone}`}>{cms.company.phone}</a><a href={`mailto:${cms.company.email}`}>{cms.company.email}</a><p>{cms.company.headquarters}</p></aside></div></main></Shell>; }
function Join() { const { cms } = useCms(); const forms = cms.joinForms.filter(form => form.enabled); return <Shell><main className="site-container page-body interior-page"><InteriorIntro eyebrow="انضم إلينا" title="مسارك يبدأ من هنا" body="اختر الفئة المناسبة، ثم انتقل إلى صفحة التسجيل الخاصة بها." /><div className="interior-join-grid">{forms.map((form, i) => { const fallback = form.slug === 'courier-internal' ? 'join-local' : form.slug === 'courier-external' ? 'join-global' : form.slug === 'join-accountant' ? 'join-career' : undefined; return <ContentCard key={form.id || form.slug} title={form.title} description={form.audience} to={`/join-us/${form.slug}`} index={i} media={imageFor(form.imageUrl, fallback)} fallbackMedia={fallback ? interiorImage(fallback) : undefined} actionLabel="اضغط هنا" />; })}</div></main></Shell>; }
function JoinDetail() { const { slug } = useParams(); const { cms } = useCms(); const form = cms.joinForms.find(item => item.slug === slug && item.enabled); if (!form) return <NotFound />; return <Shell><main className="site-container page-body narrow-page interior-page interior-form-page"><Link className="back-link" to="/join-us"><Icon icon="solar:arrow-right-linear" /> العودة إلى الفئات</Link><InteriorIntro eyebrow="انضم إلينا" title={form.title} body={form.description} />{form.submissionType.startsWith('courier-') ? <CourierForm form={form} /> : <DynamicForm form={form} />}</main></Shell>; }
function PaymentSuccess() { return <Shell><main className="site-container page-body narrow-page interior-page interior-status"><Icon icon="solar:check-circle-linear" /><InteriorIntro eyebrow="الدفع" title="عدت من صفحة الدفع" body="تحقق من بريدك لمعرفة حالة العملية، أو تواصل مع فريق وعاء إذا احتجت مساعدة." /><Action to="/services">العودة للخدمات</Action></main></Shell>; }
function NotFound() { return <Shell><main className="site-container page-body narrow-page interior-page interior-status"><Icon icon="solar:map-point-wave-linear" /><InteriorIntro eyebrow="الصفحة غير متاحة" title="لم نجد هذا الرابط" body="قد يكون المحتوى قد تغير أو أُزيل. يمكنك العودة للرئيسية ومتابعة التصفح." /><Action to="/">العودة للرئيسية</Action></main></Shell>; }

export function App() { return <Routes>
  <Route path="/" element={<Home />} /><Route path="/services" element={<ServicesHub />} /><Route path="/services/light" element={<ServiceListing category="light" />} /><Route path="/services/contracts" element={<ServiceListing category="contracts" />} /><Route path="/services/:slug" element={<ServiceDetail />} /><Route path="/frameworks" element={<Navigate to="/services" replace />} />
  <Route path="/initiatives" element={<Initiatives />} /><Route path="/about" element={<Testimonials />} /><Route path="/company-market" element={<Market />} /><Route path="/company-market/:slug" element={<MarketDetail />} /><Route path="/contact" element={<Contact />} /><Route path="/request-services" element={<RequestServices />} /><Route path="/join-us" element={<Join />} /><Route path="/join-us/:slug" element={<JoinDetail />} /><Route path="/payment-success" element={<PaymentSuccess />} /><Route path="/admin" element={<Admin />} /><Route path="*" element={<NotFound />} />
</Routes>; }
