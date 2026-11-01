import Anthropic from 'npm:@anthropic-ai/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Entry = { id: string; title: string; description: string; path: string; kind: string };
type Turn = { role: 'user' | 'assistant'; text: string };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
function text(value: unknown, max: number) {
  return String(value ?? '').slice(0, max);
}

const fallbackSuggestions = ['اطلب خدمة', 'سجّل كمندوب', 'النقل البري', 'عالم التقبيل', 'تواصل معنا'];

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  // The site falls back to its local matcher on 503, so a missing key degrades the assistant instead of breaking it.
  if (!apiKey) return jsonResponse({ error: 'not_configured' }, 503);

  let payload: { query?: unknown; history?: unknown; index?: unknown; pathname?: unknown; company?: { phone?: unknown; email?: unknown; headquarters?: unknown } };
  try { payload = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }
  const query = text(payload.query, 500).trim();
  if (!query) return jsonResponse({ error: 'Empty query' }, 400);
  const index: Entry[] = (Array.isArray(payload.index) ? payload.index : []).slice(0, 80)
    .map((entry: Record<string, unknown>) => ({ id: text(entry.id, 80), title: text(entry.title, 120), description: text(entry.description, 300), path: text(entry.path, 120), kind: text(entry.kind, 20) }))
    .filter(entry => entry.path.startsWith('/') && entry.title);
  const history: Turn[] = (Array.isArray(payload.history) ? payload.history : []).slice(-8)
    .filter((turn: { role?: unknown; text?: unknown }) => (turn.role === 'user' || turn.role === 'assistant') && typeof turn.text === 'string')
    .map((turn: { role: 'user' | 'assistant'; text: string }) => ({ role: turn.role, text: text(turn.text, 500) }));
  const company = { phone: text(payload.company?.phone, 40), email: text(payload.company?.email, 120), headquarters: text(payload.company?.headquarters, 200) };
  const pathname = text(payload.pathname, 120);
  const paths = [...new Set(index.map(entry => entry.path))];

  const system = [
    'أنت مساعد موقع «وعاء للخدمات اللوجستية والإدارية». مهمتك الوحيدة: مساعدة الزائر على الوصول إلى الخدمة أو الصفحة التي يحتاجها في هذا الموقع، والإجابة عن أسئلته من محتوى الموقع فقط.',
    'أجب بالعربية بأسلوب ودود ومختصر: جملة أو جملتان. إذا كتب الزائر بلهجة، جاره بلطف دون مبالغة. لا تخترع أسعارًا أو مددًا أو خدمات غير موجودة في الفهرس؛ إن لم تجد الإجابة فاقترح التواصل مع الفريق.',
    'عندما يريد الزائر الوصول إلى خدمة أو نموذج أو صفحة، استدعِ أداة navigate بالمسار المطابق من الفهرس، واكتب جملة قصيرة تخبره إلى أين أخذته. إذا كان الطلب محتملًا لأكثر من وجهة، اسأله سؤالًا واحدًا قصيرًا بدل التخمين.',
    `بيانات التواصل: الهاتف ${company.phone || 'غير متاح'}، البريد ${company.email || 'غير متاح'}، المقر ${company.headquarters || 'غير متاح'}.`,
    `الزائر الآن في الصفحة: ${pathname || '/'}.`,
    'فهرس الموقع (النوع | العنوان | الوصف | المسار):',
    ...index.map(entry => `- ${entry.kind} | ${entry.title} | ${entry.description} | ${entry.path}`),
  ].join('\n');

  const navigateTool: Anthropic.Tool = {
    name: 'navigate',
    description: 'Takes the visitor to a page of the site. Call it whenever the visitor wants to reach a service, a form, or a page; the path must be one listed in the site index.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', enum: paths.length ? paths : ['/'], description: 'Destination path from the site index' },
        title: { type: 'string', description: 'The destination title as listed in the site index' },
      },
      required: ['path', 'title'],
      additionalProperties: false,
    },
  };

  // The first message must come from the visitor; the panel's welcome line is an assistant turn and is dropped.
  const firstUser = history.findIndex(turn => turn.role === 'user');
  const messages: Anthropic.MessageParam[] = [
    ...(firstUser >= 0 ? history.slice(firstUser) : []).map(turn => ({ role: turn.role, content: turn.text })),
    { role: 'user', content: query },
  ];

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.beta.messages.create({
      model: Deno.env.get('ASSISTANT_MODEL') || 'claude-opus-5-5',
      max_tokens: 1024,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      tools: [navigateTool],
      messages,
    });
    if (response.stop_reason === 'refusal') {
      return jsonResponse({ text: 'ما أقدر أساعد في هذا الطلب، لكن أقدر أدلّك على خدمات وعاء.', suggestions: fallbackSuggestions });
    }
    let reply = '';
    let navigateTo: string | undefined;
    let title = '';
    for (const block of response.content) {
      if (block.type === 'text') reply += block.text;
      else if (block.type === 'tool_use' && block.name === 'navigate') {
        const input = block.input as { path?: string; title?: string };
        if (input.path && paths.includes(input.path)) { navigateTo = input.path; title = input.title || ''; }
      }
    }
    if (!reply.trim()) reply = navigateTo ? `أخذتك إلى ${title || 'الصفحة المطلوبة'}.` : 'كيف أقدر أساعدك؟';
    return jsonResponse({ text: reply.trim(), navigateTo });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return jsonResponse({ error: 'not_configured' }, 503);
    if (error instanceof Anthropic.RateLimitError) return jsonResponse({ error: 'rate_limited' }, 429);
    console.error('assistant failed', error);
    return jsonResponse({ error: 'assistant_failed' }, 502);
  }
});
