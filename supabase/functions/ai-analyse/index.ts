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
    
    // Step 2: Detect characters (IMPROVED FUNCTION)
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

// === FUNCTION MODIFIED AS PER USER REQUEST ===
async function detectCharacters(context: string) {
  // This prompt is now enhanced with UNIVERSAL examples
  const prompt = `# EXPERT CHARACTER IDENTIFIER - AUTONOMOUS MULTI-PASS ANALYSIS SYSTEM

You are a professional story analyst and character identification expert. Your mission is to identify EVERY SINGLE HUMAN CHARACTER in this story through a systematic multi-pass scanning process. You must be thorough and scan the entire script multiple times to find all main, side-role, and even implied or referenced characters.

# SCANNING PROTOCOL (EXECUTE IN ORDER)

## PASS 1: EXPLICIT NAME EXTRACTION
Scan the ENTIRE story. Extract:
- Every proper name mentioned (first names, last names, full names, nicknames)
- Names with titles (Dr., Mr., Mrs., Ms., Prof.)
- Names mentioned in dialogue, narration, or description.
**Note down:** Character name + all variations found. Mark as \`isAIGenerated: false\`.

## PASS 2: PRONOUN & RELATIONSHIP TRACKING
Re-scan ENTIRE story. For EACH pronoun ("he", "she", "they") or relationship descriptor ("his brother", "her mother", "the wife", "their friend"):
- If it refers to someone already named → link it to existing character (add to aliases).
- If it refers to someone NOT yet identified → This is a NEW UNNAMED character. You MUST immediately proceed to CHARACTER CREATION (see below) and generate a realistic name. DO NOT use relational labels like "The Wife" as a character name.

## PASS 3: OCCUPATION & ROLE SCANNING
Re-scan ENTIRE story. Identify characters mentioned by:
- Occupations: "the doctor", "a lawyer", "the teacher", "a nurse"
- Roles: "the receptionist", "the neighbor", "a stranger", "the investigator"
- Check: Does this occupation/role refer to someone already identified?
- If NO → This is a NEW UNNAMED character. Proceed to CHARACTER CREATION and generate a realistic, named character (e.g., "the doctor" becomes "Dr. Emily Foster").

## PASS 4: IMPLIED CHARACTER DETECTION
Final scan. Look for:
- Characters implied through actions/dialogue ("someone he knew", "an old friend").
- Characters referenced in possessive form ("Emma's father").
- Background characters with any plot relevance.
- If a human is referenced in ANY way, they must be catalogued and named.

## PASS 5: ROLE CATEGORIZATION
For EVERY character identified (named and unnamed):
- Analyze their impact on the plot and frequency of appearance.
- **Main:** Central to the story, high appearance count, drives the plot.
- **Side:** Supports the story, minor appearance, or mentioned for context.
- Assign a \`"role": "main"\` or \`"role": "side"\` tag to each character.

# CHARACTER CREATION & DNA REFERENCE

## NAMED CHARACTERS (isAIGenerated: false)
- Use the name exactly as found in the story.
- Collect all variations ("Rachel", "Rach", "Rachel Thompson", "his wife") into the \`aliases\` field.

## UNNAMED CHARACTERS (isAIGenerated: true)
For characters from PASS 2, 3, 4 (pronouns, relationships, occupations):
- You MUST CREATE a realistic full name.
- **Naming Rules:**
  - "the therapist" → "Dr. Sarah Mitchell"
  - "a lawyer" → "Attorney David Chang"
  - "his brother" (if protagonist is "Mark Thompson") → "Daniel Thompson"
- Match cultural/ethnic context from the story.

## MANDATORY 8-PART DETAILED APPEARANCE (FOR EVERY CHARACTER)
Create this comprehensive description for EVERY character:

**[1. FACE SHAPE], [2. AGE], [3. HAIR], [4. EYES], [5. SKIN], [6. BODY], [7. CLOTHING], [8. DISTINCTIVE FEATURES]**

1.  **FACE SHAPE:** (e.g., oval, square, heart-shaped, chiseled jawline, soft features)
2.  **AGE (MANDATORY):** (e.g., "34 year old" - must be this exact format, infer from context if not stated)
3.  **HAIR:** (Length, Color, Texture, Style - e.g., "shoulder-length chestnut brown hair, naturally wavy, worn loose")
4.  **EYES:** (Shape, Color, Details - e.g., "expressive almond-shaped hazel eyes, thick dark lashes")
5.  **SKIN TONE:** (e.g., "fair complexion with warm undertones", "olive skin", "deep brown skin")
6.  **BODY BUILD:** (e.g., "lean athletic build, average height", "stocky and broad-shouldered", "petite and slender")
7.  **CLOTHING:** (Specific items with colors, based on context/role - e.g., "cream cable-knit sweater, dark blue slim-fit jeans, brown leather ankle boots")
8.  **DISTINCTIVE FEATURES:** (Permanent mark OR accessory - e.g., "small mole above left eyebrow", "always wears a silver chronograph watch", "thin scar on right cheek")

# DEDUPLICATION PROTOCOL (CRITICAL)
Before finalizing, check for duplicates.
- "Rachel" and "his wife" (identified in Pass 2) MUST be merged into ONE character.
- "Dr. Evans" (Pass 1) and "the doctor" (Pass 3) MUST be merged.
- "Michael" and "Mike" MUST be merged.
- Combine all variations into the \`aliases\` field. Use the most complete name as the primary \`name\`.

# OUTPUT FORMAT

Story to analyze:
${context}

**Your response must be a valid JSON array, sorted alphabetically by name. Use these generic examples ONLY as a formatting guide. DO NOT use these names in your response. Generate names based ON THE STORY provided.**

[
  {
    "name": "Michael Lawson",
    "age": 45,
    "appearance": "square face with strong jaw, 45 year old, short dark brown hair with hints of gray at the temples, deep-set blue eyes, olive skin tone, athletic build with broad shoulders, wears a navy blue suit with a white shirt and red tie, stainless steel watch on left wrist",
    "aliases": "Mike, Mr. Lawson, the lawyer, her husband",
    "role": "main",
    "isAIGenerated": false
  },
  {
    "name": "Dr. Aris Thorne",
    "age": 62,
    "appearance": "long oval face, 62 year old, thinning salt-and-pepper hair neatly combed, sharp hazel eyes behind wire-frame glasses, fair skin with age lines, tall slender build with a slight stoop, wears a tweed jacket over a light blue button-down shirt and brown trousers, small scar above his left eyebrow",
    "aliases": "the historian, Dr. Thorne, the professor",
    "role": "side",
    "isAIGenerated": true
  },
  {
    "name": "Chloe Jenkins",  
    "age": 24,
    "appearance": "round youthful face, 24 year old, curly jet black hair tied in a high ponytail, bright brown eyes, deep brown skin, petite build, wears a yellow sundress with white sandals, silver locket necklace",
    "aliases": "Chloe, the intern, Ms. Jenkins",
    "role": "side",
    "isAIGenerated": false
  }
]

# FINAL VALIDATION CHECKLIST
Verify EVERY character has:
✅ **Name:** Realistic full name (from story or AI-generated).
✅ **Age:** Exact number + "year old" format in appearance.
✅ **Appearance:** All 8 mandatory parts.
✅ **Aliases:** ALL variations (names, roles, relationships).
✅ **Role:** "main" or "side".
✅ **isAIGenerated:** true/false.
✅ **No duplicates:** Verified.

Now analyze the story above and return the complete character JSON array.`;

  const response = await callAI(prompt);
  try {
    const chars = JSON.parse(response);
    
    // Deduplicate characters (using existing function)
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
          // === NEW FIELD ADDED ===
          role: c.role || 'side', // Default to 'side' if AI misses it
          locked: false,
          isAIGenerated: c.isAIGenerATED || false // Corrected typo from previous version
        };
      })
      .sort((a: any, b: any) => a.name.localeCompare(b.name)); // Sort alphabetically
  } catch (error) {
    console.error('Character detection failed:', error);
    return [];
  }
}
// === END OF MODIFIED FUNCTION ===

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
              content: 'You are an expert story analyzer specializing in character identification and script formatting. Your character detection must be thorough - scan the entire story multiple times to identify ALL human characters, including those mentioned indirectly through pronouns, relationships, or occupations. Always respond in valid JSON format. Be deterministic and consistent - same input should produce same output. For character detection, use multi-pass scanning: first extract all named characters, then identify unnamed characters by pronouns/relationships, then by occupations/roles, and finally check for implied characters. Never create duplicate characters - if someone is referred to in multiple ways (name, pronoun, relationship), merge them into ONE entry with all variations in aliases.'
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
