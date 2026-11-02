import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { TARGET } from './assistantForm';

export function guideCandidates(root: ParentNode = document) {
  return Array.from(root.querySelectorAll<HTMLElement>('main input:not([type="hidden"]), main select, main textarea, main a[href], main button'))
    .filter(el => !el.closest('[hidden], [aria-hidden="true"]') && !el.matches(':disabled, [type="submit"]') && el.getAttribute('type') !== 'password')
    .filter(el => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0);
}
function nameOf(el: HTMLElement) {
  // The required-field asterisk belongs to the label's styling, not to the field's name.
  return (el.getAttribute('aria-label') || el.closest('label')?.textContent || el.textContent || el.getAttribute('placeholder') || 'هذا الحقل').replace(/\s+/g, ' ').replace(/\s*\*\s*$/, '').trim().slice(0, 100);
}
function showTarget(el: HTMLElement) {
  window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 140), behavior: 'instant' });
}

// On a form, the orb points at the field it is asking about, or at the first field, and names it under its caption.
export function AssistantGuide({ pathname }: { pathname: string }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [label, setLabel] = useState('');
  const [marked, setMarked] = useState(false);
  useEffect(() => {
    let index = 0;
    const select = () => {
      const asked = document.querySelector<HTMLElement>(`[${TARGET}]`);
      const firstField = asked || guideCandidates().find(el => el.matches('input,select,textarea')) || null;
      setMarked(!!asked);
      setTarget(current => current === firstField ? current : firstField);
      setLabel(firstField ? nameOf(firstField) : '');
    };
    const timer = window.setInterval(() => { select(); if (++index >= 10) window.clearInterval(timer); }, 250);
    select();
    window.addEventListener('assistant-target', select);
    return () => { window.clearInterval(timer); window.removeEventListener('assistant-target', select); };
  }, [pathname]);
  useEffect(() => {
    if (!target) { setRect(null); return; }
    target.classList.add('assistant-highlight');
    const settle = window.setTimeout(() => { if (target.isConnected) showTarget(target); }, 350);
    const update = () => setRect(target.getBoundingClientRect());
    update();
    window.addEventListener('scroll', update, { passive: true, capture: true }); window.addEventListener('resize', update);
    return () => { window.clearTimeout(settle); target.classList.remove('assistant-highlight'); window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [target]);
  const visible = rect && rect.bottom > 76 && rect.top < window.innerHeight - 300;
  return <>
    {visible && <div className="assistant-pointer" aria-hidden="true" style={{ transform: `translate(${Math.max(12, Math.min(window.innerWidth - 52, rect.left + rect.width / 2 - 20))}px, ${Math.max(80, rect.top - 42)}px)` }}><Icon icon="solar:arrow-down-linear" /></div>}
    {target && <p className="assistant-live-hint">{marked ? 'هنا' : 'ابدأ هنا'}: {label}</p>}
  </>;
}
