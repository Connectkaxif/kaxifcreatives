// index.ts – Universal AI-Advanced Character Pipeline
// Deno Deploy / Supabase Edge Function
// ------------------------------------------------------------------
// 1.  One fixed key: ak_1PK5Ss3T27UK3M98tX7cM9PV7gU1v
// 2.  Deterministic low-temperature calls (T=0.15)
// 3.  4-pass character hunt: named → pronoun → occupation → implied
// 4.  8-DNA appearance template enforced for every human
// 5.  8–25-word line splitter with fallback merger
// 6.  3-attempt retry logic for network resilience
// ------------------------------------------------------------------

import "https://deno.land/x/xhr@0.1.0/mod.ts"; // polyfill for LongCat
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/* ---------- CONFIG ---------- */
const API_KEY            = "ak_1PK5Ss3T27UK3M98tX7cM9PV7gU1v";
const LONGCAT_URL        = "https://api.longcat.chat/openai/v1/chat/completions";
const MODEL              = "LongCat-Flash-Chat";
const TEMPERATURE        = 0.15; // deterministic
const MAX_TOKENS         = 4_000;
const MIN_WORDS_PER_LINE = 8;
const MAX_WORDS_PER_LINE = 25;

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

    // --- core pipeline (parallel execution) ---
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
  try { 
    let cleanRaw = raw;
    if (cleanRaw.startsWith('```json')) {
      cleanRaw = cleanRaw.substring(7, cleanRaw.length - 3).trim();
    }
    list = JSON.parse(cleanRaw); 
  } catch (e) { 
    console.error("Failed to parse characters JSON:", e, "Raw:", raw);
    list = []; 
  }

  // ensure age inside appearance & add fallbacks
  list = list.map((c: any) => {
    // === BUG FIX: c.appeance -> c.appearance ===
    if (c.age && c.appearance && !c.appearance.includes("year old")) {
      // Inject age if missing
      c.appearance = c.appearance.replace(/^([^,]+),/, `$1, ${c.age} year old,`);
    } else if (!c.appearance) {
      // Add fallback for missing appearance
      c.appearance = `A ${c.age || 30} year old character.`;
    }
    // ===========================================
    return {
      id: crypto.randomUUID(),
      name: c.name || "Unnamed Character",
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
    let cleanRaw = raw;
    if (cleanRaw.startsWith('```json')) {
      cleanRaw = cleanRaw.substring(7, cleanRaw.length - 3).trim();
    }
    const arr: string[] = JSON.parse(cleanRaw);
    const ok = arr.filter(l => {
      if (typeof l !== 'string') return false; // Safety check
      const n = l.trim().split(/\s+/).length;
      return n >= MIN_WORDS_PER_LINE && n <= MAX_WORDS_PER_LINE;
    });
    // Use fallback if AI provides too few valid lines
    return ok.length >= 5 ? ok : fallbackMerge(text);
  } catch (e) {
    console.error("Failed to parse lines JSON:", e, "Raw:", raw);
    return fallbackMerge(text);
  }
}

/* ---------- FALLBACK MERGER (IMPROVED) ---------- */
function fallbackMerge(text: string): string[] {
  const out: string[] = [];
  const sentences = text
    .split(/[.!?]+/) // Split by sentence enders
    .map(s => s.trim())
    .filter(Boolean);

  let buffer = "";
  for (const s of sentences) {
    const combined = (buffer ? buffer + " " : "") + s;
    const wc = combined.split(/\s+/).length;

    if (wc > MAX_WORDS_PER_LINE) {
        // If adding the new sentence makes it too long, push the old buffer
        if (buffer.split(/\s+/).length >= MIN_WORDS_PER_LINE) {
            out.push(buffer);
        }
        // The new sentence might be too long, but we'll add it anyway
        buffer = s;
    } else {
        // Add to buffer
        buffer = combined;
    }
   
    // If buffer is in the sweet spot (15-25 words), push it
    if (buffer.split(/\s+/).length >= 15) {
      out.push(buffer);
      buffer = "";
    }
  }
  // Push any remaining buffer if it's valid
  if (buffer.split(/\s+/).length >= MIN_WORDS_PER_LINE) {
    out.push(buffer.trim());
  }
  
  // Final filter to ensure all lines meet spec
  return out.filter(l => {
      const n = l.split(/\s+/).length;
      return n >= MIN_WORDS_PER_LINE && n <= MAX_WORDS_PER_LINE;
  });
}

/* ---------- LOW-LEVEL AI CALL (WITH 3-ATTEMPT RETRY) ---------- */
async function callAI(prompt: string): Promise<string> {
  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: "You return only valid JSON. Be deterministic. Do not add markdown ```json wrappers." },
      { role: "user", content: prompt },
    ],
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
  };

  // === RETRY LOGIC ADDED FOR RESILIENCE ===
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
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
        // 429 (Too Many Requests) and 5xx (Server Errors) are worth retrying
        if (res.status === 429 || res.status >= 500) {
            console.warn(`AI call attempt ${attempt + 1} failed with status ${res.status}. Retrying...`);
            throw new Error(`LongCat ${res.status}: ${msg}`); // Throw to trigger retry
        }
        // Other errors (like 400, 401) are fatal, don't retry
        throw new Error(`LongCat ${res.status}: ${msg}`);
      }

      const json = await res.json();
      let content = json.choices?.[0]?.message?.content?.trim() ?? "";

      // Clean markdown just in case system prompt is ignored
      if (content.startsWith('```json')) {
        content = content.substring(7, content.length - 3).trim();
      }

      return content; // Success
      
    } catch (err: any) {
      console.error(`AI call attempt ${attempt + 1} failed:`, err.message);
      if (attempt === 2) {
         // All retries failed
         throw err; 
      }
      // Wait before retrying (1s, 2s, 3s)
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  
  throw new Error("AI call failed after 3 attempts");
  // ========================================
}
