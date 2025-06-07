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

      // Convert image to base64 for Vision model
      const imageBuffer = await imageFile.arrayBuffer();
      const base64Image = arrayBufferToBase64(imageBuffer);
      
      console.log('🤖 Using Llama Vision for detailed analysis...');
      
      // Use Llama Vision model for detailed bead analysis
      const visionResponse = await fetch(
        'https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-11B-Vision-Instruct',
        {
          headers: {
            'Authorization': `Bearer ${env.HF_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify({
            inputs: {
              image: base64Image,
              text: "Analyze this image of beads in detail. Describe their materials (glass, stone, metal, ceramic, etc.), colors, shapes, sizes, and any distinctive features. Be specific about what type of beads these appear to be."
            },
            parameters: {
              max_new_tokens: 200,
              temperature: 0.3
            }
          }),
        }
      );

      console.log('📡 Vision model response:', visionResponse.status, visionResponse.ok);

      if (!visionResponse.ok) {
        const errorText = await visionResponse.text();
        console.error('❌ Vision model error:', errorText);
        
        // Try fallback with simpler models
        return await tryFallbackModels(imageBuffer, env, corsHeaders);
      }

      const visionResult = await visionResponse.json();
      console.log('✅ Vision analysis received');
      
      let description = '';
      if (visionResult.generated_text) {
        description = visionResult.generated_text;
      } else if (Array.isArray(visionResult) && visionResult[0]?.generated_text) {
        description = visionResult[0].generated_text;
      } else {
        console.log('⚠️ Unexpected vision result format, trying fallback');
        return await tryFallbackModels(imageBuffer, env, corsHeaders);
      }

      console.log('📝 Vision description:', description);

      // Enhanced analysis with keyword matching
      const analysis = analyzeDescription(description);
      
      // Find matching beads based on analysis
      const suggestions = await findMatchingBeads(analysis, false);

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
          analysis_method: 'Llama-Vision',
          model_used: 'meta-llama/Llama-3.2-11B-Vision-Instruct',
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

// Helper function to safely convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
}

async function tryFallbackModels(imageBuffer: ArrayBuffer, env: any, corsHeaders: any) {
  console.log('🔄 Trying fallback image captioning models...');
  
  const fallbackModels = [
    'nlpconnect/vit-gpt2-image-captioning',
    'Salesforce/blip-image-captioning-base'
  ];

  for (const model of fallbackModels) {
    try {
      const response = await fetch(
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

      if (response.ok) {
        const result = await response.json();
        if (result && Array.isArray(result) && result[0]?.generated_text) {
          const description = result[0].generated_text;
          const analysis = analyzeDescription(description);
          const suggestions = await findMatchingBeads(analysis, true);

          return new Response(JSON.stringify({
            description,
            analysis,
            suggestions,
            debug: {
              analysis_method: 'Fallback-AI',
              model_used: model,
              timestamp: new Date().toISOString()
            }
          }), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }
    } catch (error) {
      console.log(`❌ Fallback model ${model} failed:`, error);
    }
  }

  // Ultimate fallback
  return new Response(JSON.stringify({
    error: 'Image analysis temporarily unavailable. Please try again later.',
    debug: {
      error_message: 'All AI models unavailable',
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

function analyzeDescription(description: string) {
  const beadKeywords = {
    materials: {
      glass: ['glass', 'crystal', 'transparent', 'clear', 'shiny', 'smooth', 'translucent'],
      metal: ['metal', 'silver', 'gold', 'copper', 'bronze', 'brass', 'metallic', 'steel'],
      stone: ['stone', 'marble', 'granite', 'quartz', 'agate', 'natural', 'jasper', 'rock', 'mineral', 'gemstone'],
      wood: ['wood', 'wooden', 'natural', 'brown', 'grain', 'timber'],
      ceramic: ['ceramic', 'porcelain', 'clay', 'glazed', 'pottery'],
      plastic: ['plastic', 'acrylic', 'synthetic', 'resin'],
      pearl: ['pearl', 'nacre', 'lustrous', 'iridescent']
    },
    colors: {
      blue: ['blue', 'navy', 'cobalt', 'azure', 'sapphire', 'turquoise', 'aqua', 'teal'],
      red: ['red', 'crimson', 'ruby', 'burgundy', 'scarlet', 'maroon'],
      green: ['green', 'emerald', 'jade', 'olive', 'forest', 'lime'],
      yellow: ['yellow', 'gold', 'amber', 'citrine', 'golden'],
      purple: ['purple', 'violet', 'amethyst', 'lavender', 'lilac'],
      clear: ['clear', 'transparent', 'crystal', 'see-through'],
      black: ['black', 'ebony', 'onyx', 'dark'],
      white: ['white', 'pearl', 'ivory', 'cream', 'pale'],
      pink: ['pink', 'rose', 'magenta', 'blush'],
      orange: ['orange', 'coral', 'peach', 'tangerine'],
      brown: ['brown', 'tan', 'beige', 'coffee', 'chocolate', 'earth', 'natural'],
      colorful: ['colorful', 'multicolored', 'various colors', 'different colors', 'mixed colors', 'rainbow']
    },
    shapes: {
      round: ['round', 'sphere', 'ball', 'circular', 'spherical'],
      oval: ['oval', 'elliptical', 'egg', 'elongated'],
      cylinder: ['cylinder', 'tube', 'barrel', 'cylindrical'],
      faceted: ['faceted', 'cut', 'geometric', 'angular', 'crystalline'],
      irregular: ['irregular', 'organic', 'freeform', 'natural shape'],
      small: ['small', 'tiny', 'little', 'mini', 'seed'],
      large: ['large', 'big', 'chunky', 'oversized']
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
  
  // Check for specific materials
  const topMaterial = analysis.materials[0];
  const topColor = analysis.colors[0];
  const topShape = analysis.shapes[0];
  
  if (topMaterial?.type === 'stone') {
    suggestions.push({
      title: 'Natural Stone Beads',
      slug: 'natural-stone',
      description: 'Genuine natural stone beads with unique patterns and earthy appeal',
      confidence: isFallback ? 0.75 : 0.90,
      category: 'stone',
      tags: ['stone', 'natural', 'gemstone', 'earthy']
    });
  }

  if (topMaterial?.type === 'metal') {
    suggestions.push({
      title: 'Metal Beads',
      slug: 'metal-beads',
      description: 'Polished metal beads that add elegance and weight to jewelry designs',
      confidence: isFallback ? 0.70 : 0.85,
      category: 'metal',
      tags: ['metal', 'elegant', 'durable', 'polished']
    });
  }

  if (topMaterial?.type === 'pearl') {
    suggestions.push({
      title: 'Pearl Beads',
      slug: 'pearl-beads',
      description: 'Lustrous pearl beads with natural iridescence and classic beauty',
      confidence: isFallback ? 0.75 : 0.88,
      category: 'pearl',
      tags: ['pearl', 'lustrous', 'classic', 'elegant']
    });
  }

  if (topMaterial?.type === 'glass' || !topMaterial) {
    const colorDesc = topColor ? `${topColor.type} ` : '';
    suggestions.push({
      title: `${colorDesc}Glass Beads`.trim(),
      slug: 'glass-beads',
      description: `High-quality glass beads ${topColor ? `in beautiful ${topColor.type} tones ` : ''}perfect for jewelry making`,
      confidence: isFallback ? 0.65 : 0.80,
      category: 'glass',
      tags: ['glass', 'versatile', 'jewelry', topColor?.type].filter(Boolean)
    });
  }

  // Add shape-specific suggestions
  if (topShape?.type === 'faceted') {
    suggestions.push({
      title: 'Faceted Crystal Beads',
      slug: 'faceted-crystal',
      description: 'Cut crystal beads that sparkle and reflect light beautifully',
      confidence: isFallback ? 0.70 : 0.82,
      category: 'crystal',
      tags: ['faceted', 'crystal', 'sparkle', 'cut']
    });
  }

  // Color-based suggestions
  if (analysis.colors.length > 2 || topColor?.type === 'colorful') {
    suggestions.push({
      title: 'Mixed Color Bead Collection',
      slug: 'mixed-color-collection',
      description: 'Diverse collection of beads in multiple colors for creative projects',
      confidence: isFallback ? 0.60 : 0.75,
      category: 'mixed',
      tags: ['colorful', 'variety', 'creative', 'collection']
    });
  }

  // Ensure we have at least one suggestion
  if (suggestions.length === 0) {
    suggestions.push({
      title: 'Artisan Craft Beads',
      slug: 'artisan-craft',
      description: 'Quality craft beads perfect for handmade jewelry and art projects',
      confidence: 0.60,
      category: 'craft',
      tags: ['craft', 'artisan', 'handmade', 'quality']
    });
  }
  
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}