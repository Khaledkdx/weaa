import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canRecord, recordUtterance, releaseMicrophone } from './assistantRecorder';
const stopTrack = vi.fn();
let recorder: { onstop: (() => void) | null; ondataavailable: ((e: { data: Blob }) => void) | null; state: string };
// What the level meter reads: the tests raise and lower it to act out speech and silence.
let level = 0;
class Meter {
  state = 'running';
  resume = async () => {};
  close = async () => {};
  createMediaStreamSource() { return { connect() {} }; }
  createAnalyser() { return { fftSize: 2048, getFloatTimeDomainData(samples: Float32Array) { samples.fill(level); } }; }
}
const callbacks = () => ({ onInterim: vi.fn(), onFinal: vi.fn(), onEnd: vi.fn(), onError: vi.fn(), onStatus: vi.fn() });
beforeEach(() => {
  level = 0;
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] }) } });
  vi.stubGlobal('AudioContext', class { constructor() { throw new Error('No level monitoring'); } });
  vi.stubGlobal('MediaRecorder', class {
    static isTypeSupported = () => true;
    state = 'inactive'; mimeType = 'audio/webm'; onstop = null as (() => void) | null; onerror = null;
    ondataavailable = null as ((e: { data: Blob }) => void) | null;
    constructor() { recorder = this; }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['test audio']) }); this.onstop?.(); }
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: 'أبي أسجل مناديب الداخل' }), { headers: { 'Content-Type': 'application/json' } })));
});
afterEach(() => { releaseMicrophone(); vi.unstubAllGlobals(); vi.clearAllMocks(); Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined }); });
describe('complete voice utterances', () => {
  it('without a level meter, transcribes only after finishing and keeps the microphone open for the next turn', async () => {
    const cb = callbacks(); const listener = recordUtterance(cb);
    await vi.waitFor(() => expect(recorder.state).toBe('recording'));
    expect(cb.onStatus).toHaveBeenCalledWith('manual');
    expect(fetch).not.toHaveBeenCalled(); listener.finish?.();
    await vi.waitFor(() => expect(cb.onFinal).toHaveBeenCalledWith('أبي أسجل مناديب الداخل'));
    expect(cb.onFinal).toHaveBeenCalledOnce(); expect(cb.onEnd).toHaveBeenCalledOnce();
    // The stream stays open between turns of a live conversation; stopping live mode hands it back.
    expect(stopTrack).not.toHaveBeenCalled();
    recordUtterance(callbacks());
    await vi.waitFor(() => expect(recorder.state).toBe('recording'));
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledOnce();
    releaseMicrophone();
    expect(stopTrack).toHaveBeenCalled();
  });
  it('ends the sentence by itself after a pause in speech, with nothing pressed', async () => {
    vi.stubGlobal('AudioContext', Meter);
    const cb = callbacks(); recordUtterance(cb, { silenceMs: 80 });
    await vi.waitFor(() => expect(cb.onStatus).toHaveBeenCalledWith('listening'));
    level = .3;
    await new Promise(resolve => setTimeout(resolve, 220));
    expect(recorder.state).toBe('recording');
    level = .001;
    await vi.waitFor(() => expect(cb.onFinal).toHaveBeenCalledWith('أبي أسجل مناديب الداخل'));
    expect(cb.onStatus).toHaveBeenCalledWith('transcribing');
    expect(cb.onEnd).toHaveBeenCalledOnce();
  });
  it('reports a round with no voice as silence without sending audio', async () => {
    vi.stubGlobal('AudioContext', Meter);
    const cb = callbacks(); recordUtterance(cb, { noSpeechMs: 100 });
    await vi.waitFor(() => expect(cb.onError).toHaveBeenCalledWith('no-speech'));
    expect(fetch).not.toHaveBeenCalled(); expect(cb.onEnd).toHaveBeenCalledOnce();
  });
  it('discards a canceled recording and never submits audio', async () => {
    const cb = callbacks(); const listener = recordUtterance(cb);
    await vi.waitFor(() => expect(recorder.state).toBe('recording')); listener.stop();
    expect(fetch).not.toHaveBeenCalled(); expect(cb.onFinal).not.toHaveBeenCalled();
    releaseMicrophone(); expect(stopTrack).toHaveBeenCalled();
  });
  it('reports permission denial', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    const cb = callbacks(); recordUtterance(cb);
    await vi.waitFor(() => expect(cb.onError).toHaveBeenCalledWith('not-allowed'));
  });
  it('surfaces transcription failure instead of silently listening forever', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 502 }));
    const cb = callbacks(); const listener = recordUtterance(cb);
    await vi.waitFor(() => expect(recorder.state).toBe('recording')); listener.finish?.();
    await vi.waitFor(() => expect(cb.onError).toHaveBeenCalledWith('network'));
    expect(cb.onFinal).not.toHaveBeenCalled(); expect(cb.onEnd).toHaveBeenCalledOnce();
  });
  // Last: the unavailable flag is module state and stays set for the rest of this file.
  it('hands over to the browser recognizer once the server says it has no transcription', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 503 }));
    const cb = callbacks(); const listener = recordUtterance(cb);
    await vi.waitFor(() => expect(recorder.state).toBe('recording')); listener.finish?.();
    await vi.waitFor(() => expect(cb.onError).toHaveBeenCalledWith('transcription-unavailable'));
    expect(canRecord()).toBe(false);
  });
});
