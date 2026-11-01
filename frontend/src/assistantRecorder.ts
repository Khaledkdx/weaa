import type { Listener, ListenCallbacks } from './assistantSpeech';

export type RecorderOptions = { silenceMs?: number; noSpeechMs?: number; maxMs?: number };

// Set once the server answers that it has no transcription (503/404): later utterances use the browser's own recognition.
let transcriptionUnavailable = false;

export function canRecord() {
  return !transcriptionUnavailable && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

// One microphone session per live conversation. The stream and its level analyser open on the first utterance and stay
// open between turns, so the robot neither flickers the browser's recording indicator nor waits on getUserMedia every
// time the visitor speaks again. releaseMicrophone() closes it when live mode ends.
type Microphone = { stream: MediaStream; context: AudioContext | null; analyser: AnalyserNode | null };
let microphone: Microphone | null = null;
let opening: Promise<Microphone> | null = null;
let generation = 0;

async function openMicrophone(): Promise<Microphone> {
  if (microphone) return microphone;
  if (!opening) {
    const mine = generation;
    opening = (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      // Released while the permission prompt was up: hand the device straight back.
      if (mine !== generation) { stream.getTracks().forEach(track => track.stop()); throw new DOMException('released', 'AbortError'); }
      let context: AudioContext | null = null, analyser: AnalyserNode | null = null;
      try {
        context = new AudioContext();
        // A context the browser keeps suspended would meter silence forever; without a level meter the visitor finishes by hand.
        await Promise.race([context.resume(), new Promise(resolve => window.setTimeout(resolve, 600))]);
        if (context.state !== 'running') throw new Error('suspended');
        analyser = context.createAnalyser(); analyser.fftSize = 2048;
        context.createMediaStreamSource(stream).connect(analyser);
      } catch { void context?.close().catch(() => {}); context = null; analyser = null; }
      microphone = { stream, context, analyser };
      // A device that goes away (unplugged, permission revoked) ends the session; the next utterance asks again.
      stream.getTracks().forEach(track => { track.onended = () => { if (microphone?.stream === stream) releaseMicrophone(); }; });
      return microphone;
    })().finally(() => { opening = null; });
  }
  return opening;
}

export function releaseMicrophone() {
  generation++;
  const current = microphone; microphone = null;
  current?.stream.getTracks().forEach(track => track.stop());
  void current?.context?.close().catch(() => {});
}

// One utterance per recording. Voice is anything well above the room's noise floor; a pause of silenceMs after voice
// closes the recording and sends it for transcription, so the visitor never has to press anything to finish a sentence.
export function recordUtterance(callbacks: ListenCallbacks, { silenceMs = 1200, noSpeechMs = 9000, maxMs = 25000 }: RecorderOptions = {}): Listener {
  let canceled = false, recorder: MediaRecorder | null = null, meter = 0, timer = 0;
  let transcription: AbortController | null = null;
  const clear = () => { window.clearInterval(meter); window.clearTimeout(timer); };
  const finish = () => { if (recorder?.state === 'recording') recorder.stop(); };
  const fail = (code: string) => { clear(); if (canceled) return; canceled = true; callbacks.onError(code); callbacks.onEnd(); };
  callbacks.onStatus?.('opening');
  void (async () => {
    let mic: Microphone;
    try { mic = await openMicrophone(); }
    catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) fail(error instanceof DOMException && error.name === 'NotAllowedError' ? 'not-allowed' : 'audio-capture');
      return;
    }
    if (canceled) return;
    const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type));
    try { recorder = mime ? new MediaRecorder(mic.stream, { mimeType: mime }) : new MediaRecorder(mic.stream); }
    catch { fail('audio-capture'); return; }
    const chunks: BlobPart[] = [];
    // Without a level meter every recording counts as speech, and the visitor ends it with the finish button.
    let heard = !mic.analyser;
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => fail('audio-capture');
    recorder.onstop = async () => {
      clear(); if (canceled) return;
      if (!heard) { callbacks.onError('no-speech'); callbacks.onEnd(); return; }
      const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' });
      if (blob.size > 2500000) { callbacks.onError('recording-too-large'); callbacks.onEnd(); return; }
      callbacks.onStatus?.('transcribing');
      try {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(blob);
        });
        if (canceled) return;
        const format = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
        transcription = new AbortController();
        const timeout = window.setTimeout(() => transcription?.abort(), 30000);
        let response: Response;
        try { response = await fetch('/api/assistant/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, format }), signal: transcription.signal }); }
        finally { window.clearTimeout(timeout); }
        if (response.status === 503 || response.status === 404) { transcriptionUnavailable = true; throw new Error('transcription-unavailable'); }
        if (!response.ok) throw new Error('transcription');
        const result = await response.json();
        if (canceled) return;
        const text = typeof result.text === 'string' ? result.text.trim() : '';
        if (text) callbacks.onFinal(text); else callbacks.onError('no-speech');
      } catch { if (!canceled) callbacks.onError(transcriptionUnavailable ? 'transcription-unavailable' : 'network'); }
      finally { if (!canceled) callbacks.onEnd(); }
    };
    recorder.start();
    callbacks.onStatus?.(mic.analyser ? 'listening' : 'manual');
    const started = performance.now();
    timer = window.setTimeout(finish, maxMs);
    const analyser = mic.analyser;
    if (!analyser) return;
    const samples = new Float32Array(analyser.fftSize);
    let floor = -1, voicedFrames = 0, lastVoice = started;
    meter = window.setInterval(() => {
      if (canceled || recorder?.state !== 'recording') { window.clearInterval(meter); return; }
      analyser.getFloatTimeDomainData(samples);
      let energy = 0;
      for (let i = 0; i < samples.length; i++) energy += samples[i] * samples[i];
      const rms = Math.sqrt(energy / samples.length);
      if (floor < 0) floor = Math.min(rms, .01);
      // The floor follows quiet frames only, so a long sentence never raises it; voice has to clear it three frames running.
      const threshold = Math.max(floor * 3, .012);
      const now = performance.now();
      if (rms > threshold) { if (++voicedFrames >= 3) { heard = true; lastVoice = now; } }
      else { voicedFrames = 0; floor = floor * .9 + rms * .1; }
      callbacks.onLevel?.(Math.min(1, rms / .25));
      if ((heard && now - lastVoice > silenceMs) || (!heard && now - started > noSpeechMs)) finish();
    }, 50);
  })();
  return {
    stop() { canceled = true; transcription?.abort(); clear(); if (recorder?.state === 'recording') recorder.stop(); },
    finish,
  };
}
