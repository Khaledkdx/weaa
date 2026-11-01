import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useCms } from './data';
import { useTheme } from './theme';

gsap.registerPlugin(ScrollTrigger);
const navigation = [
  ['/', 'الرئيسية'], ['/services', 'الخدمات'], ['/company-market', 'عالم التقبيل'],
  ['/initiatives', 'المبادرات'], ['/about', 'قالوا عنا'], ['/join-us', 'انضم إلينا'], ['/contact', 'تواصل'],
];

export function usePublicMotion() {
  const { pathname } = useLocation();
  const { loading } = useCms();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  useEffect(() => {
    if (pathname === '/admin' || pathname.startsWith('/join-us/')) return;
    // Heavier header glass once content scrolls underneath is a legibility state, not motion: it runs even under reduced-motion.
    const headerState = ScrollTrigger.create({ start: 24, end: 'max', toggleClass: { targets: '.site-header', className: 'is-scrolled' } });
    const media = gsap.matchMedia();
    // Motion is wired once per route after CMS content is in. Re-running on data arrival would revert every
    // revealed element to hidden and replay it. The hero intro itself is CSS (glass.css) so it needs no setup here.
    if (!loading) media.add('(prefers-reduced-motion: no-preference)', () => {
      const lenis = new Lenis({ autoRaf: false, duration: .85 });
      const tick = (time: number) => lenis.raf(time * 1000);
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(tick);
      let active = true;
      const refresh = () => { if (active) ScrollTrigger.refresh(); };
      document.fonts.ready.then(refresh).catch(() => {});
      window.addEventListener('load', refresh);
      // The hero image drifts and settles as the page scrolls past it.
      if (document.querySelector('.hero-media')) {
        gsap.fromTo('.hero-media', { scale: 1.08, yPercent: 0 }, { scale: 1, yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      }
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
        // Siblings revealed in the same row cascade instead of landing at once. CSS transitions on the element stay off
        // (glass.css keys on .is-revealed) until the tween is done, so per-frame transform writes are not themselves eased.
        const siblings = Array.from(element.parentElement?.children || []).filter(child => child.hasAttribute('data-reveal'));
        const delay = Math.min(Math.max(siblings.indexOf(element), 0), 5) * .06;
        gsap.fromTo(element, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .7, delay, ease: 'expo.out', clearProps: 'transform,opacity', onComplete: () => element.classList.add('is-revealed'), scrollTrigger: { trigger: element, start: 'top 90%', once: true } });
      });
      return () => { active = false; gsap.ticker.remove(tick); lenis.destroy(); window.removeEventListener('load', refresh); };
    });
    return () => { headerState.kill(); media.revert(); };
  }, [pathname, loading]);
}

export function Shell({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const { cms, loading } = useCms();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  usePublicMotion();
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    const heading = document.querySelector('#main-content h1')?.textContent?.trim();
    document.title = heading ? `${heading} | وعاء` : 'وعاء | خدمات لوجستية وإدارية';
  }, [pathname, loading]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuButtonRef.current?.focus(); }
    };
    const onOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !menuButtonRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const desktop = matchMedia('(min-width: 1001px)');
    const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onOutside);
    desktop.addEventListener('change', closeOnDesktop);
    menuRef.current?.querySelector<HTMLElement>('a')?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onOutside); desktop.removeEventListener('change', closeOnDesktop); };
  }, [menuOpen]);
  return <div className={compact ? 'site-shell admin-shell' : 'site-shell'}>
    <a className="skip-link" href="#main-content">تجاوز إلى المحتوى</a>
    <header className="site-header">
      <Link className="brand" to="/" aria-label="وعاء - الرئيسية">
        <img src={`${import.meta.env.BASE_URL}images/weaa-logo.jpeg`} alt="شعار وعاء" />
        {/* The short wordmark at every width; the legal name sits in the footer, where it is never truncated. */}
        <span><b className="brand-short">وعاء</b><small>{cms.company.taglineAr}</small></span>
      </Link>
      <nav className="desktop-nav" aria-label="التنقل الرئيسي">{navigation.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</nav>
      <div className="header-actions">
        <button className="icon-button theme-button" title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'} aria-label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'} onClick={toggle}><Icon icon={theme === 'dark' ? 'solar:sun-2-linear' : 'solar:moon-linear'} /></button>
        <button ref={menuButtonRef} type="button" className="icon-button menu-button" aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'} aria-controls="mobile-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(previous => !previous)}><Icon icon={menuOpen ? 'solar:close-circle-linear' : 'solar:hamburger-menu-linear'} /></button>
      </div>
      {/* Stays mounted so the sheet can ease out as well as in; [hidden] drives the exit transition in glass.css. */}
      <div id="mobile-navigation" className="mobile-nav" ref={menuRef} role="navigation" aria-label="قائمة الهاتف" hidden={!menuOpen}>{navigation.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenuOpen(false)}>{label}<Icon icon="solar:arrow-left-linear" /></NavLink>)}</div>
    </header>
    <div id="main-content" tabIndex={-1}>{children}</div>
    <footer className="site-footer">
      {/* The legal name and registration numbers live here, not in the header. */}
      <div className="footer-brand"><strong>وعاء</strong><p>{cms.company.nameAr}</p><p>حلول لوجستية وإدارية تبدأ من احتياجك.</p></div>
      <div className="footer-links"><Link to="/services">الخدمات</Link><Link to="/join-us">انضم إلينا</Link><Link to="/contact">تواصل</Link></div>
      <div className="footer-contact"><a href={`tel:${cms.company.phone.replace(/[^\d+]/g, '')}`}><bdi dir="ltr">{cms.company.phone}</bdi></a><a href={`mailto:${cms.company.email}`}><bdi dir="ltr">{cms.company.email}</bdi></a><span>{cms.company.headquarters}</span>{(cms.company.cr || cms.company.vat) && <span className="footer-legal">{cms.company.cr && `س.ت ${cms.company.cr}`}{cms.company.cr && cms.company.vat && ' · '}{cms.company.vat && `الرقم الضريبي ${cms.company.vat}`}</span>}</div>
      <small>© {new Date().getFullYear()} وعاء للخدمات اللوجستية والإدارية</small>
    </footer>
    {/* Not on form pages: at phone width it would sit on the full-width submit button, and the form is already the call to action. */}
    {!compact && !pathname.startsWith('/join-us/') && <CallButton phone={cms.company.phone} />}
  </div>;
}

function CallButton({ phone }: { phone: string }) {
  // The button is on every public page, so its entrance plays once per session rather than on every navigation.
  const [settled] = useState(() => { try { return sessionStorage.getItem('weaa-call-fab') === '1'; } catch { return false; } });
  useEffect(() => { try { sessionStorage.setItem('weaa-call-fab', '1'); } catch { /* The button still shows when browser storage is unavailable. */ } }, []);
  return <a className={settled ? 'call-fab is-settled' : 'call-fab'} href={`tel:${phone.replace(/[^\d+]/g, '')}`} aria-label={`اتصل بنا ${phone}`}><Icon icon="solar:phone-calling-linear" /><span>اتصل بنا</span></a>;
}

export function Action({ to, children, secondary = false, icon }: { to: string; children: ReactNode; secondary?: boolean; icon?: string }) {
  const className = secondary ? 'action action-secondary' : 'action action-primary';
  if (/^https?:\/\//.test(to)) return <a className={className} href={to} target="_blank" rel="noopener noreferrer">{children}{icon && <Icon icon={icon} />}</a>;
  return <Link className={className} to={to}>{children}{icon && <Icon icon={icon} />}</Link>;
}

export function PageHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return <div className="page-heading" data-reveal><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{body && <p>{body}</p>}</div>;
}

export function SectionHeading({ eyebrow, title, body, to }: { eyebrow?: string; title: string; body?: string; to?: string }) {
  return <div className="section-heading" data-reveal><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{body && <p>{body}</p>}</div>{to && <Link to={to} className="text-link">استكشف المزيد <Icon icon="solar:arrow-left-linear" /></Link>}</div>;
}
