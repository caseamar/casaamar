const DEFAULT_MODEL = "gpt-5-mini";
const MAX_QUESTION_LENGTH = 500;
const MAX_MESSAGES = 8;
const CACHE_TTL_MS = 30 * 1000;

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
    headers: {
      accept: "application/json",
      "cache-control": "no-cache"
    }
  }));
  if (!response.ok) {
    throw new Error(`Missing content file: ${pathname} (${response.status})`);
  }
  return response.json();
}

async function loadBundle(env, request) {
  if (cachedBundle && Date.now() - cachedAt < CACHE_TTL_MS) return cachedBundle;

  const registry = await assetJson(env, request, "/knowledge-registry.json");
  const datasets = new Map();
  const loadErrors = [];

  for (const descriptor of registry.datasets || []) {
    if (descriptor.status !== "active" && descriptor.role !== "inbox") continue;
    try {
      const data = await assetJson(env, request, descriptor.path);
      datasets.set(descriptor.id, { descriptor, data });
    } catch (error) {
      loadErrors.push({
        id: descriptor.id,
        path: descriptor.path,
        error: String(error?.message || error)
      });
    }
  }

  const knowledgeEntries = [];
  const loadedSources = [];

  for (const { descriptor, data } of datasets.values()) {
    if (descriptor.role !== "knowledge") continue;

    if (descriptor.format === "entry_collection") {
      for (const entry of data.entries || []) {
        knowledgeEntries.push({
          ...entry,
          visibility: entry.visibility || descriptor.visibility,
          trust: Number(entry.trust ?? descriptor.trust ?? 50),
          source: entry.source || descriptor.source_defaults || {
            id: descriptor.id,
            label: descriptor.label,
            type: "owner_core",
            priority: descriptor.trust || 50
          }
        });
      }
      loadedSources.push({
        id: descriptor.id,
        label: descriptor.label,
        priority: descriptor.trust
      });
    }

    if (descriptor.format === "source_snapshot") {
      for (const entry of data.entries || []) {
        knowledgeEntries.push({
          ...entry,
          visibility: entry.visibility || descriptor.visibility,
          trust: Number(entry.trust ?? descriptor.trust ?? 50),
          source: data.source || {
            id: descriptor.id,
            label: descriptor.label,
            type: "external_web",
            priority: descriptor.trust || 50
          }
        });
      }
      loadedSources.push(data.source || {
        id: descriptor.id,
        label: descriptor.label,
        priority: descriptor.trust
      });
    }
  }

  const policyData = datasets.get("concierge-policy")?.data;
  const intentData = datasets.get("concierge-intents")?.data;
  const decisionData = datasets.get("decision-policies")?.data;
  const testData = datasets.get("regression-tests")?.data;
  const inboxData = datasets.get("knowledge-inbox")?.data;

  cachedBundle = {
    version: registry.version || "unknown",
    registry,
    entries: knowledgeEntries,
    sources: loadedSources.filter(Boolean),
    conciergePolicy: policyData,
    conciergeIntents: intentData,
    decisionPolicies: decisionData,
    regressionTests: testData,
    knowledgeInbox: inboxData,
    loadErrors,
    loadedAt: new Date().toISOString()
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

function retrievalTokens(value) {
  const stopWords = new Set([
    "hvad", "hvordan", "hvor", "hvilke", "hvilken", "kan", "skal", "må",
    "jeg", "man", "der", "det", "den", "de", "til", "fra", "med", "for",
    "har", "findes", "er", "og", "eller", "ved", "om", "på", "en", "et"
  ]);

  return [...new Set(
    normaliseText(value)
      .split(/[^a-z0-9æøå]+/)
      .filter((token) => token.length >= 3 && !stopWords.has(token))
  )];
}

function expandRetrievalConcepts(question) {
  const text = normaliseText(question);
  const groups = [
    ["pool", "svømme", "bassin", "bade", "livredder", "poolkort"],
    ["parkering", "parkere", "bil", "p-plads", "parkeringsplads", "telpark"],
    ["ankomst", "komme frem", "finde huset", "adresse", "taxa", "kufferter"],
    ["barn", "børn", "baby", "babyseng", "babystol", "legeplads", "pusle"],
    ["mad", "spise", "restaurant", "takeaway", "pizza", "indkøb", "supermarked"],
    ["transport", "tog", "bus", "taxa", "lufthavn", "billeje"],
    ["aircondition", "aircon", "køling", "varme", "klimaanlæg"],
    ["affald", "skrald", "container", "sortering"],
    ["vaskemaskine", "vaske", "vaskerum", "nøgle"],
    ["golf", "golfsæt", "golfbane"],
    ["strand", "hav", "los boliches", "la cala", "solstol"]
  ];

  const expanded = [];
  for (const words of groups) {
    if (words.some((word) => text.includes(normaliseText(word)))) {
      expanded.push(...words.map(normaliseText));
    }
  }
  return [...new Set(expanded)];
}

function selectKnowledge(question, entries, limit = 6) {
  const query = normaliseText(question);
  const tokens = retrievalTokens(question);
  const concepts = expandRetrievalConcepts(question);

  return (entries || [])
    .filter((entry) =>
      entry?.status !== "archived" &&
      entry?.lifecycle?.live_status !== "draft_only" &&
      entry?.channels?.ai !== false
    )
    .map((entry) => {
      const title = normaliseText(entry.title);
      const category = normaliseText(entry.category);
      const answer = normaliseText(entry.answer || entry.summary);
      const content = normaliseText(entry.content || entry.body);
      const keywords = (entry.keywords || []).map(normaliseText);
      const allText = [title, category, answer, content, ...keywords].join(" ");

      let score = 0;
      const reasons = [];

      if (query.length >= 5 && allText.includes(query)) score += 30;

      for (const token of tokens) {
        if (title.includes(token)) {
          score += 12;
          reasons.push(`titel: ${token}`);
        }
        if (category.includes(token)) score += 5;
        if (keywords.some((keyword) => keyword.includes(token) || token.includes(keyword))) {
          score += 9;
          reasons.push(`nøgleord: ${token}`);
        }
        if (answer.includes(token)) score += 5;
        if (content.includes(token)) score += 3;
      }

      for (const concept of concepts) {
        if (title.includes(concept)) score += 5;
        if (keywords.some((keyword) => keyword.includes(concept))) score += 4;
        if (answer.includes(concept) || content.includes(concept)) score += 2;
      }

      if (entry.editorial?.review_state === "approved") score += 1.5;
      if (entry.trust >= 90) score += 1;

      return {
        entry,
        score,
        reasons: [...new Set(reasons)].slice(0, 5)
      };
    })
    .filter((item) => item.score >= 2)
    .sort((a, b) =>
      (b.score - a.score) ||
      (Number(b.entry.trust || 0) - Number(a.entry.trust || 0))
    )
    .slice(0, limit)
    .map((item) => ({
      ...item.entry,
      _retrieval_score: Math.round(item.score * 10) / 10,
      _retrieval_reasons: item.reasons
    }));
}

function knowledgeText(entries) {
  if (!entries.length) return "Ingen relevante poster blev fundet.";

  return entries.map((entry, index) => {
    const link = entry.links?.[0]?.url || "";
    const fullContent =
      entry.content ||
      entry.body ||
      entry.answer ||
      entry.summary ||
      "";

    return [
      `OBJEKT ${index + 1}: ${entry.title}`,
      `ID: ${entry.id}`,
      `KATEGORI: ${entry.category}`,
      `MATCH-SCORE: ${entry._retrieval_score || "ukendt"}`,
      `KILDE: ${entry.source?.label || "Casa Amar"}`,
      `TRUST: ${entry.trust || 50}`,
      `DYNAMISK: ${entry.dynamic ? "ja" : "nej"}`,
      `VIDEN:\n${fullContent}`,
      `KORT OPSUMMERING:\n${entry.answer || entry.summary || ""}`,
      `LINK: ${link}`
    ].join("\n");
  }).join("\n\n---\n\n");
}

function removeUnsupportedOffers(text) {
  let value = String(text || "").trim();

  const unsupportedEndingPatterns = [
    /\n*\s*Vil du have, at jeg (?:prøver at )?(?:booke|reservere|kontakte|ringe|sende|undersøge|tjekke)[^?]*\?\s*$/i,
    /\n*\s*Skal jeg (?:prøve at )?(?:booke|reservere|kontakte|ringe|sende|undersøge|tjekke)[^?]*\?\s*$/i,
    /\n*\s*Jeg kan (?:også )?(?:booke|reservere|kontakte|ringe|sende|undersøge|tjekke)[^.?!]*(?:[.?!])?\s*$/i
  ];

  for (const pattern of unsupportedEndingPatterns) {
    value = value.replace(pattern, "").trim();
  }

  return value;
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


function isContactRequest(text) {
  const value = normaliseText(text);

  const contactWords = [
    "kontakt", "kontakte", "skrive", "skriv", "mail", "email", "e-mail",
    "messenger", "besked", "tale", "snakke", "person", "nogen",
    "menneske", "henvende", "henvend", "fat i"
  ];

  const desireWords = [
    "jeg vil", "jeg vil gerne", "kan jeg", "hvordan kan jeg",
    "hvem kan jeg", "jeg ønsker", "gerne"
  ];

  const mentionsContact = contactWords.some((word) => value.includes(word));
  const expressesIntent = desireWords.some((word) => value.includes(word));

  return (
    mentionsContact &&
    (
      expressesIntent ||
      value.includes("michael") ||
      value.includes("en person") ||
      value.includes("nogen") ||
      value.includes("et menneske")
    )
  );
}

function findIntent(question, intentConfig) {
  const intents = intentConfig?.intents || [];

  if (isContactRequest(question)) {
    return intents.find((item) => item.id === "contact_human") || null;
  }
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



function policyRuleMatches(question, rule) {
  const value = normaliseText(question);
  const match = rule?.match || {};
  const normalised = (items = []) => items.map((item) => normaliseText(item));

  const exact = normalised(match.exact);
  if (exact.length && !exact.includes(value)) return false;

  const all = normalised(match.all);
  if (all.length && !all.every((item) => value.includes(item))) return false;

  const any = normalised(match.any);
  if (any.length && !any.some((item) => value.includes(item))) return false;

  const none = normalised(match.none);
  if (none.length && none.some((item) => value.includes(item))) return false;

  return Boolean(exact.length || all.length || any.length);
}

function evaluateDecisionPolicies(question, policyConfig) {
  const rules = [...(policyConfig?.rules || [])].sort(
    (a, b) => Number(b.priority || 0) - Number(a.priority || 0)
  );

  const rule = rules.find((item) => policyRuleMatches(question, item));
  if (!rule) return null;

  return {
    intent: rule.intent || "general_question",
    answer: rule.response,
    followUp: null,
    needsHuman: Boolean(rule.needsHuman),
    confidence: rule.confidence || "high",
    sources: [],
    matchedPolicy: rule.id,
    showLinks: rule.showLinks !== false
  };
}

function forceHandoffByIntent(intentId) {
  return false;
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
    needsHuman: Boolean(intent.needs_human) || forceHandoffByIntent(intent.id),
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
- Dit mål er at løse gæstens behov med færrest mulige interaktioner.
- Stil aldrig et opfølgende spørgsmål om noget, du ikke selv kan besvare bagefter.
- Hvis præcise tider, adresse, kørselsvejledning, godkendelse, pris, ledighed eller live-oplysninger mangler, så giv et kort svar og send videre til Michael.
- Hvis svaret allerede er tilstrækkeligt, må du ikke afslutte med et spørgsmål.
- Når needs_human er sand, skal follow_up være null.
- Hvis brugeren signalerer utilfredshed, siger at svaret er forkert/off, eller beder dig stoppe, skal du svare med én kort undskyldning og straks sende videre til Michael.
- Når needs_human er sand, må svaret højst være 2 korte sætninger og må ikke indeholde et opfølgende spørgsmål.
- Når du er usikker, vælg et kort svar og handoff frem for at forklare bredt.
- Brug gerne viden fra op til 3 relevante Knowledge Objects i samme svar.
- Kombinér objekterne naturligt og besvar præcis det, gæsten spørger om.
- Objekter med visibility=internal må bruges som intern AI-kontekst, når channels.ai ikke er false.
- Visibility styrer publicering af råt indhold, ikke om Concierge må bruge objektet.
- Hvis de relevante objekter indeholder svaret, må du ikke sende gæsten videre til Michael.
- Du må aldrig love eller tilbyde handlinger, som platformen ikke kan udføre.
- Du må ikke tilbyde at booke, reservere, kontakte, ringe, sende, undersøge, tjekke ledighed, tjekke åbningstider eller følge op senere.
- Undgå formuleringer som: "Vil du have, at jeg booker?", "Jeg kan undersøge", "Jeg kan tjekke", "Jeg kan kontakte dem" og lignende.
- Når spørgsmålet er besvaret, skal du stoppe. Afslut ikke automatisk med et nyt spørgsmål.
- Stil kun et opfølgende spørgsmål, når det er nødvendigt for at forstå eller besvare gæstens oprindelige behov.
- Hvis aktuelle eller dynamiske oplysninger mangler, må du kort henvise til det relevante link eller udbyderen. Du må ikke tilbyde selv at kontrollere oplysningerne.
- Vær varm, lokal, praktisk og ærlig om dine begrænsninger. Skab aha-oplevelser uden at skabe forventninger om servicefunktioner, der ikke findes.

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


async function handleStatus(request, env) {
  try {
    const bundle = await loadBundle(env, request);
    const roleCounts = {};

    for (const dataset of bundle.registry?.datasets || []) {
      roleCounts[dataset.role] = (roleCounts[dataset.role] || 0) + 1;
    }

    return json({
      ok: bundle.loadErrors.length === 0,
      service: "Casa Amar Knowledge Platform",
      version: "10.4-single-pass-page-generator",
      loadedAt: bundle.loadedAt,
      registryVersion: bundle.registry?.version || "unknown",
      datasets: (bundle.registry?.datasets || []).map((item) => ({
        id: item.id,
        label: item.label,
        role: item.role,
        status: item.status,
        trust: item.trust,
        visibility: item.visibility,
        loaded: !bundle.loadErrors.some((error) => error.id === item.id)
      })),
      counts: {
        knowledgeEntries: bundle.entries.length,
        sources: bundle.sources.length,
        tests: bundle.regressionTests?.tests?.length || 0,
        inbox: bundle.knowledgeInbox?.items?.length || 0,
        knowledgeGaps:
          bundle.registry?.datasets?.find((item) => item.id === "knowledge-gaps") ? 0 : 0,
        publisherQueue:
          bundle.registry?.datasets?.find((item) => item.id === "publisher-queue") ? 0 : 0,
        roles: roleCounts
      },
      errors: bundle.loadErrors
    });
  } catch (error) {
    return json({
      ok: false,
      service: "Casa Amar Knowledge Platform",
      error: String(error?.message || error)
    }, 500);
  }
}



function editorTokens(value) {
  return [...new Set(
    normaliseText(value)
      .split(/[^a-z0-9æøå]+/)
      .filter((token) => token.length >= 3)
  )];
}

function editorCardScore(inputText, card) {
  const input = normaliseText(inputText);
  const inputTokens = editorTokens(inputText);
  const title = normaliseText(card.title || "");
  const category = normaliseText(card.category || "");
  const keywords = (card.keywords || []).map(normaliseText);
  const summary = normaliseText(card.summary || card.answer || "");
  const body = normaliseText(card.body || card.content || "");

  let score = 0;
  const reasons = [];

  for (const token of inputTokens) {
    if (title.includes(token)) {
      score += 14;
      reasons.push(`titel matcher "${token}"`);
    }
    if (category.includes(token)) {
      score += 8;
      reasons.push(`kategori matcher "${token}"`);
    }
    if (keywords.some((keyword) => keyword.includes(token) || token.includes(keyword))) {
      score += 10;
      reasons.push(`nøgleord matcher "${token}"`);
    }
    if (summary.includes(token)) score += 4;
    if (body.includes(token)) score += 2;
  }

  const concepts = [
    ["kaffe", ["kaffe", "espresso", "nespresso", "kaffemaskine", "sage", "lelit"]],
    ["køkken", ["køkken", "ovn", "opvaskemaskine", "madlavning", "køkkenudstyr"]],
    ["pool", ["pool", "bassin", "livredder", "svømning"]],
    ["parkering", ["parkering", "bil", "telpark", "parkeringshus"]],
    ["baby", ["baby", "babyseng", "babystol", "pusleplads", "børn"]],
    ["transport", ["tog", "bus", "taxa", "billeje", "transport"]],
    ["restaurant", ["restaurant", "pizza", "tapas", "spise", "mad"]],
    ["strand", ["strand", "los boliches", "hav", "solstol"]]
  ];

  for (const [concept, words] of concepts) {
    const inputHas = words.some((word) => input.includes(word));
    const cardText = `${title} ${category} ${keywords.join(" ")} ${summary}`;
    const cardHas = words.some((word) => cardText.includes(word));
    if (inputHas && cardHas) {
      score += 18;
      reasons.push(`samme emne: ${concept}`);
    }
  }

  if (card.status === "active") score += 2;
  if (card.trust >= 90) score += 2;

  return {
    score,
    reasons: [...new Set(reasons)].slice(0, 4)
  };
}

function editorCandidates(inputText, entries, selectedIds = []) {
  const selected = new Set(selectedIds);
  return (entries || [])
    .filter((card) => card?.status !== "archived")
    .map((card) => {
      const ranked = editorCardScore(inputText, card);
      if (selected.has(card.id)) {
        ranked.score += 35;
        ranked.reasons.unshift("valgt manuelt");
      }
      return {
        id: card.id,
        title: card.title,
        category: card.category,
        summary: card.summary || card.answer || "",
        body: card.body || card.content || "",
        keywords: card.keywords || [],
        visibility: card.visibility,
        channels: card.channels,
        dynamic: Boolean(card.dynamic),
        trust: Number(card.trust || 0),
        tests: card.tests || [],
        score: ranked.score,
        match_reasons: ranked.reasons
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((candidate, index, list) => {
      const max = Math.max(list[0]?.score || 1, 1);
      return {
        ...candidate,
        match_percent: Math.max(1, Math.min(99, Math.round((candidate.score / max) * 96)))
      };
    });
}




function parseStructuredOutput(result) {
  const candidates = [
    result?.output_text,
    ...(result?.output || []).flatMap((item) => (item.content || []).map((content) => content?.text))
  ].filter(Boolean);

  for (const raw of candidates) {
    const cleaned = String(raw)
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    try { return JSON.parse(cleaned); } catch {}
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
    }
  }
  return null;
}

function normalizeSectionDraft(generated, contract, section) {
  const value = generated && typeof generated === "object" ? generated : {};
  const normalized = {
    headline: String(value.headline || ""),
    body: String(value.body || ""),
    cta_label: section?.cta?.allowed ? String(value.cta_label || "") : "",
    cards: Array.isArray(value.cards) ? value.cards : [],
    items: Array.isArray(value.items) ? value.items : [],
    image_brief: Array.isArray(value.image_brief) ? value.image_brief : [],
    knowledge_sources: Array.isArray(value.knowledge_sources) ? value.knowledge_sources : [],
    note: String(value.note || "")
  };

  for (const field of contract?.fields || []) {
    if (field.type === "fact_cards" && !normalized.items.length && normalized.cards.length) normalized.items = normalized.cards;
    if (field.type === "cards" && !normalized.cards.length && normalized.items.length) normalized.cards = normalized.items;
  }
  return normalized;
}

async function handlePageSectionGenerate(request, env) {
  if (!env.OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY mangler i Cloudflare." }, 503);

  let payload;
  try { payload = await request.json(); }
  catch { return json({ error: "Ugyldig forespørgsel." }, 400); }

  const brand = payload.brand || {};
  const blueprint = payload.blueprint || {};
  const currentContent = payload.current_content || {};
  const generationMode = payload.mode || "complete";
  const page = (blueprint.pages || []).find((item) => item.id === (payload.page_id || "home"));
  const section = page?.sections?.find((item) => item.id === payload.section_id);
  if (!page || !section) return json({ error: "Den valgte sektion findes ikke i Page Blueprint." }, 400);

  const componentLibrary = await loadJsonAsset(request, env, "/component-library.json");
  const contract = componentLibrary?.components?.[section.component] || { fields: [], copy_rules: [] };

  const bundle = await loadBundle(env, request);
  const knowledge = bundle.entries
    .filter((entry) =>
      entry?.status !== "archived" &&
      entry?.lifecycle?.live_status !== "draft_only" &&
      entry?.channels?.website !== false
    )
    .slice(0, 120)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      category: entry.category,
      content: entry.summary || entry.answer || entry.content || "",
      keywords: entry.keywords || []
    }));

  const otherSections = (currentContent.sections || [])
    .filter((item) => item.id !== section.id)
    .map((item) => ({
      id: item.id,
      headline: item.draft?.headline || item.live?.headline || "",
      body: item.draft?.body || item.live?.body || ""
    }));

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || DEFAULT_MODEL,
      instructions: `Du er senior conversion copywriter for Casa Amar.

Omskriv kun den valgte hjemmesidesektion.

REGLER:
- Brug kun fakta fra Knowledge Base.
- Teksten skal fungere som færdig, offentlig hjemmesidetekst.
- Skriv aldrig kildeangivelser, dokumenthenvisninger, interne noter, objektnavne eller formuleringer som “ifølge…”, “kilden siger…” eller “udlejningsbureauets afstandsangivelser”.
- Hvis en faktas præcision er usikker, udelad den eller skriv mere robust og naturligt; gengiv ikke usikkerheden som kildehenvisning.
- Følg sektionens formål og den fælles COMPONENT CONTRACT. Returnér præcis de felter, komponenten kræver.
- Udfyld ALLE obligatoriske felter. Hvis kontrakten kræver cards eller items, returnér præcis det angivne antal med både titel og tekst i hvert element. Ingen tomme felter.
- Praktisk information skal bruge korte selvstændige kort, hvis komponenten kræver items/fact_cards. Skriv aldrig en lang tekstmur i body som erstatning.
- Følg Casa Amars Brand Profile.
- Michael tager den indledende dialog med gæsten. Henvis aldrig direkte til Rincon, bureauets hjemmeside eller til at gæsten selv skal kontrollere priser, tider, gebyrer, bookingvilkår eller tilgængelighed.
- Undgå at gentage budskaber, der allerede står i de øvrige sektioner.
- Skriv konkret, attraktivt og troværdigt.
- Brugerens lille instruktion har høj prioritet, så længe den ikke strider mod fakta eller brand.
- Skriv på dansk.`,
      input: [{
        role: "user",
        content: `BRAND:
${JSON.stringify(brand)}

VALGT SEKTION:
${JSON.stringify(section)}

COMPONENT CONTRACT:
${JSON.stringify(contract)}

BRUGERINSTRUKTION:
${payload.instruction || "Ingen ekstra instruktion."}

NUVÆRENDE VERSION:
${JSON.stringify((currentContent.sections || []).find((item) => item.id === section.id) || {})}

ØVRIGE SEKTIONER PÅ SIDEN:
${JSON.stringify(otherSections)}

KNOWLEDGE:
${JSON.stringify(knowledge)}`
      }],
      reasoning: { effort: "medium" },
      text: {
        verbosity: "medium",
        format: {
          type: "json_schema",
          name: "casa_amar_section_draft",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              headline: { type: "string" },
              body: { type: "string" },
              cta_label: { type: "string" },
              cards: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: { title: { type: "string" }, body: { type: "string" } },
                  required: ["title", "body"]
                }
              },
              items: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: { title: { type: "string" }, body: { type: "string" } },
                  required: ["title", "body"]
                }
              },
              image_brief: { type: "array", items: { type: "string" } },
              knowledge_sources: { type: "array", items: { type: "string" } },
              note: { type: "string" }
            },
            required: ["headline", "body", "cta_label", "cards", "items", "image_brief", "knowledge_sources", "note"]
          }
        }
      },
      max_output_tokens: 1800,
      store: false
    })
  });

  const result = await response.json();
  if (!response.ok) return json({ error: result?.error?.message || "Sektionen kunne ikke genereres." }, response.status);

  let generated = parseStructuredOutput(result);

  if (!generated) {
    const retry = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || DEFAULT_MODEL,
        instructions: "Returnér kun ét gyldigt JSON-objekt. Ingen markdown og ingen forklaring.",
        input: [{ role: "user", content: JSON.stringify(result) }],
        text: { verbosity: "low" },
        max_output_tokens: 1800,
        store: false
      })
    });
    const retryResult = await retry.json();
    generated = parseStructuredOutput(retryResult);
  }

  if (!generated) return json({ error: "Sektionen kunne ikke struktureres efter automatisk genforsøg." }, 502);

  const normalized = normalizeSectionDraft(generated, contract, section);
  return json({
    section: {
      headline: normalized.headline,
      body: normalized.body,
      cta_label: normalized.cta_label,
      cards: normalized.cards,
      items: normalized.items,
      image_brief: normalized.image_brief
    },
    knowledge_sources: normalized.knowledge_sources,
    note: normalized.note
  });
}


function completeSectionFromContract(sectionDraft, contract, definition, previousDraft = {}) {
  const normalized = normalizeSectionDraft(sectionDraft, contract, definition);
  const output = {
    headline: normalized.headline || previousDraft.headline || "",
    body: normalized.body || previousDraft.body || "",
    cta_label: normalized.cta_label || previousDraft.cta_label || "",
    cards: normalized.cards || [],
    items: normalized.items || [],
    image_brief: normalized.image_brief || previousDraft.image_brief || []
  };

  for (const field of contract?.fields || []) {
    if (field.type === "cards") {
      const current = Array.isArray(output.cards) ? output.cards : [];
      output.cards = Array.from({ length: field.count || current.length || 0 }, (_, index) => {
        const item = current[index] || previousDraft.cards?.[index] || {};
        return { title: String(item.title || ""), body: String(item.body || "") };
      });
    }
    if (field.type === "fact_cards") {
      const current = Array.isArray(output.items) ? output.items : [];
      output.items = Array.from({ length: field.count || current.length || 0 }, (_, index) => {
        const item = current[index] || previousDraft.items?.[index] || {};
        return { title: String(item.title || ""), body: String(item.body || "") };
      });
    }
  }
  return output;
}

async function handlePageGenerate(request, env) {
  if (!env.OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY mangler i Cloudflare." }, 503);

  let payload;
  try { payload = await request.json(); }
  catch { return json({ error: "Ugyldig forespørgsel." }, 400); }

  const brand = payload.brand || {};
  const blueprint = payload.blueprint || {};
  const currentContent = payload.current_content || {};
  const page = (blueprint.pages || []).find((item) => item.id === (payload.page_id || "home"));
  if (!page) return json({ error: "Page Blueprint mangler den valgte side." }, 400);

  const componentLibrary = await loadJsonAsset(request, env, "/component-library.json");
  const pageContracts = Object.fromEntries(
    (page.sections || []).map((section) => [
      section.id,
      componentLibrary?.components?.[section.component] || { fields: [], copy_rules: [] }
    ])
  );

  const bundle = await loadBundle(env, request);
  const knowledge = bundle.entries
    .filter((entry) =>
      entry?.status !== "archived" &&
      entry?.lifecycle?.live_status !== "draft_only" &&
      entry?.channels?.website !== false
    )
    .slice(0, 120)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      category: entry.category,
      content: entry.summary || entry.answer || entry.content || "",
      keywords: entry.keywords || []
    }));

  const sectionSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      id: { type: "string" },
      headline: { type: "string" },
      body: { type: "string" },
      cta_label: { type: "string" },
      cards: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { title: { type: "string" }, body: { type: "string" } },
          required: ["title", "body"]
        }
      },
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { title: { type: "string" }, body: { type: "string" } },
          required: ["title", "body"]
        }
      },
      knowledge_sources: { type: "array", items: { type: "string" } },
      image_brief: { type: "array", items: { type: "string" } }
    },
    required: ["id", "headline", "body", "cta_label", "cards", "items", "knowledge_sources", "image_brief"]
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || DEFAULT_MODEL,
      instructions: `Du er senior conversion copywriter, brandredaktør og informationsarkitekt for Casa Amar.

Skriv en komplet hjemmeside som én sammenhængende fortælling. Formålet er at skabe attention, lyst, tillid og kvalificerede henvendelser – ikke blot at gengive fakta.

REGLER:
- Brug kun fakta fra Knowledge Base.
- Skriv aldrig kildeangivelser, dokumenthenvisninger, objektnavne, interne noter eller formuleringer som “ifølge…”, “kilden siger…” eller “udlejningsbureauets afstandsangivelser”.
- Omskriv fakta til naturlig, selvstændig gæstetekst.
- Følg Brand Profile og sidens kanalformål.
- Følg hver sektions formål og dens COMPONENT CONTRACT.
- Udfyld ALLE felter, som komponentkontrakten kræver. Returnér præcis det angivne antal cards eller items; ingen tomme titler eller tekster.
- Ved generationMode "fill_missing": bevar eksisterende gode tekster, men udfyld og kompletter alle manglende felter på tværs af hele siden i samme svar.
- Ved generationMode "complete": skriv hele siden samlet fra bunden som én koordineret fortælling.
- For komponenter uden cards/items skal de relevante arrays være tomme.
- Hver sektion må kun have ét primært budskab.
- Undgå gentagelser mellem sektioner. Hvis et budskab allerede er dækket, skal næste sektion tilføre en ny dimension.
- Skriv konkret og visuelt, men uden overdrivelser eller turistbrochure-klichéer.
- Hjemmesidetekst må gerne være mere emotionel end concierge-kontekst.
- CTA'er må ikke love booking, undersøgelse eller ledighed, som platformen ikke selv kan udføre.
- Michael tager den indledende dialog. Henvis aldrig direkte til Rincon, bureauets hjemmeside eller til at gæsten selv skal kontrollere priser, tider, gebyrer eller bookingvilkår.
- Skriv på dansk.
- cta_label skal være tom streng, hvis sektionen ikke tillader CTA.
- Angiv de Knowledge Object-id'er, der understøtter hver sektion.
- Angiv et kort billedbrief for hvert planlagt billedslot.`,
      input: [{
        role: "user",
        content: `BRAND PROFILE:
${JSON.stringify(brand)}

PAGE BLUEPRINT:
${JSON.stringify(page)}

COMPONENT CONTRACTS:
${JSON.stringify(pageContracts)}

GENERATION MODE:
${generationMode}

CURRENT WEBSITE CONTENT:
${JSON.stringify(currentContent)}

KNOWLEDGE:
${JSON.stringify(knowledge)}`
      }],
      reasoning: { effort: "medium" },
      text: {
        verbosity: "medium",
        format: {
          type: "json_schema",
          name: "casa_amar_page_draft",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              page_summary: { type: "string" },
              repetition_score: { type: "integer", minimum: 0, maximum: 100 },
              repetition_notes: { type: "array", items: { type: "string" } },
              sections: {
                type: "array",
                minItems: page.sections.length,
                maxItems: page.sections.length,
                items: sectionSchema
              }
            },
            required: ["page_summary", "repetition_score", "repetition_notes", "sections"]
          }
        }
      },
      max_output_tokens: 7000,
      store: false
    })
  });

  const result = await response.json();
  if (!response.ok) return json({ error: result?.error?.message || "Page Generator kunne ikke gennemføre." }, response.status);

  let generated = parseStructuredOutput(result);
  if (!generated) return json({ error: "AI returnerede et ugyldigt sideformat." }, 502);

  const previous = Array.isArray(currentContent.sections) ? currentContent.sections : [];
  const websiteContent = {
    ...currentContent,
    version: "1.1",
    updated: new Date().toISOString(),
    page_id: page.id,
    status: "draft",
    sections: page.sections.map((definition) => {
      const section = generated.sections.find((item) => item.id === definition.id) || {};
      const old = previous.find((item) => item.id === definition.id) || {};
      const contract = pageContracts[definition.id] || { fields: [] };
      const draft = completeSectionFromContract(section, contract, definition, old.draft || {});
      return {
        ...old,
        id: definition.id,
        status: "draft",
        live: old.live || null,
        draft,
        knowledge_sources: Array.isArray(section.knowledge_sources) ? section.knowledge_sources : (old.knowledge_sources || []),
        asset_ids: old.asset_ids || [],
        last_generated: new Date().toISOString()
      };
    })
  };

  return json({
    website_content: websiteContent,
    quality: {
      repetition_score: generated.repetition_score,
      repetition_notes: generated.repetition_notes,
      page_summary: generated.page_summary
    }
  });
}

async function handleKnowledgeSuggest(request, env) {
  if (request.method !== "POST") return json({ error: "Metoden understøttes ikke." }, 405);
  if (!sameOrigin(request)) return json({ error: "Ugyldig oprindelse." }, 403);
  if (rateLimited(request)) return json({ error: "Der er sendt for mange forespørgsler. Prøv igen om lidt." }, 429);
  if (!env.OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY mangler i Cloudflare." }, 503);

  let payload;
  try { payload = await request.json(); }
  catch { return json({ error: "Ugyldig forespørgsel." }, 400); }

  const inputText = String(payload.input || "").trim();
  const selectedIds = Array.isArray(payload.selected_ids)
    ? payload.selected_ids.map(String).slice(0, 20)
    : [];

  if (!inputText || inputText.length > 16000) {
    return json({ error: "Indholdet skal være mellem 1 og 16.000 tegn." }, 400);
  }

  const bundle = await loadBundle(env, request);
  const candidates = editorCandidates(inputText, bundle.entries, selectedIds);
  const candidateContext = candidates.slice(0, 10).map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    category: candidate.category,
    current_content: candidate.summary,
    keywords: candidate.keywords,
    tests: candidate.tests,
    match_percent: candidate.match_percent,
    match_reasons: candidate.match_reasons
  }));

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || DEFAULT_MODEL,
      instructions: `Du er Knowledge Manager for Casa Amar.

Michael skriver frit og detaljeret. Han skal ikke administrere Knowledge Objects manuelt.

Din opgave:
1. Forstå alt relevant indhold.
2. Fordel alt relevant indhold på 1-3 fokuserede Knowledge Objects. Brug flere objekter, når inputtet indeholder flere selvstændige emner.
3. Opdater gerne flere eksisterende objekter fra samme input, når forskellige dele af inputtet hører hjemme forskellige steder.
4. Opret nye objekter, når et eksisterende objekt ellers bliver for bredt, eller når emnet ikke findes.
5. Bevar alle eksisterende korrekte fakta. Slet aldrig viden.
6. Ved modstridende oplysninger: brug handlingen review.
7. Undgå brede samleobjekter. Objekter skal være fokuserede og genbrugelige.
8. Concierge må senere kombinere op til 3 relevante objekter i ét svar.
9. Returnér en samlet plan med 1-3 operationer. Undlad ikke relevant information blot for at holde antallet nede.
10. Hver operation skal angive de konkrete dele af brugerens input, som hører til objektet.
11. Undgå at lægge samme faktum ind i flere objekter, medmindre faktummet reelt er nødvendigt begge steder.
12. Links er kun referencer. Gæt aldrig indhold bag et link.
13. Svar på dansk og hold begrundelser korte.

Handlinger:
- update: udvid et eksisterende objekt.
- create: opret et nyt fokuseret objekt.
- review: der er konflikt eller væsentlig usikkerhed.`,
      input: [{
        role: "user",
        content: `NYT INDHOLD:
${inputText}

KANDIDATER:
${JSON.stringify(candidateContext)}`
      }],
      reasoning: { effort: "low" },
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "knowledge_manager_plan",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string" },
              confidence: { type: "integer", minimum: 0, maximum: 100 },
              review_required: { type: "boolean" },
              structure_reason: { type: "string" },
              operations: {
                type: "array",
                minItems: 1,
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    action: { type: "string", enum: ["update", "create", "review"] },
                    card_id: { type: ["string", "null"] },
                    title: { type: "string" },
                    category: { type: "string" },
                    before_content: { type: "string" },
                    final_content: { type: "string" },
                    reason: { type: "string" },
                    changed_facts: { type: "array", items: { type: "string" } },
                    source_excerpts: { type: "array", items: { type: "string" } },
                    suggested_relations: { type: "array", items: { type: "string" } },
                    suggested_tests: { type: "array", items: { type: "string" } }
                  },
                  required: [
                    "action","card_id","title","category","before_content",
                    "final_content","reason","changed_facts","source_excerpts",
                    "suggested_relations","suggested_tests"
                  ]
                }
              }
            },
            required: ["summary","confidence","review_required","structure_reason","operations"]
          }
        }
      },
      max_output_tokens: 3200,
      store: false
    })
  });

  const result = await response.json();
  if (!response.ok) {
    return json({
      error: "Knowledge Manager kunne ikke generere en plan.",
      detail: result?.error?.message || "OpenAI request failed"
    }, 502);
  }

  const raw = extractOutputText(result);
  if (!raw) return json({ error: "Knowledge Manager returnerede ikke en læsbar plan." }, 502);

  try {
    const parsed = JSON.parse(raw);
    return json({
      ...parsed,
      candidates: candidates.slice(0, 6).map((candidate) => ({
        card_id: candidate.id,
        title: candidate.title,
        category: candidate.category,
        match_score: candidate.match_percent,
        reason: candidate.match_reasons.join(" · ")
      }))
    });
  } catch {
    return json({
      summary: raw,
      confidence: 0,
      review_required: true,
      structure_reason: "Svaret kunne ikke struktureres.",
      operations: [],
      candidates: candidates.slice(0, 6)
    });
  }
}


async function planKnowledgeSearch(question, env) {
  const fallback = {
    intent: "general",
    search_terms: retrievalTokens(question),
    related_concepts: expandRetrievalConcepts(question),
    rewritten_query: question,
    confidence: 0
  };

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: env.OPENAI_SEARCH_MODEL || env.OPENAI_MODEL || DEFAULT_MODEL,
        instructions: `Du er søgeplanlægger for Casa Amar Knowledge Base.

Omskriv gæstens spørgsmål til de bedste søgebegreber for en dansk feriebolig-concierge.

Regler:
- Bevar betydningen.
- Udvid med naturlige synonymer og beslægtede begreber.
- Tilføj lokale eller faglige termer, når de er oplagte.
- Brug ikke fakta, som ikke allerede ligger i spørgsmålet.
- Returnér højst 10 søgetermer og højst 6 relaterede begreber.
- Eksempel: "kan man ligesom vinsmagning smage olivenolie" bør give begreber som olivenoliesmagning, olivenolie, oleoturisme, olivenmølle og tasting.
- Svar kun i det krævede JSON-format.`,
        input: [{ role: "user", content: question }],
        reasoning: { effort: "low" },
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "knowledge_search_plan",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                intent: { type: "string" },
                rewritten_query: { type: "string" },
                search_terms: {
                  type: "array",
                  maxItems: 10,
                  items: { type: "string" }
                },
                related_concepts: {
                  type: "array",
                  maxItems: 6,
                  items: { type: "string" }
                },
                confidence: {
                  type: "integer",
                  minimum: 0,
                  maximum: 100
                }
              },
              required: [
                "intent", "rewritten_query", "search_terms",
                "related_concepts", "confidence"
              ]
            }
          }
        },
        max_output_tokens: 500,
        store: false
      })
    });

    const result = await response.json();
    if (!response.ok) return fallback;

    const raw = extractOutputText(result);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    return {
      intent: String(parsed.intent || "general"),
      rewritten_query: String(parsed.rewritten_query || question),
      search_terms: Array.isArray(parsed.search_terms)
        ? parsed.search_terms.map(String).slice(0, 10)
        : fallback.search_terms,
      related_concepts: Array.isArray(parsed.related_concepts)
        ? parsed.related_concepts.map(String).slice(0, 6)
        : fallback.related_concepts,
      confidence: Number(parsed.confidence || 0)
    };
  } catch (error) {
    console.warn("Knowledge search planner fallback", error);
    return fallback;
  }
}

function searchPlanText(question, plan) {
  return [
    question,
    plan?.rewritten_query || "",
    ...(plan?.search_terms || []),
    ...(plan?.related_concepts || [])
  ].filter(Boolean).join(" ");
}

async function handleChat(request, env) {
  if (request.method === "GET") {
    return json({
      ok: true,
      service: "Casa Amar AI",
      version: "9.2-live-draft-model",
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
    const policyDecision = evaluateDecisionPolicies(question, bundle.decisionPolicies);
    const deterministic = policyDecision || deterministicRoute(question, bundle);

    // Only genuinely hard routes may bypass the Knowledge Base.
    // The old code also returned the generic fallback here, so retrieval never ran.
    const genericDeterministicIntents = new Set([
      "general_question",
      "general",
      "fallback",
      "unknown"
    ]);

    const hardDeterministic = Boolean(
      deterministic &&
      !genericDeterministicIntents.has(String(deterministic.intent || "").toLowerCase())
    );

    if (hardDeterministic) {
      return json({
        ...deterministic,
        knowledgeVersion: bundle.version,
        sourcesLoaded: bundle.sources.map((source) => source.id),
        webSearchUsed: false,
        model: policyDecision ? "decision-policy-engine" : "deterministic-policy",
        matchedPolicy: deterministic.matchedPolicy || null,
        responseId: null,
        pipeline: {
          route: "hard_deterministic",
          planner: { status: "skipped" },
          retrieval: { status: "skipped", count: 0 },
          generation: { status: "skipped" }
        },
        searchPlan: null,
        knowledgeMatches: []
      });
    }

    const searchPlan = await planKnowledgeSearch(question, env);
    const retrievalQuery = searchPlanText(question, searchPlan);
    const relevant = selectKnowledge(retrievalQuery, bundle.entries);
    const conversation = normaliseMessages(payload.messages);

    // A generic deterministic response is now only a true fallback after retrieval.
    if (relevant.length === 0 && deterministic) {
      return json({
        ...deterministic,
        knowledgeVersion: bundle.version,
        sourcesLoaded: bundle.sources.map((source) => source.id),
        webSearchUsed: false,
        model: "deterministic-fallback-after-retrieval",
        matchedPolicy: deterministic.matchedPolicy || null,
        responseId: null,
        pipeline: {
          route: "fallback_after_retrieval",
          planner: {
            status: "completed",
            confidence: searchPlan.confidence
          },
          retrieval: {
            status: "completed",
            count: 0,
            query: retrievalQuery
          },
          generation: { status: "skipped" }
        },
        searchPlan: {
          intent: searchPlan.intent,
          terms: searchPlan.search_terms,
          concepts: searchPlan.related_concepts,
          confidence: searchPlan.confidence
        },
        knowledgeMatches: []
      });
    }

    const instructions = buildSystemInstructions(bundle.conciergePolicy);

    const input = [
      ...conversation,
      {
        role: "user",
        content:
          `GÆSTENS SPØRGSMÅL:\n${question}\n\n` +
          `AI-SØGEPLAN:\n${JSON.stringify(searchPlan)}\n\n` +
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

    structured.answer = removeUnsupportedOffers(structured.answer);
    structured.follow_up = removeUnsupportedOffers(structured.follow_up);

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
      /kan ikke bekræfte|har ikke præcise oplysninger|kontakt michael|skriv til michael|michael hjælper|har ikke adgang/i.test(
        structured.answer || ""
      );

    const needsHuman =
      Boolean(structured.needs_human) ||
      structured.confidence === "low" ||
      answerSignalsMissingInfo ||
      (alreadyAsked && Boolean(structured.follow_up));

    const answerNeedsConfirmation =
      /kan bekræftes|præcise tider|præcis adresse|kørselsvejledning|godkendelse|ledighed|pris/i.test(
        structured.answer || ""
      );

    const unsupportedFollowUp =
      /booke|reservere|kontakte|ringe|sende|undersøge|tjekke|følge op/i.test(
        followUp || ""
      );

    if (needsHuman || answerNeedsConfirmation || unsupportedFollowUp) {
      followUp = null;
    }

    if (
      structured.answer.endsWith("?") &&
      (needsHuman || answerNeedsConfirmation || structured.confidence !== "high")
    ) {
      structured.answer = structured.answer.replace(/[?]+$/, ".");
    }

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
      responseId: result?.id || null,
      searchPlan: {
        intent: searchPlan.intent,
        terms: searchPlan.search_terms,
        concepts: searchPlan.related_concepts,
        confidence: searchPlan.confidence
      },
      knowledgeMatches: relevant.map((entry) => ({
        id: entry.id,
        title: entry.title,
        score: entry._retrieval_score || null
      })),
      pipeline: {
        route: "knowledge_generation",
        planner: {
          status: "completed",
          confidence: searchPlan.confidence,
          terms: searchPlan.search_terms.length,
          concepts: searchPlan.related_concepts.length
        },
        retrieval: {
          status: "completed",
          count: relevant.length,
          query: retrievalQuery
        },
        generation: {
          status: "completed",
          model: result?.model || env.OPENAI_MODEL || DEFAULT_MODEL
        }
      }
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

    if (url.pathname === "/api/status") {
      return handleStatus(request, env);
    }

    if (url.pathname === "/api/knowledge-suggest") {
      return handleKnowledgeSuggest(request, env);
    }

    if (url.pathname === "/api/page-generate") {
      return handlePageGenerate(request, env);
    }

    if (url.pathname === "/api/page-section-generate") {
      return handlePageSectionGenerate(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};
