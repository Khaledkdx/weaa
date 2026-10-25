// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DynamicForm } from './forms';
import { createJoinRequest } from './data';
import type { FormDefinition } from './types';
vi.mock('./data', () => ({ createJoinRequest: vi.fn().mockResolvedValue(undefined) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const form: FormDefinition = { id: 'multi', slug: 'multi', title: 'طلب وظيفة', description: '', audience: '', kind: 'join', enabled: true, submissionType: 'supabase', fields: [
  { key: 'name', label: 'الاسم', type: 'text', required: true, options: [] },
  { key: 'experience', label: 'الخبرة', type: 'text', required: true, options: [] },
  { key: 'cv', label: 'السيرة الذاتية', type: 'file', required: true, options: [] },
  { key: 'certificate', label: 'الشهادة', type: 'file', required: true, options: [] },
] };
function pdf(name: string) {
  const file = new File(['%PDF-1.4'], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'slice', { value: () => ({ arrayBuffer: async () => new Uint8Array([37, 80, 68, 70, 45]).buffer }) });
  return file;
}
describe('general join form completeness', () => {
  it('requires every mandatory attachment and sends all of them with the remaining fields', async () => {
    const { container } = render(<DynamicForm form={form} />);
    fireEvent.change(screen.getByLabelText('الاسم', { exact: false }), { target: { value: 'عميل اختبار' } });
    fireEvent.change(screen.getByLabelText('الخبرة', { exact: false }), { target: { value: 'خمس سنوات' } });
    fireEvent.change(screen.getByLabelText('السيرة الذاتية'), { target: { files: [pdf('cv.pdf')] } });
    fireEvent.submit(container.querySelector('form')!);
    await screen.findByRole('alert');
    expect(createJoinRequest).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('الشهادة'), { target: { files: [pdf('certificate.pdf')] } });
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(createJoinRequest).toHaveBeenCalledOnce());
    expect(vi.mocked(createJoinRequest).mock.calls[0][0]).toMatchObject({ form_slug: 'multi', fields: { experience: 'خمس سنوات' } });
    expect(vi.mocked(createJoinRequest).mock.calls[0][1]).toEqual([
      expect.objectContaining({ key: 'cv', label: 'السيرة الذاتية', file: expect.any(File) }),
      expect.objectContaining({ key: 'certificate', label: 'الشهادة', file: expect.any(File) }),
    ]);
  });
});
