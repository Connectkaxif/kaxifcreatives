const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storyText } = await req.json();

    if (!storyText || typeof storyText !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Story text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Building characters from story...');

    const systemPrompt = `You are an expert character analyst. Your task is to extract and generate complete character profiles from stories.

ANALYSIS RULES:
1. Identify ALL named characters (main + side roles)
2. For unnamed characters (mentioned by pronouns, relationships, or occupations), generate realistic names
3. Create ONE-LINE descriptions following the EXACT structure below
4. Classify each character as "main" (explicitly named in story) or "side" (unnamed/implied, you generate name)

NAMING GUIDELINES FOR UNNAMED CHARACTERS:
- If story mentions "his wife" → Generate female name (e.g., Emma, Sarah)
- If story mentions "the detective" → Generate appropriate name (e.g., Detective James Carter)
- If story mentions "her son" → Generate child name matching context
- Names should be realistic and culturally appropriate to story context

DESCRIPTION FORMAT STRUCTURE:
[Name], [Age]-year-old [Gender], [Facial Structure], [Hair], [Eyes], [Skin/Complexion], [Build/Physique if notable], wears [Clothing Style and Color], [Aliases/Nicknames if any]

RULES FOR EACH ELEMENT:
- Name: Use given name or generate realistic one
- Age: Include "-year-old" suffix (e.g., "38-year-old")
- Gender: man/woman/boy/girl
- Facial Structure: oval face, square jaw, round face, angular features, etc.
- Hair: length, style, color (e.g., "shoulder-length chestnut brown hair")
- Eyes: color and notable features (e.g., "hazel eyes", "piercing blue eyes")
- Skin/Complexion: tone and distinctive features (e.g., "fair complexion with freckles", "tanned skin")
- Build/Physique: Only if notable (e.g., "athletic build", "slender frame") - can be omitted
- Clothing: Style and colors (e.g., "wears a cream blouse and navy pencil skirt")
- Aliases: Only if mentioned in story (can be omitted)

Example outputs:
- Aysha, 38-year-old woman, oval face, shoulder-length chestnut brown hair, hazel eyes, fair complexion with freckles, wears a cream blouse and navy pencil skirt.
- Emma, 30-year-old woman, round face, short blonde hair tied in a messy bun, blue eyes, pale skin, wears a light blue diner uniform with white apron and sneakers.
- Daniel, 10-year-old boy, youthful face, short brown hair, brown eyes, light complexion, wears a red T-shirt with denim shorts and sneakers.
- Michael, 35-year-old man, angular face with stubble, dark brown hair, green eyes, olive skin, wears a faded jacket, black jeans, and boots.

CRITICAL RULES:
- Generate visual details even if story doesn't explicitly describe them
- Keep descriptions consistent with story's tone and era
- One line per character following the exact structure
- Age should be reasonable and contextually appropriate
- Be specific about all elements: facial structure, hair, eyes, skin, clothing

Return ONLY a valid JSON object with this structure:
{
  "characters": [
    {
      "name": "Character Name",
      "description": "Complete one-line description following the exact structure",
      "type": "main" or "side"
    }
  ]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this story and extract all characters:\n\n${storyText}` }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let charactersText = data.choices?.[0]?.message?.content;

    if (!charactersText) {
      throw new Error('No content in AI response');
    }

    console.log('Raw AI response:', charactersText);

    // Clean up markdown code blocks if present
    charactersText = charactersText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let result;
    try {
      result = JSON.parse(charactersText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Attempted to parse:', charactersText);
      throw new Error('Failed to parse AI response as JSON');
    }

    const characters = result.characters || [];
    
    if (!Array.isArray(characters)) {
      throw new Error('Characters is not an array');
    }

    // Validate character format
    const validatedCharacters = characters.filter(char => 
      char.name && char.description && char.type &&
      typeof char.name === 'string' && 
      typeof char.description === 'string' &&
      (char.type === 'main' || char.type === 'side')
    );

    const mainCharacters = validatedCharacters.filter(c => c.type === 'main');
    const sideCharacters = validatedCharacters.filter(c => c.type === 'side');

    console.log(`Successfully built ${validatedCharacters.length} characters (${mainCharacters.length} main, ${sideCharacters.length} side)`);

    return new Response(
      JSON.stringify({ 
        characters: validatedCharacters,
        totalCount: validatedCharacters.length,
        mainCount: mainCharacters.length,
        sideCount: sideCharacters.length,
        mainCharacters: mainCharacters.map(c => c.name),
        sideCharacters: sideCharacters.map(c => c.name)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in build-characters function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while building characters',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
