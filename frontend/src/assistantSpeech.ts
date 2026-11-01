// Browser speech: live recognition (Chrome, Edge, Safari) and spoken replies. lib.dom does not type the recognizer,
// so the slice of its API used here is declared locally.
import { canRecord, recordUtterance, releaseMicrophone } from './assistantRecorder';
export { releaseMicrophone };
type RecognitionResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognizer = {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};
type RecognizerConstructor = new () => Recognizer;

function recognizerConstructor(): RecognizerConstructor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as { SpeechRecognition?: RecognizerConstructor; webkitSpeechRecognition?: RecognizerConstructor };
  return scope.SpeechRecognition || scope.webkitSpeechRecognition || null;
}

export function speechSupport() {
  return { listen: canRecord() || recognizerConstructor() !== null, speak: typeof window !== 'undefined' && typeof Audio !== 'undefined' };
}

export type Listener = { stop(): void; finish?(): void };
// 'manual' means no level meter is available, so the visitor ends the sentence with the finish button.
export type ListenStatus = 'opening' | 'listening' | 'manual' | 'transcribing';
// onLevel reports the microphone level (0–1) while the server recorder meters it, so the robot can react to the voice.
export type ListenCallbacks = { onInterim(text: string): void; onFinal(text: string): void; onEnd(): void; onError(code: string): void; onStatus?(status: ListenStatus): void; onLevel?(level: number): void };

// One utterance: the server recorder when available, otherwise continuous Arabic recognition with interim results, so
// the visitor sees words land while speaking. Either way a pause ends the sentence; nothing has to be pressed.
export function listen(callbacks: ListenCallbacks): Listener | null {
  if (canRecord()) return recordUtterance(callbacks);
  const { onInterim, onFinal, onEnd, onError, onStatus } = callbacks;
  const Recognition = recognizerConstructor();
  if (!Recognition) return null;
  const recognizer = new Recognition();
  recognizer.lang = 'ar-SA';
  recognizer.continuous = true;
  recognizer.interimResults = true;
  let finalText = '', partial = '', timer = 0, delivered = false;
  const deliver = () => {
    window.clearTimeout(timer);
    const text = `${finalText} ${partial}`.trim();
    if (!delivered && text) { delivered = true; recognizer.onend = null; recognizer.stop(); onFinal(text); onEnd(); }
  };
  recognizer.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0]?.transcript || '';
      if (result.isFinal) finalText += ` ${transcript.trim()}`;
      else interim += transcript;
    }
    partial = interim.trim();
    onInterim(`${finalText} ${partial}`.trim());
    window.clearTimeout(timer); timer = window.setTimeout(deliver, 1400);
  };
  recognizer.onerror = (event) => onError(event.error);
  recognizer.onend = () => { if ((finalText + partial).trim()) deliver(); else onEnd(); };
  try { recognizer.start(); } catch { return null; }
  onStatus?.('listening');
  return { finish: deliver, stop: () => { delivered = true; window.clearTimeout(timer); recognizer.onend = null; recognizer.onresult = null; try { recognizer.stop(); } catch { /* already stopped */ } } };
}

export type SpeechProblem = 'unsupported' | 'no-arabic-voice' | 'blocked' | 'failed';
let speechVersion = 0;
let pendingSpeech: AbortController | null = null;
let activeAudio: HTMLAudioElement | null = null;
let audioUrl: string | null = null;

export async function hasArabicVoice() {
  return speechSupport().speak;
}

// onStart fires when audio actually plays, after the server has produced it, so the robot can think until it talks.
export async function speak(text: string, onDone: () => void, onProblem?: (problem: SpeechProblem) => void, onStart?: () => void) {
  if (!speechSupport().speak) { onProblem?.('unsupported'); return false; }
  stopSpeaking();
  const version = speechVersion;
  const controller = new AbortController();
  pendingSpeech = controller;
  const timeout = window.setTimeout(() => controller.abort(), 35000);
  let finished = false;
  const done = (problem?: SpeechProblem) => {
    if (version !== speechVersion || finished) return;
    finished = true;
    stopSpeaking();
    if (problem) onProblem?.(problem);
    onDone();
  };
  try {
    const response = await fetch('/api/assistant/speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 600) }), signal: controller.signal });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/')) throw new Error('audio_unavailable');
    const blob = await response.blob();
    if (version !== speechVersion) return false;
    audioUrl = URL.createObjectURL(blob);
    activeAudio = new Audio(audioUrl);
    activeAudio.onended = () => done();
    activeAudio.onerror = () => done('failed');
    await activeAudio.play();
    if (version === speechVersion) onStart?.();
    return true;
  } catch (error) {
    if (version === speechVersion) done(error instanceof DOMException && error.name === 'NotAllowedError' ? 'blocked' : 'failed');
    return false;
  } finally { window.clearTimeout(timeout); }
}

export function stopSpeaking() {
  speechVersion++;
  pendingSpeech?.abort(); pendingSpeech = null;
  if (activeAudio) { activeAudio.onended = null; activeAudio.onerror = null; activeAudio.pause(); activeAudio.removeAttribute('src'); activeAudio.load(); activeAudio = null; }
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = null;
}
