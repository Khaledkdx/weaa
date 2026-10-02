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
  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (pathname === '/admin') return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;
    const lenis = new Lenis({ autoRaf: false, duration: 1.05 });
    const tick = (time: number) => lenis.raf(time * 1000);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(tick);
    const refresh = () => ScrollTrigger.refresh();
    document.fonts.ready.then(refresh).catch(() => {});
    window.addEventListener('load', refresh);
    const context = gsap.context(() => {
      gsap.fromTo('.hero-animate', { y: 24, opacity: .25 }, { y: 0, opacity: 1, duration: .95, stagger: .12, ease: 'power3.out' });
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
        gsap.fromTo(element, { y: 36, opacity: .45 }, { y: 0, opacity: 1, duration: .7, ease: 'power2.out', scrollTrigger: { trigger: element, start: 'top 88%', once: true } });
      });
    });
    return () => { context.revert(); gsap.ticker.remove(tick); lenis.destroy(); window.removeEventListener('load', refresh); };
  }, [pathname, loading]);
}

export function Shell({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const { cms } = useCms();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  usePublicMotion();
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    menuRef.current?.querySelector<HTMLElement>('a')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);
  return <div className={compact ? 'site-shell admin-shell' : 'site-shell'}>
    <a className="skip-link" href="#main-content">تجاوز إلى المحتوى</a>
    <header className="site-header">
      <Link className="brand" to="/" aria-label="وعاء - الرئيسية">
        <img src={`${import.meta.env.BASE_URL}images/weaa-logo.jpeg`} alt="شعار وعاء" />
        <span><strong>{cms.company.nameAr}</strong><b className="brand-short" aria-hidden="true">وعاء</b><small>{cms.company.taglineAr}</small></span>
      </Link>
      <nav className="desktop-nav" aria-label="التنقل الرئيسي">{navigation.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</nav>
      <div className="header-actions">
        <button className="icon-button theme-button" title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'} aria-label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'} onClick={toggle}><Icon icon={theme === 'dark' ? 'solar:sun-2-linear' : 'solar:moon-linear'} /></button>
        <button className="icon-button menu-button" aria-label="فتح القائمة" aria-expanded={menuOpen} onClick={() => setMenuOpen(previous => !previous)}><Icon icon={menuOpen ? 'solar:close-circle-linear' : 'solar:hamburger-menu-linear'} /></button>
      </div>
      {menuOpen && <div className="mobile-nav" ref={menuRef} role="navigation" aria-label="قائمة الهاتف">{navigation.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</div>}
    </header>
    <main id="main-content">{children}</main>
    <footer className="site-footer">
      <div><strong>وعاء</strong><p>حلول لوجستية وإدارية تبدأ من احتياجك.</p></div>
      <div className="footer-links"><Link to="/services">الخدمات</Link><Link to="/join-us">انضم إلينا</Link><Link to="/contact">تواصل</Link></div>
      <div className="footer-contact"><a href={`tel:${cms.company.phone}`}>{cms.company.phone}</a><a href={`mailto:${cms.company.email}`}>{cms.company.email}</a></div>
      <small>© {new Date().getFullYear()} وعاء للخدمات اللوجستية والإدارية</small>
    </footer>
  </div>;
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
