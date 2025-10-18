import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Load API keys
const apiKeys: string[] = [];
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
    
    // Step 2: Detect characters
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

async function detectCharacters(context: string) {
  const prompt = `Analyze this story and extract ALL characters (both named and unnamed).

CRITICAL REQUIREMENTS - NO EXCEPTIONS:

1. MANDATORY 8-PART FORMAT for EVERY character:
   [Name], [age] year old, [face shape], [hair description], [eye color], [skin tone], [body build], [clothing details]

2. AGE IS MANDATORY:
   - Must include explicit number followed by "year old"
   - Format: "34 year old" (NOT "34" or "mid-30s")
   - Inference rules if not in script:
     * Young adult: 22-28 year old
     * Adult: 30-40 year old
     * Parent with young kids: 32-42 year old
     * Professional (doctor, lawyer): 40-55 year old
     * Teacher/educator: 30-45 year old
     * Student: 18-25 year old
     * Child: 5-12 year old
     * Teenager: 13-17 year old
     * Elder: 60+ year old

3. NO DUPLICATES:
   - Check if character already exists before adding
   - Match full names and nicknames (Rachel = Rachel Thompson = Rach)
   - Store aliases in "aliases" field, NOT as separate characters
   - Capitalize names properly (Dr. Harrison, not "the doctor")

4. For NAMED characters: Extract their exact name from script
5. For UNNAMED characters ("he", "she", "the doctor", "her mother"):
   - Create realistic full name (not "The Doctor", use "Dr. Harrison")
   - Mark as isAIGenerated: true

Story:
${context}

Respond in JSON format as an array (sort alphabetically for consistency):
[
  {
    "name": "Emma Thompson",
    "age": 7,
    "appearance": "round cherubic face, curly golden blonde hair in pigtails, bright blue innocent eyes, rosy fair skin with dimples, small petite build for her age, wears pink unicorn t-shirt and denim overalls with white sneakers",
    "aliases": "Emma",
    "isAIGenerated": false
  },
  {
    "name": "Rachel Thompson",
    "age": 34,
    "appearance": "oval face, shoulder-length chestnut hair with subtle highlights, expressive hazel eyes, fair complexion with light freckles across nose, lean athletic build, wears cream knit sweater and dark blue jeans with brown leather ankle boots",
    "aliases": "Rachel, Rach",
    "isAIGenerated": false
  }
]

VALIDATION: After generating, verify EVERY character has:
✓ Name (capitalized)
✓ Age with "year old"
✓ Face shape
✓ Hair description (length, color, style)
✓ Eye color with descriptor
✓ Skin tone
✓ Body build
✓ Clothing details`;

  const response = await callAI(prompt);
  try {
    const chars = JSON.parse(response);
    
    // Deduplicate characters
    const uniqueChars = deduplicateCharacters(chars);
    
    // Validate all characters have required fields
    return uniqueChars
      .map((c: any) => {
        // Validate appearance has all 8 parts
        const appearance = c.appearance || "";
        const hasAge = /\d+\s+year\s+old/i.test(appearance);
        
        if (!hasAge && c.age) {
          // Inject age if missing
          const ageText = `${c.age} year old`;
          c.appearance = appearance.includes(',') 
            ? appearance.replace(/^([^,]+),/, `$1, ${ageText},`)
            : `${ageText}, ${appearance}`;
        }
        
        return {
          id: crypto.randomUUID(),
          name: c.name,
          appearance: c.appearance,
          aliases: c.aliases || "",
          locked: false,
          isAIGenerated: c.isAIGenerated || false
        };
      })
      .sort((a: any, b: any) => a.name.localeCompare(b.name)); // Sort alphabetically
  } catch (error) {
    console.error('Character detection failed:', error);
    return [];
  }
}

function deduplicateCharacters(characters: any[]): any[] {
  const unique: any[] = [];
  const seen = new Set<string>();
  
  for (const char of characters) {
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

      const response = await fetch('https://api.longcat.chat/openai/v1/chat/completions', {
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
              content: 'You are an expert story analyzer and script formatter. Always respond in valid JSON format. Be deterministic and consistent - same input should produce same output.'
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
      return data.choices[0].message.content;
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw new Error('All API attempts failed');
}
