interface Env {
  HF_API_TOKEN: string;
  BEAD_DATA: KVNamespace;
}

// Helper function to safely convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192; // Process in chunks to avoid stack overflow
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
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

      // Try using Hugging Face Inference API with a different approach
      console.log('🤖 Calling Hugging Face API...');
      
      // Get raw image data for the API
      const imageBuffer = await imageFile.arrayBuffer();
      
      const aiResponse = await fetch(
        'https://api-inference.huggingface.co/models/nlpconnect/vit-gpt2-image-captioning',
        {
          headers: {
            'Authorization': `Bearer ${env.HF_API_TOKEN}`,
          },
          method: 'POST',
          body: imageBuffer, // Send raw image data instead of base64
        }
      );

      console.log('📡 AI API Response status:', aiResponse.status, aiResponse.ok);

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('❌ AI API Error:', errorText);
        
        // Handle common API errors
        if (aiResponse.status === 503) {
          return new Response(JSON.stringify({
            error: 'AI service is temporarily loading. Please try again in a moment.',
            debug: { 
              error_message: 'Model loading',
              status: aiResponse.status,
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
        
        throw new Error(`AI service error: ${aiResponse.status} - ${errorText}`);
      }

      const result = await aiResponse.json();
      console.log('✅ AI Result received:', result);
      
      const description = result[0]?.generated_text || 'Unable to generate description';
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
          model: 'nlpconnect/vit-gpt2-image-captioning',
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
      brown: ['brown', 'tan', 'beige', 'coffee', 'chocolate', 'earth', 'natural']
    },
    shapes: {
      round: ['round', 'sphere', 'ball', 'circular'],
      oval: ['oval', 'elliptical', 'egg'],
      cylinder: ['cylinder', 'tube', 'barrel'],
      disc: ['disc', 'flat', 'coin'],
      irregular: ['irregular', 'organic', 'freeform'],
      heart: ['heart', 'heart-shaped', 'love']
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