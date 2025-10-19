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
    
    // Step 2: Detect characters (IMPROVED AND SIMPLIFIED FUNCTION)
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

// === FUNCTION MODIFIED AND SIMPLIFIED FOR RELIABILITY ===
async function detectCharacters(context: string) {
  // This prompt is now much simpler to ensure the AI follows instructions.
  const prompt = `# EXPERT CHARACTER IDENTIFIER

You are a story analyst. Your mission is to identify EVERY human character from the story.

# RULES
1.  **READ THE STORY FIRST:** Your primary goal is to find characters EXPLICITLY named in the story (e.g., "Rachel", "Michael").
2.  **FIND UNNAMED CHARACTERS:** Also find characters mentioned only by roles ("the doctor"), relationships ("his brother"), or pronouns ("she" if it's a new person).
3.  **GENERATE NAMES (If Needed):**
    * If a character has a name (like "Rachel"), use that name. Set \`isAIGenerated: false\`.
    * If a character is unnamed ("the doctor"), you MUST invent a realistic name (like "Dr. Emily Reed"). Set \`isAIGenerated: true\`.
4.  **GENERATE DESCRIPTION (SIMPLE):**
    * For EVERY character, write a simple 1-2 sentence description.
    * Base it on the story's context (theme, tone, setting).
    * Example: "A 34-year-old woman, heartbroken and contemplating her marriage, with a tense posture."
5.  **CATEGORIZE ROLE:** Identify if they are a "main" or "side" character.
6.  **FIND ALIASES:** List all ways the character is mentioned (e.g., "Rachel", "his wife").
7.  **NO DUPLICATES:** "Rachel" and "his wife" should be ONE character, not two.

# STORY TO ANALYZE
${context}

# OUTPUT FORMAT
You MUST respond in a valid JSON array. The names in the examples are generic; you MUST generate names based on the story above.

[
  {
    "name": "Michael Lawson",
    "appearance": "A 45-year-old man, appearing tired and stressed from his job, with short dark hair. Wears a business suit.",
    "aliases": "Mike, Mr. Lawson, the lawyer, her husband",
    "role": "main",
    "isAIGenerated": false
  },
  {
    "name": "Dr. Aris Thorne",
    "appearance": "A 62-year-old historian, tall and slender with kind eyes behind glasses. Wears a tweed jacket.",
    "aliases": "the historian, Dr. Thorne, the professor",
    "role": "side",
    "isAIGenerated": true
  },
  {
    "name": "Chloe Jenkins",  
    "appearance": "A 24-year-old intern, energetic and youthful, with curly black hair tied in a ponytail.",
    "aliases": "Chloe, the intern, Ms. Jenkins",
    "role": "side",
    "isAIGenerated": false
  }
]

Now, analyze the story provided above and return the complete character JSON array.`;

  const response = await callAI(prompt);
  try {
    const chars = JSON.parse(response);
    
    // Deduplicate characters (using existing function)
    const uniqueChars = deduplicateCharacters(chars);
    
    // Validate all characters have required fields
    return uniqueChars
      .map((c: any) => {
        // Fallback for missing appearance (just in case)
        if (!c.appearance) {
          console.warn(`AI failed to generate appearance for ${c.name}. Adding fallback.`);
          c.appearance = `A ${c.role || 'side'} character involved in the story.`;
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
    console.error('Character detection failed, AI response was likely invalid JSON:', error);
    console.error('AI Response:', response); // Log the raw response for debugging
    return []; // Return empty array on failure
  }
}
// === END OF MODIFIED FUNCTION ===

function deduplicateCharacters(characters: any[]): any[] {
  if (!Array.isArray(characters)) {
    console.error('Deduplication input is not an array:', characters);
    return [];
  }
  
  const unique: any[] = [];
  const seen = new Set<string>();
  
  for (const char of characters) {
    if (typeof char.name !== 'string') continue; // Skip invalid entries
    
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

5. DETERMINISTIC PROCESSING:
   - Process script linearly from start to end
   - Use consistent breaking rules at scene transitions
   - Aim for same line count on repeated runs

MERGING EXAMPLES:

❌ WRONG (FORBIDDEN):
Line 1: "Time stops." (2 words - VIOLATION)
Line 2: "The coffee mug falls." (4 words - VIOLATION)

✅ CORRECT (REQUIRED):
Line 1: "Time stops as the coffee mug slips from Rachel's trembling hand and shatters on the freshly mopped kitchen floor." (19 words)

❌ WRONG (FORBIDDEN):
Line 5: "Hotel receipts." (2 words)
Line 6: "Apartment lease." (2 words)  
Line 7: "Photos from trips." (3 words)

✅ CORRECT (REQUIRED):
Line 5: "Hotel receipts, apartment lease agreements, and photos from trips Michael claimed were business conferences spread across the table." (18 words)

❌ WRONG (FORBIDDEN):
Line 12: "Rachel walks away slowly." (4 words)
Line 13: "Door slams shut." (3 words)

✅ CORRECT (REQUIRED):
Line 12: "Rachel walks away slowly down the hallway as the bedroom door slams shut behind her with finality." (17 words)

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
              content: 'You are an expert story analyzer. Your job is to read a story and extract characters or reformat the story as requested. You MUST follow all formatting instructions and return valid JSON. Be accurate and pay close attention to the user\'s rules.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3, // Lower temperature for more deterministic results
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Fix for AI sometimes wrapping JSON in markdown
      if (content.startsWith('```json')) {
        return content.substring(7, content.length - 3).trim();
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
