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

      // Check if we have HF_API_TOKEN
      if (!env.HF_API_TOKEN) {
        console.error('❌ Missing HF_API_TOKEN');
        return new Response(JSON.stringify({
          error: 'Service configuration error. Please contact support.',
          debug: { 
            error_message: 'Missing API token',
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

      // Try multiple working models in order of preference
      const models = [
        'nlpconnect/vit-gpt2-image-captioning',
        'Salesforce/blip-image-captioning-base',
        'microsoft/git-base'
      ];

      let description = '';
      let usedModel = '';
      
      for (const model of models) {
        try {
          console.log(`🤖 Trying model: ${model}`);
          
          const imageBuffer = await imageFile.arrayBuffer();
          
          const aiResponse = await fetch(
            `https://api-inference.huggingface.co/models/${model}`,
            {
              headers: {
                'Authorization': `Bearer ${env.HF_API_TOKEN}`,
                'Content-Type': 'application/octet-stream',
              },
              method: 'POST',
              body: imageBuffer,
            }
          );

          console.log(`📡 Model ${model} response:`, aiResponse.status, aiResponse.ok);

          if (aiResponse.ok) {
            const result = await aiResponse.json();
            console.log('✅ AI Result received:', result);
            
            if (result && Array.isArray(result) && result[0]?.generated_text) {
              description = result[0].generated_text;
              usedModel = model;
              break;
            }
          } else {
            const errorText = await aiResponse.text();
            console.log(`❌ Model ${model} failed:`, aiResponse.status, errorText);
            
            // If it's a 503 (model loading), wait and try again
            if (aiResponse.status === 503) {
              console.log('⏳ Model loading, waiting 3 seconds...');
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              // Try once more
              const retryResponse = await fetch(
                `https://api-inference.huggingface.co/models/${model}`,
                {
                  headers: {
                    'Authorization': `Bearer ${env.HF_API_TOKEN}`,
                    'Content-Type': 'application/octet-stream',
                  },
                  method: 'POST',
                  body: imageBuffer,
                }
              );
              
              if (retryResponse.ok) {
                const retryResult = await retryResponse.json();
                if (retryResult && Array.isArray(retryResult) && retryResult[0]?.generated_text) {
                  description = retryResult[0].generated_text;
                  usedModel = model;
                  break;
                }
              }
            }
          }
        } catch (error) {
          console.error(`💥 Error with model ${model}:`, error);
          continue; // Try next model
        }
      }

      // If no model worked, return a fallback
      if (!description) {
        return new Response(JSON.stringify({
          error: 'Unable to process image at this time. Please try again later.',
          debug: { 
            error_message: 'All image captioning models unavailable',
            tried_models: models,
            timestamp: new Date().toISOString()
          }
        }), { 
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      console.log('📝 Final description:', description);

      // Enhanced analysis with keyword matching
      const analysis = analyzeDescription(description);
      
      // Find matching beads based on analysis
      const suggestions = await findMatchingBeads(analysis);

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
          model_used: usedModel,
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

function analyzeDescription(description: string) {
  const beadKeywords = {
    materials: {
      glass: ['glass', 'crystal', 'transparent', 'clear', 'shiny', 'smooth'],
      metal: ['metal', 'silver', 'gold', 'copper', 'bronze', 'brass', 'metallic'],
      stone: ['stone', 'marble', 'granite', 'quartz', 'agate', 'natural', 'jasper', 'rock', 'mineral'],
      wood: ['wood', 'wooden', 'natural', 'brown', 'grain'],
      ceramic: ['ceramic', 'porcelain', 'clay', 'glazed'],
      plastic: ['plastic', 'acrylic', 'synthetic'],
      foil: ['foil', 'leaf', 'silver foil', 'gold foil', 'metallic foil', 'shimmer', 'reflective']
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
      colorful: ['colorful', 'multicolored', 'various colors', 'different colors']
    },
    shapes: {
      round: ['round', 'sphere', 'ball', 'circular'],
      oval: ['oval', 'elliptical', 'egg'],
      cylinder: ['cylinder', 'tube', 'barrel'],
      disc: ['disc', 'flat', 'coin'],
      irregular: ['irregular', 'organic', 'freeform'],
      heart: ['heart', 'heart-shaped', 'love'],
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

async function findMatchingBeads(analysis: any) {
  const suggestions = [];
  
  // Check for stone indicators
  const hasStoneIndicators = analysis.materials.some((m: any) => m.type === 'stone');
  
  if (hasStoneIndicators) {
    suggestions.push({
      title: 'Natural Stone Beads',
      slug: 'natural-stone',
      description: 'Natural stone beads with earthy colors and unique patterns',
      confidence: 0.85,
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
      description: 'Metallic beads with shiny finish',
      confidence: 0.80,
      category: 'metal',
      tags: ['metal', 'metallic', 'shiny']
    });
  }

  // Check for colorful beads
  const hasColorfulIndicators = analysis.colors.some((c: any) => c.type === 'colorful') ||
                               analysis.colors.length > 2;
  
  if (hasColorfulIndicators && suggestions.length === 0) {
    suggestions.push({
      title: 'Mixed Color Glass Beads',
      slug: 'mixed-color-glass',
      description: 'Colorful glass beads perfect for vibrant jewelry projects',
      confidence: 0.75,
      category: 'glass',
      tags: ['glass', 'colorful', 'mixed', 'jewelry']
    });
  }

  // Default glass beads suggestion
  if (suggestions.length === 0) {
    suggestions.push({
      title: 'Glass Beads',
      slug: 'glass-beads',
      description: 'Traditional glass beads perfect for jewelry making',
      confidence: 0.70,
      category: 'glass',
      tags: ['glass', 'traditional', 'jewelry']
    });
  }
  
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}