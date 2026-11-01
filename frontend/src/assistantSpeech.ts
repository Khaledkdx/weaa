// Browser speech: live recognition (Chrome, Edge, Safari) and spoken replies. lib.dom does not type the recognizer,
// so the slice of its API used here is declared locally.
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
  return { listen: recognizerConstructor() !== null, speak: typeof window !== 'undefined' && 'speechSynthesis' in window };
}

export type Listener = { stop(): void };
export type ListenCallbacks = { onInterim(text: string): void; onFinal(text: string): void; onEnd(): void; onError(code: string): void };

// Continuous Arabic recognition with interim results, so the visitor sees words land while speaking.
export function listen({ onInterim, onFinal, onEnd, onError }: ListenCallbacks): Listener | null {
  const Recognition = recognizerConstructor();
  if (!Recognition) return null;
  const recognizer = new Recognition();
  recognizer.lang = 'ar-SA';
  recognizer.continuous = true;
  recognizer.interimResults = true;
  recognizer.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0]?.transcript || '';
      if (result.isFinal) onFinal(transcript.trim());
      else interim += transcript;
    }
    if (interim.trim()) onInterim(interim.trim());
  };
  recognizer.onerror = (event) => onError(event.error);
  recognizer.onend = () => onEnd();
  try { recognizer.start(); } catch { return null; }
  return { stop: () => { recognizer.onend = null; try { recognizer.stop(); } catch { /* already stopped */ } } };
}

// Chrome fills the voice list asynchronously; the first call after load can return nothing.
function voicesReady() {
  return new Promise<SpeechSynthesisVoice[]>(resolve => {
    const synth = window.speechSynthesis;
    if (synth.getVoices().length) return resolve(synth.getVoices());
    const done = () => { synth.removeEventListener('voiceschanged', done); resolve(synth.getVoices()); };
    synth.addEventListener('voiceschanged', done);
    window.setTimeout(done, 1000);
  });
}
const arabic = (voices: SpeechSynthesisVoice[]) => voices.find(candidate => candidate.lang.toLowerCase().startsWith('ar')) || null;

export async function hasArabicVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return arabic(await voicesReady()) !== null;
}

export async function speak(text: string, onDone: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  const synth = window.speechSynthesis;
  const voice = arabic(await voicesReady());
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-SA';
  if (voice) utterance.voice = voice;
  utterance.onend = onDone;
  utterance.onerror = onDone;
  synth.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}
