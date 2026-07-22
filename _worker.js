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

  const [core, rincon, conciergePolicy, conciergeIntents] = await Promise.all([
    assetJson(env, request, "/casa-amar-knowledge.json"),
    assetJson(env, request, "/rincon-rent-booking.json"),
    assetJson(env, request, "/concierge-policy.json"),
    assetJson(env, request, "/concierge-intents.json")
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
    conciergePolicy,
    conciergeIntents
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




function normaliseText(value) {
  return String(value || "")
    .toLocaleLowerCase("da")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function matchesPattern(text, patterns = []) {
  const normalised = normaliseText(text);
  return patterns.some((pattern) =>
    normalised.includes(normaliseText(pattern))
  );
}

function findIntent(question, intentConfig) {
  const intents = intentConfig?.intents || [];
  for (const intentId of intentConfig?.routing_order || []) {
    const intent = intents.find((item) => item.id === intentId);
    if (!intent || !intent.patterns?.length) continue;
    if (matchesPattern(question, intent.patterns)) return intent;
  }
  return intents.find((item) => item.id === "general_question") || {
    id: "general_question",
    deterministic: false
  };
}

function smalltalkResponse(question, intent) {
  const text = normaliseText(question);
  if (text.includes("tak")) return intent.responses?.thanks || "Velbekomme.";
  if (
    text.includes("glæder") ||
    text.includes("lyder godt") ||
    text.includes("perfekt") ||
    text.includes("super") ||
    text.includes("fedt")
  ) {
    return intent.responses?.positive || "Det lyder dejligt.";
  }
  return intent.responses?.greeting ||
    "Hej og velkommen. Jeg hjælper gerne med Casa Amar og jeres ophold.";
}

function deterministicRoute(question, bundle) {
  const intent = findIntent(question, bundle.conciergeIntents);
  if (!intent?.deterministic) return null;

  if (intent.id === "smalltalk") {
    return {
      intent: intent.id,
      answer: smalltalkResponse(question, intent),
      followUp: null,
      needsHuman: false,
      confidence: "high",
      sources: []
    };
  }

  let answer = intent.response || "";
  if (intent.response_from_policy === "scope.restricted_response") {
    answer = bundle.conciergePolicy?.scope?.restricted_response || answer;
  }

  return {
    intent: intent.id,
    answer,
    followUp: null,
    needsHuman: Boolean(intent.needs_human),
    confidence: "high",
    sources: []
  };
}

function buildSystemInstructions(policy) {
  const allowed = (policy?.scope?.allowed || []).map((item) => `- ${item}`).join("\n");
  const restricted = (policy?.scope?.restricted || []).map((item) => `- ${item}`).join("\n");
  const followUpRules = (
    policy?.dialog_policy?.follow_up_allowed_only_if || []
  ).map((item) => `- ${item}`).join("\n");
  const neverRules = (policy?.dialog_policy?.never || []).map(
    (item) => `- ${item}`
  ).join("\n");
  const knowledgeRules = (policy?.knowledge_policy?.rules || []).map(
    (item) => `- ${item}`
  ).join("\n");

  return `Du er ${policy?.role?.name || "Casa Amar Concierge"}.
${policy?.role?.description || ""}

MISSION:
${policy?.role?.mission || ""}

TONE:
${(policy?.tone?.qualities || []).join(", ")}.
Undgå: ${(policy?.tone?.avoid || []).join(", ")}.

DU HJÆLPER MED:
${allowed}

UDEN FOR SCOPE:
${restricted}

DIALOGPOLITIK:
${policy?.dialog_policy?.primary_rule || "Svar først. Spørg sjældent."}
Stil højst ${policy?.dialog_policy?.max_follow_up_questions_per_topic || 1} opfølgende spørgsmål pr. emne.
Et opfølgende spørgsmål er kun tilladt, hvis alle disse forhold er opfyldt:
${followUpRules}

DU MÅ ALDRIG:
${neverRules}

KILDER:
${knowledgeRules}

SVAR:
- ${policy?.response_policy?.language || "Svar på samme sprog som brugeren."}
- ${policy?.response_policy?.length || "Svar kort."}
- ${policy?.response_policy?.links || "Undgå rå URL-adresser."}
- Smalltalk: ${policy?.response_policy?.smalltalk || "Svar kort og varmt."}
- Fallback: ${policy?.response_policy?.fallback || "Send videre til Michael."}
- Hvis brugeren signalerer utilfredshed, siger at svaret er forkert/off, eller beder dig stoppe, skal du svare med én kort undskyldning og straks sende videre til Michael.
- Når needs_human er sand, må svaret højst være 2 korte sætninger og må ikke indeholde et opfølgende spørgsmål.
- Når du er usikker, vælg et kort svar og handoff frem for at forklare bredt.

Returnér altid struktureret JSON efter det krævede schema.`;
}

function recentAssistantQuestion(messages) {
  return (messages || []).slice(-4).some(
    (item) =>
      item?.role === "assistant" &&
      typeof item.content === "string" &&
      item.content.trim().endsWith("?")
  );
}

function sourceLinks(entries, config) {
  const seen = new Set();
  const links = [];
  const hidden = new Set(["rincon-rent-booking"]);

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
      version: "3.0.2-policy",
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
    const deterministic = deterministicRoute(question, bundle);

    if (deterministic) {
      return json({
        ...deterministic,
        knowledgeVersion: bundle.version,
        sourcesLoaded: bundle.sources.map((source) => source.id),
        webSearchUsed: false,
        model: "deterministic-policy",
        responseId: null
      });
    }

    const relevant = selectKnowledge(question, bundle.entries);
    const conversation = normaliseMessages(payload.messages);

    const instructions = buildSystemInstructions(bundle.conciergePolicy);

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
${JSON.stringify({
  policy: bundle.conciergePolicy,
  intents: bundle.conciergeIntents
})}`
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

    const alreadyAsked = recentAssistantQuestion(conversation);
    let followUp = structured.follow_up;

    const compactAnswer = String(structured.answer || "")
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean)
      .slice(0, structured.needs_human ? 2 : 4)
      .join(" ")
      .trim();

    structured.answer = compactAnswer || "Michael hjælper gerne videre.";

    if (
      alreadyAsked ||
      structured.confidence !== "high" ||
      !followUp ||
      followUp.length > 140
    ) {
      followUp = null;
    }

    const answerSignalsMissingInfo =
      /kan ikke bekræfte|har ikke præcise oplysninger|kontakt michael|skriv til michael/i.test(
        structured.answer || ""
      );

    const needsHuman =
      Boolean(structured.needs_human) ||
      structured.confidence === "low" ||
      answerSignalsMissingInfo ||
      (alreadyAsked && Boolean(structured.follow_up));

    const sources = sourceLinks(relevant, bundle.conciergePolicy);

    return json({
      answer: structured.answer,
      followUp,
      intent: structured.intent,
      sources,
      needsHuman,
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
