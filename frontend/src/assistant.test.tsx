// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { CmsProvider } from './data';
import { SiteAssistant } from './assistant';
import { roadTransportPath } from './roadTransport';

afterEach(cleanup);

function Location() { return <output data-testid="location">{useLocation().pathname}</output>; }
function renderAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><CmsProvider><SiteAssistant /><Location /></CmsProvider></MemoryRouter>);
}

describe('site assistant', () => {
  it('opens from the robot and takes the visitor where they ask', async () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'مساعد وعاء' }));
    const dialog = screen.getByRole('dialog', { name: 'مساعد وعاء' });
    expect(dialog.hidden).toBe(false);
    fireEvent.change(screen.getByRole('textbox', { name: 'اسأل مساعد وعاء' }), { target: { value: 'ابغى شاحنة تنقل بضاعة' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
    await screen.findByText(/نموذج لطلب نقل بضائع/);
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(roadTransportPath));
  });

  it('sends a suggestion chip as a question', async () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'مساعد وعاء' }));
    fireEvent.click(screen.getByRole('button', { name: 'تواصل معنا' }));
    await screen.findByText(/تقدر تتصل على/);
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/contact'));
  });

  it('says so when the microphone is blocked instead of listening in silence', async () => {
    class BlockedRecognition {
      lang = ''; continuous = false; interimResults = false;
      onresult: unknown = null; onend: (() => void) | null = null; onerror: ((event: { error: string }) => void) | null = null;
      start() { setTimeout(() => { this.onerror?.({ error: 'not-allowed' }); this.onend?.(); }, 0); }
      stop() {}
    }
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = BlockedRecognition;
    try {
      renderAt('/');
      fireEvent.click(screen.getByRole('button', { name: 'مساعد وعاء' }));
      fireEvent.click(screen.getByRole('button', { name: 'تحدث' }));
      await screen.findByText(/ما قدرت أوصل للمايكروفون/);
      expect(screen.getByRole('button', { name: 'تحدث' }).getAttribute('aria-pressed')).toBe('false');
    } finally {
      delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    }
  });

  it('stays off the admin pages but follows the visitor into a form', () => {
    renderAt('/admin');
    expect(screen.queryByRole('button', { name: 'مساعد وعاء' })).toBeNull();
    cleanup();
    renderAt('/join-us/request-services');
    expect(screen.getByRole('button', { name: 'مساعد وعاء' })).toBeTruthy();
  });
});
