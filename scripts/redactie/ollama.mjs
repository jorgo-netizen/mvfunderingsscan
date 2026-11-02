/**
 * Ollama (lokaal AI-model) aanroepen met een vast JSON-schema als antwoord.
 * Andere modellen of aanbieders toevoegen: maak een functie met dezelfde vorm als vraagJson().
 */
export async function ollamaBeschikbaar(basis, model) {
  try {
    const r = await fetch(`${basis}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return { ok: false, reden: `Ollama antwoordt met ${r.status}` };
    const tags = (await r.json()).models || [];
    if (!tags.some((m) => m.name === model || m.name === `${model}:latest`)) return { ok: false, reden: `Model "${model}" is niet geïnstalleerd. Voer uit: ollama pull ${model}` };
    return { ok: true };
  } catch { return { ok: false, reden: `Ollama is niet bereikbaar op ${basis}. Start Ollama of installeer het via ollama.com.` }; }
}

/** Stuurt systeem- en gebruikersprompt en verwacht JSON volgens `schema` (Ollama structured outputs). */
export async function vraagJson({ basis, model, systeem, prompt, schema, temperatuur = 0.4, timeoutMs = 20 * 60e3 }) {
  const r = await fetch(`${basis}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, stream: false, format: schema, options: { temperature: temperatuur, num_ctx: 16384 }, messages: [{ role: 'system', content: systeem }, { role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error(`Ollama ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const inhoud = (await r.json()).message?.content || '';
  try { return JSON.parse(inhoud); } catch { throw new Error('Het model gaf geen geldige JSON terug.'); }
}
