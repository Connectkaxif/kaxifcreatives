// index.ts – Universal AI-Advanced Character Pipeline
// Deno Deploy / Supabase Edge Function
// ------------------------------------------------------------------
// 1.  One fixed key: ak_1PK5Ss3T27UK3M98tX7cM9PV7gU1v
// 2.  Deterministic low-temperature calls (T=0.15)
// 3.  4-pass character hunt: named → pronoun → occupation → implied
// 4.  8-DNA appearance template enforced for every human
// 5.  8–25-word line splitter with fallback merger
// ------------------------------------------------------------------

import "https://deno.land/x/xhr@0.1.0/mod.ts"; // polyfill for LongCat
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/* ---------- CONFIG ---------- */
const API_KEY              = "ak_1PK5Ss3T27UK3M98tX7cM9PV7gU1v";
const LONGCAT_URL          = "https://api.longcat.chat/openai/v1/chat/completions";
const MODEL                = "LongCat-Flash-Chat";
const TEMPERATURE          = 0.15; // deterministic
const MAX_TOKENS           = 4_000;
const MIN_WORDS_PER_LINE   = 8;
const MAX_WORDS_PER_LINE   = 25;

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ---------- MAIN HANDLER ---------- */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fullContext } = await req.json();
    if (!fullContext?.trim())
      return new Response(JSON.stringify({ success: false, error: "fullContext is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // --- core pipeline ---
    const [theme, characters, lines] = await Promise.all([
      analyzeTheme(fullContext),
      detectCharacters(fullContext),
      breakIntoLines(fullContext),
    ]);

    const stats = {
      charactersDetected:       characters.filter((c: any) => !c.isAIGenerated).length,
      unnamedCharactersCreated: characters.filter((c: any) =>  c.isAIGenerated).length,
      linesGenerated:           lines.length,
    };

    return new Response(
      JSON.stringify({ success: true, analysis: { ...theme, characters, lines, stats } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("ai-analyse crash:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

/* ---------- THEME ---------- */
async function analyzeTheme(text: string) {
  const prompt = `You are a story analyst. Return strict JSON:
{
  "theme": "short phrase e.g. Romantic Drama",
  "tone" : "2-3 adjectives e.g. melancholic, tense",
  "genre": "primary genre",
  "era"  : "time-period e.g. 1990s / Modern Day / Victorian"
}
Story:
${text}`;
  const raw = await callAI(prompt);
  try { return JSON.parse(raw); } catch { return { theme: "Drama", tone: "emotional, tense", genre: "Drama", era: "Modern Day" }; }
}

/* ---------- CHARACTER DETECTION ---------- */
async function detectCharacters(text: string) {
  const prompt = `MULTI-PASS HUMAN CHARACTER HARVEST – NEVER MISS ANYONE

Story:
${text}

Instructions (follow in order, return ONLY JSON array):

PASS-1  Extract every proper name (first/last/nick/title).
PASS-2  Map every pronoun to a human; if no name → mark UNNAMED.
PASS-3  Harvest occupations/roles ("the nurse", "a guard") → UNNAMED.
PASS-4  Capture implied humans (possessives, dialogue owner, etc).

For EACH human create:
{
  "name": "First Last" (create realistic full name if unnamed),
  "age": number (exact years),
  "appearance": "face, X year old, hair, eyes, skin, build, clothes, unique",
  "aliases": "all story references, comma separated",
  "isAIGenerated": true/false
}

Rules:
- Merge duplicates; keep most complete name.
- Every appearance string MUST contain "X year old" verbatim.
- 8-part appearance: face-shape, age, hair, eyes, skin, body, clothing, unique.
- Never return more than 50 characters.`;

  const raw  = await callAI(prompt);
  let list: any[] = [];
  try { list = JSON.parse(raw); } catch { list = []; }

  // ensure age inside appearance
  list = list.map((c: any) => {
    if (c.age && !c.appearance.includes("year old"))
      c.appearance = c.appeance.replace(/^([^,]+),/, `$1, ${c.age} year old,`);
    return {
      id: crypto.randomUUID(),
      name: c.name,
      appearance: c.appearance,
      aliases: c.aliases || "",
      locked: false,
      isAIGenerated: Boolean(c.isAIGenerated),
    };
  });

  // deterministic alpha sort
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

/* ---------- LINE SPLITTER ---------- */
async function breakIntoLines(text: string) {
  const prompt = `Convert the story into ${MIN_WORDS_PER_LINE}–${MAX_WORDS_PER_LINE}-word lines for image generation.

Story:
${text}

Rules:
1. Every line must be ${MIN_WORDS_PER_LINE}–${MAX_WORDS_PER_LINE} words.
2. Merge shorter fragments until compliant.
3. Break at scene boundaries / natural pauses.
4. Return ONLY a JSON array of strings.`;

  const raw = await callAI(prompt);
  try {
    const arr: string[] = JSON.parse(raw);
    const ok = arr.filter(l => {
      const n = l.trim().split(/\s+/).length;
      return n >= MIN_WORDS_PER_LINE && n <= MAX_WORDS_PER_LINE;
    });
    return ok.length >= 5 ? ok : fallbackMerge(text);
  } catch {
    return fallbackMerge(text);
  }
}

/* ---------- FALLBACK MERGER ---------- */
function fallbackMerge(text: string): string[] {
  const out: string[] = [];
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(Boolean);

  let buffer = "";
  for (const s of sentences) {
    buffer += (buffer ? " " : "") + s;
    const wc = buffer.split(/\s+/).length;
    if (wc >= 15) { // sweet-spot
      out.push(buffer.trim());
      buffer = "";
    }
  }
  if (buffer) out.push(buffer.trim());
  return out.filter(l => l.split(/\s+/).length >= MIN_WORDS_PER_LINE);
}

/* ---------- LOW-LEVEL AI CALL ---------- */
async function callAI(prompt: string): Promise<string> {
  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: "You return only valid JSON. Be deterministic." },
      { role: "user", content: prompt },
    ],
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
  };

  const res = await fetch(LONGCAT_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`LongCat ${res.status}: ${msg}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}
