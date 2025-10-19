// Runtime: Deno (std@0.168.0)
// Purpose: KXF CREATIVE – Advanced AI Mode (Theme/Tone → Characters+DNA → Line Prompts)

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Confirm provider host if different
const LONGCAT_URL = "https://https.api.longcat.chat/openai/v1/chat/completions";
const MODEL = "LongCat-Flash-Chat";

// --- CORS ---
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "content-type"
};

// --- API keys rotation (integrated + env) ---
const apiKeys: string[] = [
  // Integrated key (user-provided)
  "ak_1PK5Ss3T27UK3M98tX7cM9PV7gU1v"
];
for (let i = 1; i <= 10; i++) {
  const k = Deno.env.get(`LONGCAT_API_KEY_${i}`);
  if (k) apiKeys.push(k);
}
let idx = 0;
function nextKey() {
  if (!apiKeys.length) throw new Error("No API keys configured");
  const key = apiKeys[idx % apiKeys.length];
  idx++;
  return key;
}

// --- Style lock & anti-text (verbatim) ---
const STYLE_LOCK =
  'Semi-realistic 90s 2D cel animation aesthetic, bold black ink outlines exactly 3px thick, hand-painted cel shading with 2-3 flat color layers per object, matte finish, Batman: The Animated Series color palette (deep shadows #1A1A2E, vibrant reds #C1272D, blues #0077BE, yellows #FFD700), analog film grain texture at 15% opacity, 16:9 aspect ratio, rule of thirds composition, diffused studio lighting from 45-degree angle top-left, classic 90s cartoon proportions, dynamic elements like motion lines or tension lines, NO TEXT OR CAPTIONS, pure visual scene with zero typography, no letters, no words, no written language, no signs, no labels, no captions, no subtitles, no speech bubbles, no quotes, blank surfaces only.';
const ANTI_TEXT_TAIL =
  'pure visual scene with zero typography, no letters, no words, no written language, no signs, no labels, no captions, no subtitles, no speech bubbles, no quotes, blank surfaces only, focus only on character actions and environment visuals.';

// --- HTTP server ---
serve(async (req) => {
  // Preflight handling
  if (req.method === "OPTIONS") {
    const acrh = req.headers.get("Access-Control-Request-Headers");
    const headers = { ...corsHeaders };
    if (acrh) headers["Access-Control-Allow-Headers"] = acrh;
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response("Only POST allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { fullContext } = await req.json();
    if (!fullContext || typeof fullContext !== "string") {
      return json({ success: false, error: "fullContext string required" }, 400);
    }
    if (fullContext.length > 120_000) {
      return json({ success: false, error: "Context too large; please reduce script length" }, 413);
    }

    // Phase 1: Theme/Tone/Genre/Era
    const theme = await analyzeTheme(fullContext);

    // Phase 1.0b: Scene lines (deterministic)
    const lines = await splitLinesDeterministic(fullContext);

    // Phase 1.5 + 2: Characters with DNA
    const characters = await identifyCharactersWithDNA(fullContext, theme.era);

    // Phase 3: Prompts per line
    const prompts = buildPrompts(lines, characters);

    const mainCount = characters.filter(c => c.category === "main").length;
    const sideCount = characters.filter(c => c.category === "side").length;

    return json({
      success: true,
      analysis: theme,
      characters: { counts: { main: mainCount, side: sideCount, total: characters.length }, list: characters },
      lines,
      prompts
    });
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

// ---------- Helpers ----------
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function analyzeTheme(context: string) {
  const prompt = `Analyze this story and return compact JSON: {"theme":"...", "tone":"...", "genre":"...", "era":"..."}.

Story:
${context}`;
  const out = await callAI(prompt, 0.2, 300);
  try { return JSON.parse(out); }
  catch { return { theme: "Drama", tone: "Emotional, Tense", genre: "Drama", era: "Modern Day" }; }
}

async function identifyCharactersWithDNA(context: string, eraHint: string) {
  const prompt = `You are an EXPERT CHARACTER IDENTIFIER for film scripts.

GOAL: Extract EVERY HUMAN CHARACTER (named or unnamed) and output full DNA references for visual consistency in semi-realistic 90s 2D cel animation.

RULES:
- Merge aliases/mentions into one entity (e.g., "Rachel", "his wife" -> Rachel).
- If unnamed, GENERATE a realistic name; set "isAIGenerated": true.
- category: "main" if the person drives or recurs, else "side".
- Prefer era-appropriate names (hint: ${eraHint}).

OUTPUT JSON ARRAY ONLY (no commentary):
[
  {
    "name": "string",
    "category": "main|side",
    "aliases": ["array","of","strings"],
    "dna": {
      "face": "shape/jaw/cheekbones",
      "eyes": {"shape": "","hex": "#RRGGBB"},
      "hair": {"style": "","hex": "#RRGGBB"},
      "skin": {"hex": "#RRGGBB"},
      "body": {"age": 0, "height_cm": 0, "build": ""},
      "mark": "one permanent distinctive mark (location)",
      "accessory": "one signature accessory (always present)",
      "outfit": "permanent clothing/colors (always present)",
      "defaults": {"expression": "neutral|happy|concerned|angry"}
    },
    "isAIGenerated": false
  }
]

TEXT:
${context}

Return ONLY the JSON array.`;
  const raw = await callAI(prompt, 0.2, 2400);
  let arr: any[] = [];
  try { arr = JSON.parse(raw); } catch { arr = []; }

  const uniq = dedupePeople(arr).map(enforceSchema);
  uniq.sort((a, b) => (a.category === b.category ? 0 : a.category === "main" ? -1 : 1)
    || a.name.localeCompare(b.name));
  return uniq;
}

function enforceSchema(c: any) {
  const safe = (v: any, d: string) => typeof v === "string" && v.trim() ? v.trim() : d;
  const hex = (v: any, d: string) => /^#?[0-9A-Fa-f]{6}$/.test(v || "") ? (String(v).startsWith("#") ? v : "#"+v) : d;

  const dna = c.dna ?? {};
  return {
    id: crypto.randomUUID(),
    name: safe(c.name, "Unnamed Person"),
    category: c.category === "main" ? "main" : "side",
    aliases: Array.isArray(c.aliases) ? c.aliases : [],
    isAIGenerated: Boolean(c.isAIGenerated),
    dna: {
      face: safe(dna.face, "average proportions"),
      eyes: { shape: safe(dna.eyes?.shape, "average"), hex: hex(dna.eyes?.hex, "#6B4E3D") },
      hair: { style: safe(dna.hair?.style, "short"), hex: hex(dna.hair?.hex, "#111111") },
      skin: { hex: hex(dna.skin?.hex, "#C69C77") },
      body: {
        age: Number.isFinite(dna.body?.age) ? dna.body.age : 30,
        height_cm: Number.isFinite(dna.body?.height_cm) ? dna.body.height_cm : 170,
        build: safe(dna.body?.build, "average")
      },
      mark: safe(dna.mark, "no visible mark"),
      accessory: safe(dna.accessory, "simple wristwatch"),
      outfit: safe(dna.outfit, "neutral outfit"),
      defaults: { expression: safe(dna.defaults?.expression, "neutral") }
    }
  };
}

function dedupePeople(list: any[]): any[] {
  const seen = new Map<string, any>();
  const norm = (s: string) =>
    s.toLowerCase().replace(/^(dr|mr|mrs|ms)\.?\s+/i, "").replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();

  for (const p of list) {
    const base = norm(String(p?.name || ""));
    if (!base) continue;
    const keys = new Set<string>([base, ...((p.aliases || []) as string[]).map(norm), ...base.split(" ")]);
    let hit: any = undefined;
    for (const k of keys) if (seen.has(k)) { hit = seen.get(k); break; }
    if (!hit) {
      for (const k of keys) seen.set(k, p);
    } else {
      const tgt = hit;
      tgt.aliases = Array.from(new Set([...(tgt.aliases || []), ...(p.aliases || [])]));
      if (p.category === "main") tgt.category = "main";
      if (tgt.isAIGenerated && !p.isAIGenerated) { tgt.name = p.name; tgt.isAIGenerated = false; }
      tgt.dna = { ...(tgt.dna || {}), ...(p.dna || {}) };
      for (const k of keys) seen.set(k, tgt);
    }
  }
  const uniq = Array.from(new Set(Array.from(seen.values())));
  return uniq;
}

function buildPrompts(lines: string[], characters: any[]) {
  const prompts = lines.map((line, i) => {
    const cast = matchChars(line, characters);
    const sceneBlock = describeScene(line);
    const charsBlock = cast.map(c => {
      const d = c.dna;
      return `${c.name} — ${d.face}; eyes ${d.eyes.shape} ${d.eyes.hex}; hair ${d.hair.style} ${d.hair.hex}; skin ${d.skin.hex}; body ${d.body.age}y ${d.body.height_cm}cm ${d.body.build}; mark: ${d.mark}; accessory: ${d.accessory}; outfit: ${d.outfit}; expression: ${d.defaults.expression}`;
    }).join(" | ");

    return {
      index: i + 1,
      line,
      prompt:
`${STYLE_LOCK}
${sceneBlock}
${charsBlock}
${ANTI_TEXT_TAIL}`
    };
  });
  return prompts;
}

function matchChars(line: string, characters: any[]) {
  const lc = line.toLowerCase();
  const featured = characters.filter(c =>
    [c.name, ...(c.aliases || [])].some((s: string) => s && lc.includes(String(s).toLowerCase()))
  );
  if (featured.length === 0) return characters.filter(c => c.category === "main");
  const mains = featured.filter(c => c.category === "main");
  const sides = featured.filter(c => c.category === "side").slice(0, 3);
  return [...mains, ...sides];
}

function describeScene(line: string) {
  const l = line.toLowerCase();
  const time = l.match(/night|midnight|dawn|dusk|sunset|morning|noon|evening/)?.[0] ?? "unspecified time";
  const cam = l.match(/close(?:-up)?|medium|wide|overhead|low-angle|high-angle/)?.[0] ?? "medium shot";
  const atmosphere = l.match(/rain|smoke|fog|haze|neon|storm|snow/)?.[0] ?? "neutral air";
  const location = l.match(/kitchen|office|rooftop|street|alley|bedroom|hotel|train|car|park|hallway|living room/)?.[0] ?? "story location";
  return `Environment: ${location}, ${time}, ${atmosphere}; Camera: ${cam}; visual elements guided by line: "${line}".`;
}

async function splitLinesDeterministic(context: string) {
  const prompt = `Break the story into scene lines with STRICT rules:
- Every line 8–25 words (ideal 12–20).
- Merge fragments/short sentences < 8 words with neighbors.
- Deterministic by punctuation priority: . ! ? ; — then commas.
Return ONLY a JSON array of strings.

TEXT:
${context}`;
  const out = await callAI(prompt, 0.2, 2400);
  let lines: string[] = [];
  try { lines = JSON.parse(out); } catch { lines = []; }
  const ok = (s: string) => { const n = s.trim().split(/\s+/).filter(Boolean).length; return n >= 8 && n <= 25; };
  lines = Array.isArray(lines) ? lines.filter(x => typeof x === "string" && ok(x)) : [];
  if (lines.length < 3) return fallbackLineSplitting(context);
  return lines;
}

function fallbackLineSplitting(context: string): string[] {
  const paras = context.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const out: string[] = [];
  let buf = "";
  const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
  for (const p of paras) {
    if (words(p) >= 8) { if (buf) { out.push(buf); buf = ""; } out.push(p); }
    else { buf = (buf ? buf + " " : "") + p; if (words(buf) >= 12) { out.push(buf); buf = ""; } }
  }
  if (buf && words(buf) >= 8) out.push(buf);
  return out;
}

async function callAI(userPrompt: string, temperature = 0.3, maxTokens = 1200): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(LONGCAT_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${nextKey()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: "You are a deterministic JSON generator and story analyzer. Always return valid JSON without commentary." },
            { role: "user", content: userPrompt }
          ],
          temperature,
          max_tokens: maxTokens
        })
      });
      if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
      const data = await res.json();
      let content: string = data?.choices?.[0]?.message?.content ?? "";
      // Strip fenced code blocks and capture first JSON block if needed
      content = content.replace(/^``````$/g, "").trim();
      if (!(content.startsWith("{") || content.startsWith("["))) {
        const m = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (m) content = m[1];
      }
      return content;
    } catch (err) {
      if (attempt === 2) throw err;
      const delay = 500 * (attempt + 1) + Math.random() * 300;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error("All API attempts failed");
}
