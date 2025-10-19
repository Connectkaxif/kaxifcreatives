import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Load API keys
const apiKeys: string[] = [
  'ak_1PK5Ss3T27UK3M98tX7cM9PV7gU1v' // Hardcoded API key
];
for (let i = 1; i <= 10; i++) {
  const key = Deno.env.get(`LONGCAT_API_KEY_${i}`);
  if (key) apiKeys.push(key);
}
let currentKeyIndex = 0;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fullContext } = await req.json();

    if (!fullContext) {
      return new Response(
        JSON.stringify({ success: false, error: 'Full context is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting AI analysis...');

    // Step 1: Analyze story for theme and tone
    const themeAnalysis = await analyzeTheme(fullContext);
    
    // Step 2: Detect characters (NEW PROMPT - NO EXAMPLES)
    const characters = await detectCharacters(fullContext);
    
    // Step 3: Break script into lines (8+ words minimum)
    const lines = await breakIntoLines(fullContext);

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          theme: themeAnalysis.theme,
          tone: themeAnalysis.tone,
          genre: themeAnalysis.genre,
          era: themeAnalysis.era,
          characters: characters,
          lines: lines,
          stats: {
            charactersDetected: characters.filter((c: any) => !c.isAIGenerated).length,
            unnamedCharactersCreated: characters.filter((c: any) => c.isAIGenerated).length,
            linesGenerated: lines.length
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-analyse:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzeTheme(context: string) {
  const prompt = `Analyze this story and identify:
1. Main theme (one short phrase, e.g., "Romantic Drama", "Psychological Thriller")
2. Tone (2-3 adjectives, e.g., "Melancholic, Emotional", "Tense, Suspenseful")
3. Genre (e.g., "Drama", "Thriller", "Romance")
4. Era/Time period (e.g., "1990s", "Modern Day", "Historical")

Story:
${context}

Respond in JSON format:
{
  "theme": "...",
  "tone": "...",
  "genre": "...",
  "era": "..."
}`;

  const analysis = await callAI(prompt);
  try {
    return JSON.parse(analysis);
  } catch {
    return {
      theme: "Drama",
      tone: "Emotional, Tense",
      genre: "Drama",
      era: "Modern Day"
    };
  }
}

// === FUNCTION MODIFIED - EXAMPLES REMOVED ===
async function detectCharacters(context: string) {
  // This prompt is now radically simplified and contains NO examples
  // to prevent the AI from copying them.
  const prompt = `# CRITICAL MISSION: EXTRACT CHARACTERS
You are an AI story analyst. You MUST read the "STORY" provided below and extract ALL human characters.

# INSTRUCTIONS:
1.  **READ THE STORY FIRST.** Your primary goal is to find characters EXPLICITLY named in the story (e.g., "Rachel", "Michael").
2.  **FIND UNNAMED.** Also find characters mentioned only by roles ("the doctor"), relationships ("his brother"), or pronouns ("she" if it's a new person).
3.  **FOR UNNAMED ONLY:** If a character is unnamed ("the doctor"), you MUST invent a realistic name (e.g., "Dr. Evan Reed").
4.  **CREATE JSON:** For EACH character, create a JSON object with:
    * `"name"`: The character's *real name* from the story (or the one you invented for unnamed characters).
    * `"appearance"`: A simple, 1-2 sentence description based on the story's context. (e.g., "A 34-year-old woman, heartbroken and contemplating her marriage.")
    * `"aliases"`: Other names or roles they are called (e.g., "his wife", "Mike").
    * `"role"`: "main" or "side".
    * `"isAIGenerated"`: \`false\` if the name was in the story, \`true\` if you invented it.
5.  **NO DUPLICATES:** "Rachel" and "his wife" are ONE person. Merge them.

# CRITICAL OUTPUT FORMAT:
You MUST respond ONLY with a valid JSON array. DO NOT add any text, explanation, or markdown backticks before or after the JSON.

# STORY:
${context}

# YOUR JSON RESPONSE:
[
  ...
]`;

  let response = ""; // Define response here to be available in catch block
  try {
    response = await callAI(prompt);
    
    // Add logging to see what the AI is sending back
    console.log('Raw AI response for characters:', response);
    
    const chars = JSON.parse(response);
    
    // Deduplicate characters
    const uniqueChars = deduplicateCharacters(chars);
    
    // Validate all characters have required fields
    return uniqueChars
      .map((c: any) => {
        // Fallback for missing appearance
        if (!c.appearance) {
          console.warn(`AI failed to generate appearance for ${c.name}. Adding fallback.`);
          c.appearance = `A ${c.role || 'side'} character from the story.`;
        }

        return {
          id: crypto.randomUUID(),
          name: c.name,
          appearance: c.appearance, // This field should now be populated
          aliases: c.aliases || "",
          role: c.role || 'side',
          locked: false,
          isAIGenerated: c.isAIGenerated || false
        };
      })
      .sort((a: any, b: any) => a.name.localeCompare(b.name)); // Sort alphabetically
  } catch (error) {
    console.error('Character JSON parsing failed! AI response was likely invalid JSON.', error);
    console.error('FAILED RAW RESPONSE:', response); // Log the raw response for debugging
    return []; // Return empty array on failure
  }
}
// === END OF MODIFIED FUNCTION ===

function deduplicateCharacters(characters: any[]): any[] {
  // Add safety check in case AI returns non-array
  if (!Array.isArray(characters)) {
    console.error('Deduplication input is not an array:', characters);
    return [];
  }

  const unique: any[] = [];
  const seen = new Set<string>();
  
  for (const char of characters) {
    if (!char || typeof char.name !== 'string') {
      console.warn('Skipping invalid character object:', char);
      continue; // Skip invalid entries
    }
    
    const normalized = char.name.toLowerCase().trim();
    
    // Generate aliases for matching
    const aliases = [
      normalized,
      normalized.replace(/^(dr|mr|ms|mrs)\.?\s+/i, ''), // Remove titles
      ...normalized.split(' '), // Individual name parts
    ];
    
    // Check if any alias already seen
    const isDuplicate = aliases.some(alias => seen.has(alias));
    
    if (!isDuplicate) {
      seen.add(normalized);
      // Also add all aliases to seen set
      aliases.forEach(alias => seen.add(alias));
      unique.push(char);
    }
  }
  
  return unique;
}

async function breakIntoLines(context: string) {
  const prompt = `Break this story into scene lines for image generation.

ULTRA-STRICT RULES (ABSOLUTE REQUIREMENTS):

1. MINIMUM 8 WORDS PER LINE - NO EXCEPTIONS
   - Every single line MUST have at least 8 words
   - Lines with fewer than 8 words are FORBIDDEN

2. MANDATORY MERGING PHASE (Do this FIRST):
   - Identify ALL sentences under 8 words
   - Merge EVERY short sentence with adjacent text
   - Continue merging until ZERO sentences remain under 8 words
   
3. WHAT MUST BE MERGED:
   - Single words: "Again." → MERGE
   - Short sentences: "Time stops." → MERGE
   - Fragments: "Something darker." → MERGE
   - List items: "Photos. Letters. Documents." → MERGE ALL
   - Repetitions: "Again. And again. And again." → MERGE ALL

4. TARGET RANGE:
   - Ideal: 15-18 words per line (sweet spot)
   - Acceptable: 12-20 words
   - Maximum: 25 words (hard limit)

PROCESSING STEPS:
1. Read entire script
2. Identify ALL sentences and count words
3. Mark sentences < 8 words as "MUST_MERGE"
4. Merge ALL marked sentences with adjacent text
5. Verify: NO line under 8 words exists
6. Create line breaks at natural scene transitions
7. Final validation: Check every line >= 8 words

Story:
${context}

Return ONLY a JSON array of strings. Each line MUST be 8-25 words:
["line 1 text here with at least 8 words...", "line 2 text here with at least 8 words...", ...]

CRITICAL: If ANY line has fewer than 8 words, the entire result is INVALID. Merge until compliant.`;

  const response = await callAI(prompt);
  try {
    let lines = JSON.parse(response);
    
    // Strict validation and filtering
    lines = lines.filter((line: string) => {
      const wordCount = line.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < 8) {
        console.warn(`Filtered line with ${wordCount} words: "${line.substring(0, 50)}..."`);
        return false;
      }
      return true;
    });
    
    // If too many lines were filtered out, use fallback
    if (lines.length < 5) {
      console.warn('Too many invalid lines, using fallback merging');
      return fallbackLineSplitting(context);
    }
    
    return lines;
  } catch (error) {
    console.error('Line breaking failed:', error);
    return fallbackLineSplitting(context);
  }
}

function fallbackLineSplitting(context: string): string[] {
  // Fallback: Split by paragraphs and merge short ones
  const paragraphs = context.split(/\n+/).filter(p => p.trim());
  const lines: string[] = [];
  let buffer = "";
  
  for (const para of paragraphs) {
    const wordCount = para.trim().split(/\s+/).filter(Boolean).length;
    
    if (wordCount >= 8) {
      // Flush buffer if exists
      if (buffer) {
        lines.push(buffer.trim());
        buffer = "";
      }
      lines.push(para.trim());
    } else {
      // Accumulate in buffer
      buffer += (buffer ? " " : "") + para.trim();
      const bufferWords = buffer.split(/\s+/).filter(Boolean).length;
      
      if (bufferWords >= 12) {
        lines.push(buffer.trim());
        buffer = "";
      }
    }
  }
  
  // Flush remaining buffer
  if (buffer && buffer.split(/\s+/).filter(Boolean).length >= 8) {
    lines.push(buffer.trim());
  }
  
  return lines;
}

async function callAI(prompt: string): Promise<string> {
  if (apiKeys.length === 0) {
    throw new Error('No API keys configured');
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const apiKey = apiKeys[currentKeyIndex % apiKeys.length];
      currentKeyIndex++;

      const response = await fetch('https.api.longcat.chat/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'LongCat-Flash-Chat',
          messages: [
            {
              role: 'system',
              // Simplified system prompt to force JSON-only output
              content: 'You are an AI assistant. Your ONLY job is to follow the user\'s prompt exactly. If the user asks for JSON, you MUST return ONLY the valid JSON data requested. Do not add any extra text, conversation, or markdown formatting.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2, // Lower temperature for more deterministic results
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      let content = data.choices[0].message.content;
      
      // Fix for AI sometimes wrapping JSON in markdown
      if (content.startsWith('```json')) {
        content = content.substring(7, content.length - 3).trim();
      }
      // Fix for AI sometimes just starting with ```
      if (content.startsWith('```')) {
         content = content.substring(3, content.length - 3).trim();
      }

      return content;
      
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw new Error('All API attempts failed');
}
