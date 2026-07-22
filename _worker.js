const DEFAULT_MODEL = "gpt-5-mini";
const MAX_QUESTION_LENGTH = 500;
const MAX_MESSAGES = 8;
const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedBundle = null;
let cachedAt = 0;
const localRate = new Map();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function rateLimited(request) {
  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-forwarded-for") ||
    "unknown";
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const limit = 20;
  const current = localRate.get(ip);

  if (!current || now - current.started > windowMs) {
    localRate.set(ip, { started: now, count: 1 });
    return false;
  }

  current.count += 1;
  return current.count > limit;
}

async function assetJson(env, request, pathname) {
  const url = new URL(pathname, request.url);
  const response = await env.ASSETS.fetch(new Request(url.toString(), {
    headers: { accept: "application/json" }
  }));
  if (!response.ok) {
    throw new Error(`Missing content file: ${pathname} (${response.status})`);
  }
  return response.json();
}

async function loadBundle(env, request) {
  if (cachedBundle && Date.now() - cachedAt < CACHE_TTL_MS) return cachedBundle;

  const [core, rincon, conciergeConfig] = await Promise.all([
    assetJson(env, request, "/casa-amar-knowledge.json"),
    assetJson(env, request, "/rincon-rent-booking.json"),
    assetJson(env, request, "/concierge-config.json")
  ]);

  const ownerEntries = (core.entries || []).map((entry) => ({
    ...entry,
    source: entry.source || {
      id: "owner-core",
      label: "Casa Amar",
      type: "owner_core",
      priority: 100
    }
  }));

  const externalEntries = (rincon.entries || []).map((entry) => ({
    ...entry,
    source: rincon.source || {
      id: "rincon-rent-booking",
      label: "Rincón Rent",
      type: "booking_agency",
      priority: 60
    }
  }));

  cachedBundle = {
    version: core.version || "unknown",
    entries: [...ownerEntries, ...externalEntries],
    sources: [
      { id: "owner-core", label: "Casa Amar", priority: 100 },
      rincon.source
    ].filter(Boolean),
    conciergeConfig
  };
  cachedAt = Date.now();
  return cachedBundle;
}

function normaliseMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .slice(-MAX_MESSAGES)
    .filter((item) =>
      item &&
      (item.role === "user" || item.role === "assistant") &&
      typeof item.content === "string"
    )
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 1200)
    }));
}

function selectKnowledge(question, entries, limit = 8) {
  const terms = question
    .toLocaleLowerCase("da")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((term) => term.length > 2);

  return entries
    .map((entry) => {
      const haystack = [
        entry.title,
        entry.category,
        entry.answer,
        ...(entry.keywords || [])
      ].join(" ").toLocaleLowerCase("da");

      let score = 0;
      for (const term of terms) {
        if (haystack.includes(term)) score += term.length > 6 ? 3 : 1;
        if ((entry.keywords || []).some((keyword) =>
          String(keyword).toLocaleLowerCase("da").includes(term)
        )) score += 3;
      }

      const sourcePriority = Number(entry.source?.priority || 50);
      score += sourcePriority / 100;
      return { entry, score, sourcePriority };
    })
    .filter((item) => item.score > 0.5)
    .sort((a, b) =>
      (b.score - a.score) || (b.sourcePriority - a.sourcePriority)
    )
    .slice(0, limit)
    .map((item) => item.entry);
}

function knowledgeText(entries) {
  if (!entries.length) return "Ingen relevante poster blev fundet.";
  return entries.map((entry) => {
    const link = entry.links?.[0]?.url || "";
    return [
      `EMNE: ${entry.title}`,
      `KATEGORI: ${entry.category}`,
      `KILDE: ${entry.source?.label || "Casa Amar"}`,
      `PRIORITET: ${entry.source?.priority || 50}`,
      `DYNAMISK: ${entry.dynamic ? "ja" : "nej"}`,
      `FAKTA: ${entry.answer}`,
      `LINK: ${link}`
    ].join("\n");
  }).join("\n\n");
}

function extractOutputText(result) {
  const candidates = [];

  if (typeof result?.output_text === "string") {
    candidates.push(result.output_text);
  }

  for (const item of result?.output || []) {
    if (typeof item?.text === "string") candidates.push(item.text);

    for (const content of item?.content || []) {
      if (typeof content?.text === "string") candidates.push(content.text);
      if (typeof content?.output_text === "string") candidates.push(content.output_text);
      if (typeof content?.value === "string") candidates.push(content.value);
    }
  }

  function collectStrings(value, key = "") {
    if (typeof value === "string") {
      if (
        ["text", "output_text", "value", "content"].includes(key) &&
        value.trim()
      ) {
        candidates.push(value);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => collectStrings(item));
      return;
    }

    if (value && typeof value === "object") {
      for (const [childKey, childValue] of Object.entries(value)) {
        collectStrings(childValue, childKey);
      }
    }
  }

  collectStrings(result);

  return [...new Set(candidates.map((text) => text.trim()).filter(Boolean))]
    .join("\n")
    .trim();
}


function sourceLinks(entries, config) {
  const seen = new Set();
  const links = [];
  const hidden = new Set(config?.source_policy?.hidden_source_ids || []);

  for (const entry of entries || []) {
    const sourceId = entry.source?.id || "";
    if (hidden.has(sourceId)) continue;

    for (const link of entry.links || []) {
      if (!link?.url || seen.has(link.url)) continue;
      seen.add(link.url);
      links.push({
        label: link.label || entry.title || "Læs mere",
        url: link.url,
        source: entry.source?.label || "Casa Amar",
        dynamic: Boolean(entry.dynamic)
      });
    }
  }

  return links.slice(0, 2);
}

async function handleChat(request, env) {
  if (request.method === "GET") {
    return json({
      ok: true,
      service: "Casa Amar AI",
      version: "2.0-concierge",
      method: "POST"
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Metoden understøttes ikke." }, 405);
  }

  if (!sameOrigin(request)) {
    return json({ error: "Ugyldig oprindelse." }, 403);
  }

  if (rateLimited(request)) {
    return json({ error: "Der er sendt for mange spørgsmål. Prøv igen om lidt." }, 429);
  }

  if (!env.OPENAI_API_KEY) {
    return json({ error: "OPENAI_API_KEY mangler i Cloudflare." }, 503);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Ugyldig forespørgsel." }, 400);
  }

  const question = typeof payload.question === "string"
    ? payload.question.trim()
    : "";

  if (!question || question.length > MAX_QUESTION_LENGTH) {
    return json({
      error: `Spørgsmålet skal være mellem 1 og ${MAX_QUESTION_LENGTH} tegn.`
    }, 400);
  }

  try {
    const bundle = await loadBundle(env, request);
    const relevant = selectKnowledge(question, bundle.entries);
    const conversation = normaliseMessages(payload.messages);

    const instructions = `Du er Casa Amar Concierge, en varm og hjælpsom digital vært for ferieboligen Casa Amar i Cerros del Águila ved Fuengirola.

ARBEJDSMETODE:
1. Forstå først gæstens hensigt, ikke kun enkelte nøgleord.
2. Saml relevante fakta fra flere kilder til ét naturligt svar.
3. Ejerredigeret Casa Amar-viden med prioritet 100 vinder altid ved konflikt.
4. Sekundære kilder må bruges internt, men nævn eller link normalt ikke til dem.
5. Hvis spørgsmålet er for bredt eller mangler afgørende kontekst, stil ét kort opfølgende spørgsmål.
6. Gæt aldrig konkrete faciliteter, priser, tider, afstande eller regler.

SVARSTIL:
- Svar på samme sprog som gæsten.
- Skriv som en god vært, ikke som en FAQ eller søgemaskine.
- Brug 1-4 korte, sammenhængende sætninger.
- Undgå tekniske formuleringer som "ud fra vidensbasen".
- Undgå rå URL-adresser.
- Fortæl naturligt, hvad der er kendt, og spørg derefter ind, hvis det vil forbedre svaret.
- Hvis du ikke kan hjælpe sikkert, foreslå kontakt til Michael uden at lyde som en fejlmeddelelse.

Du skal returnere struktureret JSON efter det krævede schema.`;

    const input = [
      ...conversation,
      {
        role: "user",
        content:
          `GÆSTENS SPØRGSMÅL:\n${question}\n\n` +
          `RELEVANTE CASA AMAR-FAKTA:\n${knowledgeText(relevant)}`
      }
    ];

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || DEFAULT_MODEL,
        instructions,
        input: [
          ...input,
          {
            role: "developer",
            content: `CONCIERGE-KONFIGURATION:
${JSON.stringify(bundle.conciergeConfig)}`
          }
        ],
        reasoning: {
          effort: env.OPENAI_REASONING_EFFORT || "low"
        },
        text: {
          verbosity: env.OPENAI_VERBOSITY || "low",
          format: {
            type: "json_schema",
            name: "casa_amar_concierge_response",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                intent: { type: "string" },
                answer: { type: "string" },
                follow_up: { type: ["string", "null"] },
                needs_human: { type: "boolean" },
                confidence: { type: "string", enum: ["high", "medium", "low"] }
              },
              required: ["intent", "answer", "follow_up", "needs_human", "confidence"]
            }
          }
        },
        max_output_tokens: Number(env.OPENAI_MAX_OUTPUT_TOKENS || 1200),
        store: false
      })
    });

    const result = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error("OpenAI error", openaiResponse.status, result?.error?.message);
      return json({
        error: "Casa Amar AI kunne ikke hente et svar lige nu.",
        detail: result?.error?.message || "OpenAI request failed"
      }, 502);
    }

    const rawAnswer = extractOutputText(result);
    if (!rawAnswer) {
      console.error("OpenAI response without readable text", {
        id: result?.id,
        status: result?.status,
        incomplete_details: result?.incomplete_details,
        output_types: (result?.output || []).map((item) => item?.type),
        usage: result?.usage
      });

      return json({
        error: "Casa Amar AI returnerede ikke et læsbart svar.",
        detail:
          result?.incomplete_details?.reason ||
          `Status: ${result?.status || "unknown"}`
      }, 502);
    }

    let structured;
    try {
      structured = JSON.parse(rawAnswer);
    } catch {
      structured = {
        intent: "unknown",
        answer: rawAnswer,
        follow_up: null,
        needs_human: relevant.length === 0,
        confidence: relevant.length ? "medium" : "low"
      };
    }

    const sources = sourceLinks(relevant, bundle.conciergeConfig);

    return json({
      answer: structured.answer,
      followUp: structured.follow_up,
      intent: structured.intent,
      sources,
      needsHuman: structured.needs_human,
      confidence: structured.confidence,
      knowledgeVersion: bundle.version,
      sourcesLoaded: bundle.sources.map((source) => source.id),
      webSearchUsed: false,
      model: result?.model || env.OPENAI_MODEL || DEFAULT_MODEL,
      responseId: result?.id || null
    });
  } catch (error) {
    console.error("Casa Amar AI exception", error);
    return json({
      error: "Casa Amar AI er midlertidigt utilgængelig.",
      detail: String(error?.message || error)
    }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat") {
      return handleChat(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};
