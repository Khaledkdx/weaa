// The conversation that fills a form: one field at a time, asked aloud and written into the page at once, with no stop
// to confirm each one; one sentence can answer several fields. The form's own next buttons are pressed on the way, a
// required attachment is waited for until it arrives, the whole form is read back once at the end, and nothing is sent
// without an explicit yes. The visitor can say stop, skip, back, repeat or read at any moment, and after the read-back
// can name a field to change, even one from an earlier step.
import { commandOf, describeDate, interpret, pickOption, pickOptions, question, topic, type Interpretation } from './assistantFill';
import { awaitOutcome, clearTarget, describePage, discoverFields, formButtons, readField, revealField, writeField, type FormField } from './assistantForm';
import { recall, rememberValues, type Profile } from './assistantMemory';
import { carriesMore, extractLocally, extractValues } from './assistantExtract';
import { normalizeArabic } from './assistantBrain';

type Stage = 'ask' | 'file' | 'review' | 'fix' | 'save';
type Written = { value: string; spoken: string; values?: string[] };
// reviewing: the field being asked was named after the read-back, so its answer leads back to the read-back.
// forceAsk: the field at the index is asked even though it holds a value, because the form rejected that value.
// step counts the form's next buttons pressed so far; steps remembers at which step each field was written, and
// finalStep is the step the read-back happens on, so a change to an earlier field can travel back and forward again.
// pressing: one of the form's buttons has been pressed and its answer is awaited; words said meanwhile wait.
// watch: the timer that looks out for an attachment to arrive.
// opened: the first field has been asked, which is the one introduced as «أول خانة».
type Session = { fields: FormField[]; index: number; stage: Stage; filled: Record<string, string>; title: string; reviewing: boolean; forceAsk: boolean; step: number; finalStep: number; steps: Record<string, number>; pressing: boolean; watch: number; opened: boolean };
// acting is told the moment the orb writes into a field, so its body can show the pen.
export type FillFlowOptions = { tell(text: string): void; profile(): Profile | null; remembered?(profile: Profile | null): void; acting?(what: 'writing'): void };

const formTitle = () => (document.querySelector('main h1')?.textContent || 'النموذج').replace(/\s+/g, ' ').trim();
const stepTitle = () => (document.querySelector('main form h2')?.textContent || '').replace(/\s+/g, ' ').trim();
const wait = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));
const fresh = (): Session => ({ fields: [], index: 0, stage: 'ask', filled: {}, title: '', reviewing: false, forceAsk: false, step: 0, finalStep: 0, steps: {}, pressing: false, watch: 0, opened: false });
// The field some words name: the longest field name the words contain, else the closest one.
function nameField<T extends { label: string }>(candidates: T[], said: string): T | null {
  const words = normalizeArabic(said);
  const contained = candidates.filter(candidate => { const label = normalizeArabic(candidate.label); return label.length >= 3 && words.includes(label); }).sort((a, b) => b.label.length - a.label.length);
  return contained[0] || pickOption(candidates, said);
}
// The field that is this element: the same element first, since a group's container also contains the fields inside it.
function indexOf(fields: FormField[], element: Element) {
  const exact = fields.findIndex(field => field.element === element);
  return exact >= 0 ? exact : fields.findIndex(field => field.element.contains(element) || element.contains(field.element));
}
// What is kept for next time and for the read-back: the value as written for typed fields, the words for the rest.
const kept = (field: FormField, written: Written) => ['text', 'tel', 'email', 'textarea', 'number'].includes(field.kind) ? written.value : written.spoken;
// The words said after a field's name: «رقم الجوال صفر خمسة…» carries the new value along with the name.
function afterLabel(said: string, label: string) {
  const raw = said.trim().split(/\s+/), plain = raw.map(normalizeArabic), target = normalizeArabic(label).split(' ').filter(Boolean);
  for (let i = 0; target.length && i + target.length <= raw.length; i++) {
    if (target.every((word, j) => plain[i + j] === word)) return raw.slice(i + target.length).join(' ').replace(/^(?:هو|هي|يكون|تكون|غلط|خطا|خطأ|صح|مو صح|مش صح)\s*/, '').trim();
  }
  return '';
}

export class FillFlow {
  private session: Session | null = null;
  constructor(private readonly options: FillFlowOptions) {}

  get active() { return this.session !== null; }
  get stage() { return this.session?.stage ?? null; }

  // «أرسل»: the form is read back once and the yes is asked for.
  offerSubmit() {
    const fields = discoverFields();
    if (!formButtons().submit) { this.say('ما لقيت زر الإرسال في هذه الصفحة.'); return; }
    this.cancel();
    this.session = { ...fresh(), fields, index: fields.length, stage: 'review', title: formTitle() };
    this.review('');
  }

  start(prefix = '') {
    const fields = discoverFields();
    if (!fields.length) { this.cancel(); this.say('ما لقيت نموذج في هذه الصفحة. قل لي وين تبي تروح وأفتحه لك.'); return; }
    this.cancel();
    this.session = { ...fresh(), fields, title: formTitle() };
    this.ask(`${prefix}تمام، بنعبي ${this.session.title} سوا. أقول لك اسم كل خانة وأنت جاوبني، وفي الآخر أقرأ لك كل شي مرة وحدة. وتقدر تقول: تخطي، أو ارجع، أو وقف، في أي وقت. `);
  }

  cancel() { this.unwatch(); this.session = null; clearTarget(); }

  // Returns false when the words were not for the filling, so the caller answers them as usual.
  async handle(said: string): Promise<boolean> {
    const session = this.session;
    if (!session) return false;
    const command = commandOf(said);
    if (command === 'stop') { this.end('تمام، وقفت التعبئة. لو تبي نكمل قل: عبّي لي النموذج.'); return true; }
    if (session.pressing) { this.say('لحظة…'); return true; }
    if (command === 'read') { const field = this.field(); this.say(`${describePage()} ${field ? question(field) : ''}`.trim()); return true; }
    if (command === 'repeat') { this.prompt(); return true; }
    const asking = session.stage === 'ask' || session.stage === 'file';
    if (command === 'back' && asking) { session.index = Math.max(0, session.index - 1); session.stage = 'ask'; session.forceAsk = true; this.ask('رجعنا. '); return true; }
    if (command === 'skip' && asking) {
      const field = this.field();
      // A required attachment cannot be skipped: the form would refuse without it.
      if (session.stage === 'file' && field?.required) { this.insist(field, 'required'); return true; }
      this.advance('تخطيناها. ');
      return true;
    }
    switch (session.stage) {
      case 'ask': return this.answer(said);
      case 'file': {
        const field = this.field();
        if (!field) { this.advance(''); return true; }
        if (readField(field) === 'مرفق') { this.advance('وصل الملف، تمام. '); return true; }
        this.insist(field, 'missing');
        return true;
      }
      case 'review': {
        if (command === 'yes') { await this.press('submit'); return true; }
        if (command === 'no' || command === 'back') { session.stage = 'fix'; this.say('أي خانة تبي تعدّلها؟'); return true; }
        if (await this.fix(said)) return true;
        this.say('قل نعم وأرسل الطلب، أو قل لي اسم الخانة اللي تبي تعدّلها.');
        return true;
      }
      case 'fix': {
        if (await this.fix(said)) return true;
        this.say(`ما لقيت خانة بهذا الاسم. الخانات: ${Object.keys(session.steps).concat(session.fields.filter(field => field.element.isConnected).map(field => field.label)).filter((label, at, all) => all.indexOf(label) === at).slice(0, 8).map(topic).join('، ')}.`);
        return true;
      }
      case 'save': {
        if (command === 'yes') {
          const profile = rememberValues(session.filled);
          this.options.remembered?.(profile);
          this.end(profile ? 'حفظت بياناتك على هذا الجهاز للمرة الجاية. ولو تبي أمسحها قل: انسَ بياناتي.' : 'ما قدرت أحفظ على هذا الجهاز.');
          return true;
        }
        if (command === 'no') { this.end('تمام، ما حفظت شي.'); return true; }
        this.say('أحفظ بياناتك على هذا الجهاز للمرة الجاية؟ قل نعم أو لا.');
        return true;
      }
      default: return true;
    }
  }

  private say(text: string) { if (text.trim()) this.options.tell(text.trim()); }
  private field(): FormField | null { const session = this.session; return session && session.index < session.fields.length ? session.fields[session.index] : null; }
  private end(text: string) { this.cancel(); this.say(text); }
  private unwatch() { const session = this.session; if (session?.watch) { window.clearInterval(session.watch); session.watch = 0; } }

  // The current stage's words again.
  private prompt() {
    const session = this.session!;
    if (session.stage === 'review') return this.review('');
    if (session.stage === 'fix') return this.say('أي خانة تبي تعدّلها؟');
    if (session.stage === 'save') return this.say('أحفظ بياناتك على هذا الجهاز للمرة الجاية؟');
    const field = this.field();
    if (!field) return this.wrap('');
    this.say(question(field));
  }

  // Writes the way a visitor would, and keeps what was written for the read-back, for next time, and for finding the
  // field's step again.
  private write(field: FormField, written: Written) {
    const session = this.session!;
    this.options.acting?.('writing');
    if (!writeField(field, written.value, written.values)) return false;
    session.filled[field.label] = kept(field, written);
    session.steps[field.label] = session.step;
    return true;
  }

  // Asks for the field at the index. A value already there is left alone (the read-back covers it); a value remembered
  // from last time is written and said, and the next question follows in the same breath. An attachment is asked for
  // with its picker opened and the field watched until the file arrives.
  private ask(prefix: string): void {
    const session = this.session!;
    while (session.index < session.fields.length && !session.fields[session.index].element.isConnected) session.index++;
    const field = this.field();
    if (!field) return this.wrap(prefix);
    const force = session.forceAsk;
    session.forceAsk = false;
    if (!force && readField(field)) { session.index++; return this.ask(prefix); }
    revealField(field);
    if (field.kind === 'file') {
      session.stage = 'file';
      this.openPicker(field);
      this.watchFile(field);
      this.say(prefix + this.lead() + question(field));
      return;
    }
    const saved = !force && ['text', 'tel', 'email', 'textarea'].includes(field.kind) ? recall(this.options.profile(), field.label) : undefined;
    if (saved && this.write(field, { value: saved, spoken: saved })) { session.index++; return this.ask(`${prefix}حطيت ${topic(field.label)} من المرة الماضية: ${saved}. `); }
    session.stage = 'ask';
    this.say(prefix + this.lead() + question(field));
  }

  // The first field asked in a filling is introduced as the first, so the visitor hears where it begins.
  private lead() {
    const session = this.session;
    if (!session || session.opened) return '';
    session.opened = true;
    return 'أول خانة، ';
  }

  // Opens the phone's file chooser straight away where the browser allows it. It needs a recent tap: after a typed
  // answer it opens, after a spoken one it stays closed and the highlighted button is the way.
  private openPicker(field: FormField) {
    const input = field.element as HTMLInputElement & { showPicker?: () => void };
    try { if (typeof input.showPicker === 'function') input.showPicker(); else input.click(); } catch { /* no recent tap: the button is highlighted instead */ }
  }

  // Watches the attachment field until the file shows up, then carries on by itself.
  private watchFile(field: FormField) {
    const session = this.session!;
    this.unwatch();
    const stop = () => { window.clearInterval(session.watch); session.watch = 0; };
    session.watch = window.setInterval(() => {
      if (this.session !== session || session.stage !== 'file' || this.field() !== field) { stop(); return; }
      if (readField(field) === 'مرفق') { stop(); this.advance('وصل الملف، تمام. '); }
    }, 400);
  }

  // Nothing has arrived yet: the picker is opened again (where the browser allows it) and the button pointed at. A
  // required attachment is asked for until it comes; an optional one can be skipped.
  private insist(field: FormField, why: 'required' | 'missing') {
    this.openPicker(field);
    const name = topic(field.label);
    const lead = why === 'required' ? `${name} إلزامي، والنموذج ما يقبل بدونه. ` : 'ما وصلني ملف بعد. ';
    this.say(`${lead}اضغط الزر المحدد قدامك وارفع ${name}، وأنا أكمل أول ما يوصل.${field.required ? '' : ' أو قل: تخطي.'}`);
  }

  private async answer(said: string): Promise<boolean> {
    const session = this.session!, field = this.field();
    if (!field) { this.wrap(''); return true; }
    let result: Interpretation = interpret(field, said);
    // One sentence can carry several answers («اسمي خالد ورقمي…»): the other empty fields get theirs too, from the
    // local rules at once, and from the server's extractor when the sentence seems to hold more than was asked.
    const others = session.fields.filter(other => other !== field && other.element.isConnected && other.kind !== 'file' && !readField(other));
    const wanted = 'ask' in result ? [field, ...others] : others;
    let found = extractLocally(said, wanted);
    if (wanted.length && ('ask' in result || carriesMore(said, field, others))) {
      found = await extractValues(said, wanted, found);
      if (this.session !== session || this.field() !== field || session.stage !== 'ask') return true;
    }
    const extras: { field: FormField; written: Written }[] = [];
    for (const [label, raw] of Object.entries(found)) {
      const target = wanted.find(candidate => candidate.label === label);
      if (!target) continue;
      const parsed = interpret(target, raw);
      if (!('value' in parsed)) continue;
      if (target === field) result = parsed; else extras.push({ field: target, written: parsed });
    }
    if ('ask' in result) {
      // A choice that lives in another group on the page (the services groups, say) is taken there instead.
      if (field.kind === 'checkboxes') {
        const elsewhere = session.fields.map((other, index) => ({ other, index })).find(({ other }) => other !== field && other.kind === 'checkboxes' && other.element.isConnected && pickOptions(other.options || [], said).length);
        if (elsewhere) {
          const chosen = pickOptions(elsewhere.other.options || [], said);
          session.index = elsewhere.index;
          revealField(elsewhere.other);
          const labels = chosen.map(option => option.label).join('، ');
          this.write(elsewhere.other, { value: labels, spoken: labels, values: chosen.map(option => option.value) });
          await this.written();
          return true;
        }
      }
      // What was understood is kept even when the asked field is still open.
      for (const extra of extras) this.write(extra.field, extra.written);
      this.say(`${extras.length ? `كتبت ${extras.map(extra => topic(extra.field.label)).join(' و')}. ` : ''}${result.ask}`);
      return true;
    }
    if ('command' in result) { if (result.command === 'done' && field.kind === 'file') this.advance('تمام. '); else this.say(question(field)); return true; }
    if (!this.write(field, result)) { this.advance('ما قدرت أكتب في هذي الخانة، نكمل. '); return true; }
    for (const extra of extras) this.write(extra.field, extra.written);
    await this.written(extras.length ? `تم، وكتبت كمان ${extras.map(extra => topic(extra.field.label)).join(' و')}. ` : 'تم. ');
    return true;
  }

  // Written: straight on to the next field, or back to the read-back when this was a change after it.
  private async written(prefix = 'تم. ') {
    const session = this.session!;
    // The page gets a moment to show what a choice brings with it (a chosen service's own fields, say) before the next
    // field is looked for.
    await wait(80);
    if (this.session !== session) return;
    if (session.reviewing) { session.reviewing = false; await this.returnToReview(); return; }
    this.advance(prefix);
  }

  // After the read-back: a named field is changed, with its new value when it came in the same breath. A field from an
  // earlier step of the form is reached by stepping back to it first.
  private async fix(said: string): Promise<boolean> {
    const session = this.session!;
    const live = session.fields.map((field, index) => ({ label: topic(field.label), field, index })).filter(({ field }) => field.element.isConnected && field.kind !== 'file');
    let field = nameField(live, said)?.field;
    if (!field) {
      const earlier = Object.entries(session.steps).filter(([, step]) => step < session.step).map(([key, step]) => ({ label: topic(key), key, step }));
      const away = nameField(earlier, said);
      if (!away) return false;
      if (!(await this.travelTo(away.step)) || this.session !== session) return true;
      field = session.fields.find(candidate => candidate.label === away.key);
      if (!field) { this.say('ما قدرت أرجع لهذي الخانة. '); await this.returnToReview(); return true; }
    }
    session.index = session.fields.indexOf(field);
    session.reviewing = true;
    session.stage = 'ask';
    const rest = afterLabel(said, topic(field.label));
    if (rest) {
      const result = interpret(field, rest);
      if ('value' in result && this.write(field, result)) { await this.written(); return true; }
    }
    revealField(field);
    this.say(question(field));
    return true;
  }

  // On to the next field. The form is read again first: a choice can make new fields appear right after it.
  private advance(prefix: string) {
    const session = this.session!;
    this.unwatch();
    const current = this.field();
    session.fields = discoverFields();
    const at = current ? indexOf(session.fields, current.element) : -1;
    session.index = at >= 0 ? at + 1 : Math.min(session.index + 1, session.fields.length);
    session.stage = 'ask';
    this.ask(prefix);
  }

  // The end of the fields on this step: the next step is opened at once, the last step is read back.
  private wrap(prefix: string) {
    const { next, submit } = formButtons();
    if (next) { this.say(`${prefix}خلصنا خانات هذي الخطوة، ننتقل للي بعدها.`); void this.press('next'); return; }
    // «تم، خلصنا.» rather than «تم. خلصنا.» when the last field has just been written; a step that opened with
    // nothing to fill (the form's own review page) goes straight from its name to the read-back.
    if (submit) { this.review(prefix === 'تم. ' ? 'تم، خلصنا. ' : prefix.startsWith('الخطوة التالية') ? prefix : `${prefix}خلصنا. `); return; }
    this.end(`${prefix}خلصنا الخانات اللي أقدر أعبيها. راجع النموذج وأرسله بنفسك.`);
  }

  // The one read-back: everything in the form, then the yes that sends it.
  private review(lead: string) {
    const session = this.session!;
    session.stage = 'review';
    session.finalStep = session.step;
    const summary = this.summary();
    this.say(`${lead}${summary ? `راجع معي: ${summary}. ` : ''}كله مظبوط؟ قل نعم وأرسل الطلب، أو قل لي أي خانة أعدّلها.`);
  }

  // Everything written so far, across the steps, then whatever else this step holds. Dates are said by month name.
  private summary() {
    const session = this.session!;
    const entries = new Map<string, string>(Object.entries(session.filled));
    for (const field of session.fields) {
      const value = field.kind === 'file' || !field.element.isConnected ? '' : field.kind === 'date' ? describeDate(readField(field)) : readField(field);
      if (value && !entries.has(field.label)) entries.set(field.label, value);
    }
    return [...entries].map(([label, value]) => `${topic(label)}: ${value}`).join('، ');
  }

  // The field a form error is about: the one it names, the one the browser marks, or the first required one left empty.
  private faulted(form: HTMLFormElement | null, error: string) {
    const session = this.session!;
    session.fields = discoverFields();
    const live = session.fields.map((field, index) => ({ label: topic(field.label), field, index })).filter(({ field }) => field.element.isConnected);
    const named = error ? nameField(live, error) : null;
    const invalid = form?.querySelector<HTMLElement>(':invalid');
    const marked = invalid ? indexOf(session.fields, invalid) : -1;
    const empty = session.fields.findIndex(field => field.required && field.kind !== 'file' && field.element.isConnected && !readField(field));
    session.index = named ? named.index : marked >= 0 ? marked : empty >= 0 ? empty : 0;
    session.forceAsk = true;
    session.reviewing = false;
    session.stage = 'ask';
  }

  // Presses one of the form's own buttons. A field the form rejects is asked again, and the caller stops there.
  private async click(kind: 'next' | 'submit' | 'back'): Promise<{ ok: boolean; success?: string }> {
    const session = this.session!;
    // The page gets a moment to take in what was just written before its button is pressed, so the form's own handlers
    // see the new value rather than the one they were rendered with.
    await wait(80);
    if (this.session !== session) return { ok: false };
    const button = formButtons()[kind];
    if (!button) { this.end('ما لقيت الزر. أكمل من الصفحة من فضلك.'); return { ok: false }; }
    // The browser's own checks come first: a required field left empty stops the form before its handlers run.
    const form = button.form;
    if (kind !== 'back' && form && !form.noValidate && typeof form.checkValidity === 'function' && !form.checkValidity()) {
      this.faulted(form, '');
      this.ask('فيه خانة ناقصة أو غير صحيحة. ');
      return { ok: false };
    }
    const shape = () => `${stepTitle()}|${discoverFields().map(field => field.label).join(',')}`;
    const before = kind === 'next' ? shape() : '';
    session.pressing = true;
    button.click();
    if (kind === 'back') { await wait(300); session.pressing = false; session.step = Math.max(0, session.step - 1); return { ok: true }; }
    const outcome = await awaitOutcome('', kind === 'next' ? 1500 : 20000);
    session.pressing = false;
    if (this.session !== session) return { ok: false };
    if (outcome.error) { this.faulted(form, outcome.error); this.ask(`${outcome.error} `); return { ok: false }; }
    if (kind === 'next') {
      // A press that changed nothing on the page would be pressed again forever; the visitor takes over instead.
      if (shape() === before) { this.end('ما قدرت أنتقل للخطوة التالية. أكمل من الصفحة من فضلك.'); return { ok: false }; }
      session.step++;
    }
    return { ok: true, success: outcome.success };
  }

  // Next step or send, then what follows: the new step's first field, or the thanks and the offer to remember.
  private async press(kind: 'next' | 'submit') {
    const session = this.session!;
    const result = await this.click(kind);
    if (!result.ok || this.session !== session) return;
    if (kind === 'submit') {
      if (!result.success) { this.end('ضغطت إرسال. تأكد من رسالة النجاح في الصفحة، ولو ظهر خطأ قله لي.'); return; }
      if (!Object.keys(session.filled).length) { this.end(result.success); return; }
      session.stage = 'save';
      this.say(`${result.success} أحفظ بياناتك على هذا الجهاز للمرة الجاية؟`);
      return;
    }
    session.fields = discoverFields();
    session.index = 0;
    session.stage = 'ask';
    const title = stepTitle();
    this.ask(title ? `الخطوة التالية: ${title}. ` : '');
  }

  // Back through the form's steps to the one a field was written on.
  private async travelTo(step: number) {
    const session = this.session!;
    while (this.session === session && session.step > step) { const result = await this.click('back'); if (!result.ok) return false; }
    if (this.session !== session) return false;
    session.fields = discoverFields();
    return true;
  }

  // Forward again to the step the read-back happens on, then the read-back.
  private async returnToReview() {
    const session = this.session!;
    while (this.session === session && session.step < session.finalStep && formButtons().next) { const result = await this.click('next'); if (!result.ok) return; }
    if (this.session === session) this.review('تم. ');
  }
}
