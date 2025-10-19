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
  const prompt = `You are an expert story analyzer specializing in character identification. Your task is to scan this ENTIRE story carefully and extract ALL human characters.

# PHASE 1: COMPREHENSIVE STORY SCAN

Read the complete story LINE BY LINE and identify:
1. ALL NAMED characters (main protagonists, supporting roles, minor characters)
2. ALL UNNAMED characters mentioned by:
   - Pronouns only ("he", "she", "they", "him", "her")
   - Relationships ("his mother", "her sister", "the brother", "their friend")
   - Occupations ("the doctor", "a teacher", "the lawyer", "the investigator")
   - Roles ("the neighbor", "the stranger", "the receptionist")
3. Characters implied or referenced but not directly present
4. Background characters with any interaction or mention

# PHASE 2: CHARACTER CATEGORIZATION

For EACH character identified:

**NAMED CHARACTERS:**
- Extract their EXACT name from the script
- Look for full names, first names, and nicknames throughout the story
- Combine all variations into one entry (e.g., "Michael", "Mike", "Mr. Anderson" → Michael Anderson)
- Mark as isAIGenerated: false

**UNNAMED CHARACTERS:**
- Generate a REALISTIC, APPROPRIATE full name based on context
- For professionals: Use title + realistic surname (e.g., "the therapist" → "Dr. Sarah Mitchell")
- For relatives: Consider family relationships (e.g., "his brother" → "David Thompson" if protagonist is Thompson)
- For side roles: Create culturally appropriate names matching story setting
- Mark as isAIGenerated: true

# PHASE 3: DETAILED CHARACTER DESCRIPTION (DNA REFERENCE)

For EVERY character, create an 8-PART DETAILED APPEARANCE following this EXACT structure:

**FORMAT:** [face shape], [age] year old, [hair: length/color/texture/style], [eyes: shape/color/details], [skin tone], [body: build/height/posture], [clothing: specific items with colors], [distinctive features: marks/accessories]

**MANDATORY COMPONENTS:**

1. **Face Structure:** oval, round, square, heart-shaped, diamond, angular, soft, chiseled
   - Include: jawline, cheekbones, face width

2. **Age:** Must include exact number + "year old"
   - Use context clues: occupation, relationships, life stage
   - Inference: young adult (22-28), adult (30-40), parent (32-45), professional (35-55), child (5-12), teenager (13-17), elder (60+)

3. **Hair:** 
   - Length: short, shoulder-length, long, cropped, buzz-cut
   - Color: specific shade (golden blonde, chestnut brown, jet black, salt-and-pepper)
   - Texture: straight, wavy, curly, kinky, coarse, fine
   - Style: parting, volume, tied back, loose, styled

4. **Eyes:**
   - Shape: almond, round, hooded, deep-set, wide-set
   - Color: specific shade (bright blue, hazel, emerald green, dark brown)
   - Details: eyelashes, eyebrows, expression tendency

5. **Skin Tone:**
   - Be specific: fair, olive, tan, medium brown, deep brown, ebony
   - Include: freckles, birthmarks, complexion quality

6. **Body Build:**
   - Age-appropriate descriptions
   - Build: slim, athletic, stocky, petite, tall, muscular, lean
   - Height indicators: tall, average, short
   - Posture: upright, slouched, confident

7. **Clothing:**
   - Specific items mentioned or contextually appropriate
   - Include colors and style
   - Must be consistent with character's role/occupation

8. **Distinctive Features:**
   - Permanent marks: moles, scars, birthmarks (with location)
   - Accessories: glasses, jewelry, watches
   - Signature items that define the character

# CRITICAL DEDUPLICATION RULES

Before adding ANY character:
1. Check if name already exists (case-insensitive)
2. Check if any ALIAS matches existing characters
3. Check if relationship/occupation refers to existing character
4. If "his brother" appears and brother is named elsewhere, DON'T create duplicate
5. Merge all variations into ONE entry with comprehensive aliases

**Example Deduplication:**
- Script mentions: "Rachel", "Rach", "his wife", "the mother"
- Result: ONE character "Rachel Thompson" with aliases: "Rachel, Rach, wife, mother"

# OUTPUT FORMAT

Story to analyze:
${context}

Respond with a JSON array sorted alphabetically by name:
[
  {
    "name": "Full Name Here",
    "age": 34,
    "appearance": "oval face, 34 year old, shoulder-length chestnut brown hair with subtle caramel highlights worn loose with natural wave, expressive almond-shaped hazel eyes with thick lashes and arched brows, fair complexion with light freckles across nose bridge, lean athletic build with upright confident posture, wears cream cable-knit sweater over dark blue slim-fit jeans with brown leather ankle boots, delicate gold wedding band on left hand",
    "aliases": "Rachel, Rach, wife, mom",
    "isAIGenerated": false
  },
  {
    "name": "Dr. Marcus Reynolds",
    "age": 52,
    "appearance": "square face, 52 year old, short cropped salt-and-pepper hair with receding hairline, piercing gray analytical eyes behind thin wire-frame glasses, weathered tan skin with crow's feet, stocky broad-shouldered build with slight forward posture, wears navy blue suit jacket over white collared shirt with burgundy tie and gray slacks with polished black leather oxfords, silver wristwatch on left wrist",
    "aliases": "the private investigator, Reynolds, the detective",
    "isAIGenerated": true
  }
]

# FINAL VALIDATION CHECKLIST

Before submitting, verify EVERY character entry has:
✓ Realistic full name (capitalized properly)
✓ Exact age number + "year old" in appearance
✓ Face shape descriptor
✓ Complete hair description (length + color + texture + style)
✓ Eye shape + color + additional details
✓ Specific skin tone description
✓ Body build + height indicator + posture
✓ Detailed clothing with colors
✓ At least one distinctive feature or accessory
✓ All name variations in "aliases" field
✓ Correct isAIGenerated flag (true for created names, false for script names)
✓ No duplicate characters (merged all variations)

REMEMBER: Scan the ENTIRE story carefully. Don't miss side characters, unnamed characters, or characters mentioned by relationships/occupations. Every human presence in the story deserves identification.`;

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
