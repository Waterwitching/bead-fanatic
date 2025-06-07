interface Env {
  HF_API_TOKEN: string;
  BEAD_DATA: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    try {
      console.log('🔮 Starting bead identification process...');
      
      const formData = await request.formData();
      const imageFile = formData.get('image') as File;
      
      if (!imageFile) {
        return new Response('No image provided', { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      // Validate file size (max 5MB)
      if (imageFile.size > 5 * 1024 * 1024) {
        return new Response('Image too large. Maximum size is 5MB.', { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      // Validate file type
      if (!imageFile.type.startsWith('image/')) {
        return new Response('Invalid file type. Please upload an image.', { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      console.log('📸 Processing image:', {
        name: imageFile.name,
        size: imageFile.size,
        type: imageFile.type
      });

      // Try AI analysis first, but fallback gracefully
      let description = '';
      let usedAI = false;

      if (env.HF_API_TOKEN) {
        try {
          // Quick attempt at one reliable model
          console.log('🤖 Attempting AI analysis...');
          
          const imageBuffer = await imageFile.arrayBuffer();
          
          const aiResponse = await fetch(
            'https://api-inference.huggingface.co/models/nlpconnect/vit-gpt2-image-captioning',
            {
              headers: {
                'Authorization': `Bearer ${env.HF_API_TOKEN}`,
                'Content-Type': 'application/octet-stream',
              },
              method: 'POST',
              body: imageBuffer,
            }
          );

          if (aiResponse.ok) {
            const result = await aiResponse.json();
            if (result && Array.isArray(result) && result[0]?.generated_text) {
              description = result[0].generated_text;
              usedAI = true;
              console.log('✅ AI analysis successful');
            }
          }
        } catch (error) {
          console.log('⚠️ AI analysis failed, using fallback');
        }
      }

      // Fallback: Analyze based on filename and basic patterns
      if (!description) {
        description = generateFallbackDescription(imageFile);
        console.log('📝 Using fallback description');
      }

      console.log('📝 Final description:', description);

      // Enhanced analysis with keyword matching
      const analysis = analyzeDescription(description);
      
      // Find matching beads based on analysis
      const suggestions = await findMatchingBeads(analysis, !usedAI);

      const response = {
        description,
        analysis,
        suggestions,
        debug: {
          image_info: {
            size: imageFile.size,
            type: imageFile.type,
            name: imageFile.name
          },
          analysis_method: usedAI ? 'AI' : 'Fallback',
          timestamp: new Date().toISOString()
        }
      };

      return new Response(JSON.stringify(response), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });

    } catch (error) {
      console.error('💥 Error identifying bead:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to identify bead. Please try again.',
        debug: {
          error_message: error.message,
          timestamp: new Date().toISOString()
        }
      }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};

function generateFallbackDescription(imageFile: File): string {
  const filename = imageFile.name.toLowerCase();
  
  // Analyze filename for clues
  const filenameClues = [];
  
  if (filename.includes('bead')) filenameClues.push('beads');
  if (filename.includes('glass')) filenameClues.push('glass');
  if (filename.includes('stone')) filenameClues.push('stone');
  if (filename.includes('metal')) filenameClues.push('metal');
  if (filename.includes('color')) filenameClues.push('colorful');
  if (filename.includes('blue')) filenameClues.push('blue');
  if (filename.includes('red')) filenameClues.push('red');
  if (filename.includes('green')) filenameClues.push('green');
  
  // Create a reasonable description
  if (filenameClues.length > 0) {
    return `a collection of ${filenameClues.join(' ')} beads arranged together`;
  }
  
  // Default description
  return 'a collection of various beads with different colors and materials';
}

function analyzeDescription(description: string) {
  const beadKeywords = {
    materials: {
      glass: ['glass', 'crystal', 'transparent', 'clear', 'shiny', 'smooth'],
      metal: ['metal', 'silver', 'gold', 'copper', 'bronze', 'brass', 'metallic'],
      stone: ['stone', 'marble', 'granite', 'quartz', 'agate', 'natural', 'jasper', 'rock', 'mineral'],
      wood: ['wood', 'wooden', 'natural', 'brown', 'grain'],
      ceramic: ['ceramic', 'porcelain', 'clay', 'glazed'],
      plastic: ['plastic', 'acrylic', 'synthetic']
    },
    colors: {
      blue: ['blue', 'navy', 'cobalt', 'azure', 'sapphire', 'turquoise', 'aqua'],
      red: ['red', 'crimson', 'ruby', 'burgundy'],
      green: ['green', 'emerald', 'jade', 'olive'],
      yellow: ['yellow', 'gold', 'amber', 'citrine'],
      purple: ['purple', 'violet', 'amethyst', 'lavender'],
      clear: ['clear', 'transparent', 'crystal'],
      black: ['black', 'ebony', 'onyx'],
      white: ['white', 'pearl', 'ivory', 'cream'],
      pink: ['pink', 'rose', 'magenta'],
      orange: ['orange', 'coral', 'peach'],
      brown: ['brown', 'tan', 'beige', 'coffee', 'chocolate', 'earth', 'natural'],
      colorful: ['colorful', 'multicolored', 'various colors', 'different colors', 'various']
    },
    shapes: {
      round: ['round', 'sphere', 'ball', 'circular'],
      oval: ['oval', 'elliptical', 'egg'],
      small: ['small', 'tiny', 'little', 'mini']
    }
  };

  const analysis = {
    materials: [] as Array<{type: string, confidence: number, matched_words: string[]}>,
    colors: [] as Array<{type: string, confidence: number, matched_words: string[]}>,
    shapes: [] as Array<{type: string, confidence: number, matched_words: string[]}>
  };

  const lowercaseDesc = description.toLowerCase();
  
  for (const [category, items] of Object.entries(beadKeywords)) {
    for (const [item, words] of Object.entries(items)) {
      const matches = words.filter(word => lowercaseDesc.includes(word));
      if (matches.length > 0) {
        (analysis as any)[category].push({
          type: item,
          confidence: matches.length / words.length,
          matched_words: matches
        });
      }
    }
  }

  // Sort by confidence
  Object.keys(analysis).forEach(key => {
    (analysis as any)[key].sort((a: any, b: any) => b.confidence - a.confidence);
  });

  return analysis;
}

async function findMatchingBeads(analysis: any, isFallback: boolean = false) {
  const suggestions = [];
  
  // Check for stone indicators
  const hasStoneIndicators = analysis.materials.some((m: any) => m.type === 'stone');
  
  if (hasStoneIndicators) {
    suggestions.push({
      title: 'Natural Stone Beads',
      slug: 'natural-stone',
      description: 'Natural stone beads with earthy colors and unique patterns',
      confidence: isFallback ? 0.75 : 0.85,
      category: 'stone',
      tags: ['stone', 'natural', 'gemstone']
    });
  }

  // Check for metal indicators
  const hasMetalIndicators = analysis.materials.some((m: any) => m.type === 'metal');
  
  if (hasMetalIndicators) {
    suggestions.push({
      title: 'Metal Beads',
      slug: 'metal-beads',
      description: 'Metallic beads with shiny finish perfect for elegant jewelry',
      confidence: isFallback ? 0.70 : 0.80,
      category: 'metal',
      tags: ['metal', 'metallic', 'shiny']
    });
  }

  // Check for glass indicators
  const hasGlassIndicators = analysis.materials.some((m: any) => m.type === 'glass');
  
  if (hasGlassIndicators || (!hasStoneIndicators && !hasMetalIndicators)) {
    suggestions.push({
      title: 'Glass Beads',
      slug: 'glass-beads',
      description: 'Traditional glass beads available in many colors and finishes',
      confidence: isFallback ? 0.65 : 0.75,
      category: 'glass',
      tags: ['glass', 'traditional', 'colorful']
    });
  }

  // Check for colorful beads
  const hasColorfulIndicators = analysis.colors.some((c: any) => c.type === 'colorful') ||
                               analysis.colors.length > 2;
  
  if (hasColorfulIndicators) {
    suggestions.push({
      title: 'Mixed Color Bead Set',
      slug: 'mixed-color-set',
      description: 'Assorted beads in various colors perfect for creative jewelry projects',
      confidence: isFallback ? 0.60 : 0.70,
      category: 'mixed',
      tags: ['colorful', 'assorted', 'creative', 'variety']
    });
  }

  // Ensure we always have at least one suggestion
  if (suggestions.length === 0) {
    suggestions.push({
      title: 'Craft Beads',
      slug: 'craft-beads',
      description: 'Quality craft beads suitable for jewelry making and decorative projects',
      confidence: 0.60,
      category: 'general',
      tags: ['craft', 'jewelry', 'decorative']
    });
  }
  
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}