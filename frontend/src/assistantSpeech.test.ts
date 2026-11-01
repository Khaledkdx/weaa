import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { speak, stopSpeaking } from './assistantSpeech';
const play = vi.fn(), pause = vi.fn();
let player: { onended: (() => void) | null; onerror: (() => void) | null };
beforeEach(() => {
  play.mockResolvedValue(undefined);
  vi.stubGlobal('Audio', class {
    onended = null; onerror = null; play = play; pause = pause; load = vi.fn(); removeAttribute = vi.fn();
    constructor() { player = this; }
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Blob(['wave']), { headers: { 'Content-Type': 'audio/wav' } })));
  URL.createObjectURL = vi.fn(() => 'blob:voice'); URL.revokeObjectURL = vi.fn();
});
afterEach(() => { stopSpeaking(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe('server generated Arabic speech', () => {
  it('plays server audio without browser speech synthesis', async () => {
    const done = vi.fn();
    expect(await speak('هلا والله', done)).toBe(true);
    expect(fetch).toHaveBeenCalledWith('/api/assistant/speech', expect.objectContaining({ method: 'POST', body: JSON.stringify({ text: 'هلا والله' }) }));
    expect(play).toHaveBeenCalledOnce();
    player.onended?.(); expect(done).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:voice');
  });
  it('reports upstream failure without device fallback', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 502 }));
    const problem = vi.fn();
    expect(await speak('هلا', vi.fn(), problem)).toBe(false);
    expect(problem).toHaveBeenCalledWith('failed'); expect(play).not.toHaveBeenCalled();
  });
  it('reports blocked browser audio', async () => {
    play.mockRejectedValue(new DOMException('blocked', 'NotAllowedError'));
    const problem = vi.fn(), done = vi.fn();
    expect(await speak('هلا', done, problem)).toBe(false);
    expect(problem).toHaveBeenCalledWith('blocked'); expect(done).toHaveBeenCalledOnce();
  });
  it('never plays a canceled delayed response', async () => {
    let resolve!: (v: Response) => void;
    vi.mocked(fetch).mockImplementation(() => new Promise(r => { resolve = r; }));
    const pending = speak('هلا', vi.fn()); stopSpeaking();
    resolve(new Response(new Blob(['wave']), { headers: { 'Content-Type': 'audio/wav' } }));
    expect(await pending).toBe(false); expect(play).not.toHaveBeenCalled();
  });
});
