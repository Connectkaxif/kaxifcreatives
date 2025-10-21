import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
3. Create ONE-LINE descriptions in this exact format: [Name], [age], [visual description including hair, clothing, and distinctive features]

NAMING GUIDELINES FOR UNNAMED CHARACTERS:
- If story mentions "his wife" → Generate female name (e.g., Emma, Sarah)
- If story mentions "the detective" → Generate appropriate name (e.g., Detective James Carter)
- If story mentions "her son" → Generate child name matching context
- Names should be realistic and culturally appropriate to story context

DESCRIPTION FORMAT:
Each character must follow this exact structure:
[Name], [age], has [hair description], wearing [clothing details], [additional distinctive features]

Example outputs:
- Emma, 30, has short blonde hair tied in a messy bun, wearing a light blue diner uniform with a white apron and sneakers.
- Daniel, 10, has short brown hair and wears a red T-shirt with denim shorts and sneakers.
- Michael, 35, has dark brown hair with stubble, wearing a faded jacket, black jeans, and boots.

CRITICAL RULES:
- Generate visual details even if story doesn't explicitly describe them
- Keep descriptions consistent with story's tone and era
- One line per character
- Age should be reasonable and contextually appropriate
- Be specific about clothing and appearance

Return ONLY a valid JSON array with this structure:
[
  {
    "name": "Character Name",
    "description": "Complete one-line description"
  }
]`;

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

    let characters;
    try {
      characters = JSON.parse(charactersText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Attempted to parse:', charactersText);
      throw new Error('Failed to parse AI response as JSON');
    }

    if (!Array.isArray(characters)) {
      throw new Error('AI response is not an array');
    }

    // Validate character format
    const validatedCharacters = characters.filter(char => 
      char.name && char.description && 
      typeof char.name === 'string' && 
      typeof char.description === 'string'
    );

    console.log(`Successfully built ${validatedCharacters.length} characters`);

    return new Response(
      JSON.stringify({ 
        characters: validatedCharacters,
        count: validatedCharacters.length 
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
