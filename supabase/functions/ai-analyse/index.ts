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
  const prompt = `# EXPERT CHARACTER IDENTIFIER - MULTI-PASS ANALYSIS SYSTEM

You are a professional story analyst. Your mission: Identify EVERY SINGLE HUMAN CHARACTER in this story through a systematic multi-pass scanning process.

# SCANNING PROTOCOL (EXECUTE IN ORDER)

## PASS 1: EXPLICIT NAME EXTRACTION
Scan the ENTIRE story from beginning to end. Extract:
- Every proper name mentioned (first names, last names, full names, nicknames)
- Names with titles (Dr., Mr., Mrs., Ms., Prof.)
- Names mentioned in dialogue, narration, or description
- Names that appear multiple times in different forms

**Note down:** Character name + all variations found

## PASS 2: PRONOUN & RELATIONSHIP TRACKING
Re-scan ENTIRE story. For EACH pronoun reference ("he", "she", "him", "her", "they"):
- Track what/who it refers to based on context
- If it refers to someone already named → link it to existing character
- If it refers to someone NOT yet identified → mark as UNNAMED character needing creation
- Look for relationship descriptors: "his brother", "her mother", "their friend", "the wife"

**Note down:** All unnamed characters referenced by relationships

## PASS 3: OCCUPATION & ROLE SCANNING  
Re-scan ENTIRE story. Identify characters mentioned by:
- Occupations: "the doctor", "a lawyer", "the teacher", "a nurse"
- Roles: "the receptionist", "the neighbor", "a stranger", "the investigator"
- Functions: "the driver", "a witness", "the clerk"

**Check:** Does this occupation/role refer to someone already identified? If NO → mark as new UNNAMED character

## PASS 4: IMPLIED CHARACTER DETECTION
Final scan. Look for:
- Characters implied through actions/dialogue but not directly described
- People mentioned in past tense ("someone he knew", "an old friend")
- Characters referenced in possessive form ("Emma's father", "their daughter")
- Background characters with any plot relevance

**Critical:** Even a single mention counts. If a human is referenced in ANY way, they must be catalogued.

# CHARACTER CATEGORIZATION

## NAMED CHARACTERS (Extract exact names from story):
Example found in story: "Rachel smiled", "Emma Thompson started college", "Michael's law firm"

For EACH named character, you must:
1. **Collect ALL name variations** from the story:
   - "Rachel" → also appears as "Rach" or "Rachel Thompson" or "his wife"
   - Merge ALL variations into ONE entry
   
2. **Never create duplicates**:
   - If "Rachel" and "his wife" refer to same person → ONE character entry
   - If "Michael" and "Mr. Anderson" refer to same person → ONE character entry
   - Store all variations in "aliases" field

3. **Mark as:** isAIGenerated: false (because name exists in story)

## UNNAMED CHARACTERS (AI must create realistic names):

For characters identified ONLY by:
- Pronouns: "he", "she", "they"
- Relationships: "his brother", "her mother", "their friend"  
- Occupations: "the doctor", "a lawyer", "the therapist"
- Roles: "the receptionist", "a neighbor", "the investigator"

You must CREATE a realistic full name:

**Naming Rules:**
1. **For professionals:** Use appropriate title + realistic surname
   - "the therapist" → "Dr. Sarah Mitchell" or "Dr. Marcus Reynolds"
   - "a lawyer" → "Attorney David Chang" or "Laura Bennett, Esq."
   - "the doctor" → "Dr. Emily Foster" or "Dr. James Peterson"

2. **For relatives:** Consider family context  
   - If protagonist is "Thompson" family → brother could be "David Thompson"
   - If story mentions Italian family → use Italian names
   - Match cultural/ethnic context from story setting

3. **For side roles:** Create contextually appropriate names
   - Modern American story → typical American names
   - Historical setting → period-appropriate names
   - International setting → culturally accurate names

4. **Mark as:** isAIGenerated: true (because you created the name)

# DNA REFERENCE: 8-PART DETAILED APPEARANCE

For EVERY character (named and unnamed), create comprehensive description:

## MANDATORY 8-PART STRUCTURE:

**[1. FACE SHAPE], [2. AGE], [3. HAIR], [4. EYES], [5. SKIN], [6. BODY], [7. CLOTHING], [8. DISTINCTIVE FEATURES]**

### 1. FACE SHAPE (be specific):
Options: oval, round, square, heart-shaped, diamond, triangular, oblong, angular, soft-featured, chiseled
Include: jawline type (sharp, soft, square, rounded), cheekbone prominence, face width

### 2. AGE (MANDATORY - exact number + "year old"):
Extract from context clues:
- Explicitly stated: "34-year-old Rachel" → use 34
- College student → 18-22 year old
- Young parent → 28-35 year old  
- Established professional (lawyer, doctor) → 35-50 year old
- Teenage child → 13-17 year old
- Elementary child → 6-12 year old
- Retired/elderly → 65+ year old

**Format:** Always write as "34 year old" (not "34" or "mid-30s")

### 3. HAIR (complete description):
- **Length:** short/cropped/shoulder-length/long/waist-length
- **Color:** Be specific with shade: golden blonde, chestnut brown, jet black, auburn, salt-and-pepper gray
- **Texture:** straight, wavy, curly, kinky, coarse, fine, thick, thin
- **Style:** How it's worn: loose, in bun, ponytail, braided, slicked back, parted (left/right/center)
- **Additional:** Volume, layers, bangs, highlights

Example: "shoulder-length chestnut brown hair with subtle caramel highlights, naturally wavy texture worn loose with side part"

### 4. EYES (detailed description):
- **Shape:** almond-shaped, round, hooded, deep-set, wide-set, close-set, upturned, downturned
- **Color:** bright blue, hazel with gold flecks, dark brown, emerald green, gray, amber
- **Details:** thick/thin lashes, eyebrow shape (arched, straight, bushy), expression tendency (warm, piercing, tired)

Example: "expressive almond-shaped hazel eyes with gold flecks, thick dark lashes, naturally arched eyebrows"

### 5. SKIN TONE (be specific and respectful):
- **Tone:** fair, ivory, olive, tan, bronze, medium brown, deep brown, ebony, porcelain
- **Texture/Features:** freckles (location), moles, birthmarks, smooth, weathered, sun-kissed
- **Complexion:** clear, rosy, warm undertones, cool undertones

Example: "fair complexion with warm undertones and light freckles scattered across nose bridge and cheeks"

### 6. BODY BUILD & PHYSIQUE:
- **Build:** slim, athletic, muscular, stocky, petite, tall, lean, heavyset, slender, robust
- **Height indicator:** tall, average height, short, towering, petite
- **Posture:** upright, confident, slouched, rigid, relaxed
- **Additional:** shoulders (broad, narrow), hands (delicate, calloused), overall presence

Example: "lean athletic build with upright confident posture, average height around 5'7\", graceful movements"

### 7. CLOTHING (specific items with colors):
Base clothing on:
- Story context (professional setting → business attire, casual setting → casual clothes)
- Character's occupation (doctor → scrubs/lab coat, lawyer → suit)
- Time period (modern, historical, futuristic)
- Weather/season mentioned in story

**Must include:**
- Top (with color and style)
- Bottom (with color and style)  
- Footwear (with color and style)
- Outer layers if applicable (jacket, coat, cardigan)

Example: "cream cable-knit sweater over dark blue slim-fit jeans with brown leather ankle boots"

### 8. DISTINCTIVE FEATURES & ACCESSORIES:
Every character needs at least ONE permanent identifying feature:

**Permanent marks:**
- Moles (with location: "small mole above left eyebrow")
- Scars (with location: "thin scar on right cheek")
- Birthmarks (with location: "birthmark on neck")
- Tattoos (if story suggests)

**Accessories:**
- Glasses (style and frame color)
- Jewelry (wedding ring, necklace, watch)
- Always-present items (hat, bag, tool)

Example: "delicate gold wedding band on left ring finger, small mole near right temple"

# DEDUPLICATION PROTOCOL (CRITICAL)

Before finalizing the character list:

1. **Check for name matches** (case-insensitive):
   - "Rachel" vs "rachel" vs "RACHEL" → same character
   
2. **Check for alias/nickname matches**:
   - "Michael" also called "Mike" → merge into ONE entry
   - "Rachel" also referred to as "his wife" → merge into ONE entry
   
3. **Check for relationship references**:
   - If story says "Rachel's daughter Emma" → Emma is daughter
   - Later if story says "his daughter" when referring to Michael → this is Emma
   - Don't create new "daughter" character

4. **Check for occupation/role references**:
   - If story mentions "Dr. Harrison the therapist" by name
   - Later if story says "the therapist said" → this is Dr. Harrison
   - Don't create new "therapist" character

**Merging process:**
- Combine all name variations into "aliases" field
- Use the MOST COMPLETE name as primary name
- Keep only ONE entry per actual human character

# OUTPUT FORMAT

Story to analyze:
${context}

**Your response must be a valid JSON array, sorted alphabetically by name:**

[
  {
    "name": "Amanda Martinez",
    "age": 36,
    "appearance": "heart-shaped face, 36 year old, long straight dark brown hair with caramel highlights worn loose past shoulders, sharp almond-shaped green eyes with defined eyebrows, olive skin tone with smooth complexion, slender hourglass build with elegant posture, wears emerald green silk blouse with black pencil skirt and nude pointed-toe heels, delicate silver pendant necklace and pearl stud earrings",
    "aliases": "Amanda, Amanda from his office",
    "isAIGenerated": false
  },
  {
    "name": "Dr. Marcus Reynolds",
    "age": 52,
    "appearance": "square face with strong jawline, 52 year old, short salt-and-pepper hair with receding hairline, piercing gray analytical eyes behind thin wire-frame glasses with subtle crow's feet, weathered tan skin, stocky broad-shouldered build with slight forward posture, wears charcoal gray suit jacket over crisp white dress shirt with burgundy silk tie and pressed black slacks with polished oxford shoes, silver chronograph watch on left wrist and small scar above right eyebrow",
    "aliases": "the private investigator, Reynolds, the detective, PI",
    "isAIGenerated": true
  },
  {
    "name": "Emma Thompson",  
    "age": 18,
    "appearance": "oval youthful face, 18 year old, long wavy golden blonde hair worn in loose natural waves, bright blue expressive eyes with long lashes, fair skin with light freckles across nose, slender petite build with youthful energy, wears casual college student attire of university logo sweatshirt over light blue jeans with white canvas sneakers, small gold stud earrings",
    "aliases": "Emma, their daughter, his daughter, the daughter",
    "isAIGenerated": false
  }
]

# FINAL VALIDATION CHECKLIST

Before submitting, verify EVERY character has:

✅ **Name:** Realistic full name, properly capitalized (if AI-generated, appropriate for context)
✅ **Age:** Exact number + "year old" format in appearance  
✅ **Face:** Specific face shape descriptor
✅ **Hair:** Complete description (length + color + texture + style)
✅ **Eyes:** Shape + color + additional details
✅ **Skin:** Specific tone + any features (freckles, marks)
✅ **Body:** Build + height indicator + posture
✅ **Clothing:** At least 3 specific items with colors
✅ **Features:** At least ONE distinctive feature or accessory
✅ **Aliases:** ALL variations of how character is referred to in story
✅ **isAIGenerated:** true if you created the name, false if name exists in story
✅ **No duplicates:** Verified no other character represents same person

# CRITICAL REMINDERS

1. **Thoroughness:** Scan ENTIRE story multiple times - don't miss anyone
2. **Side characters matter:** Even brief mentions need identification  
3. **Context is key:** Use story clues to infer ages, appearances, clothing
4. **Realistic names:** AI-generated names must fit story context (culture, era, setting)
5. **No duplicates:** Same person mentioned different ways = ONE character entry
6. **Complete descriptions:** Every character needs all 8 mandatory parts
7. **Consistency:** Same format and detail level for all characters

Now analyze the story above and return the complete character JSON array.`;

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
