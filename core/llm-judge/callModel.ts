// Chamador de LLM compartilhado entre judge.ts e core/specialists/*.ts — mesma
// convenção dual-provider do sales-engine (ADVISOR_MODEL): prefixo "claude-" usa
// Anthropic, senão OpenAI. Espera resposta em JSON (response_format json_object na
// OpenAI; para Claude, o prompt precisa instruir explicitamente "responda só JSON").
export async function callModelForJson(prompt: string, model: string, maxTokens = 800): Promise<string> {
  if (model.startsWith('claude-')) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });
    return res.content[0]?.type === 'text' ? res.content[0].text : '';
  }

  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
  });
  return res.choices[0]?.message?.content ?? '';
}

export function parseJsonResponse<T>(raw: string, context: string): T {
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`[${context}] resposta do modelo não é JSON válido: ${raw.slice(0, 300)}`);
  }
}
