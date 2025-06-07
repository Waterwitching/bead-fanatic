interface Env {
  GOOGLE_API_KEY: string;
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

      // Convert image to base64 for Gemini
      const imageBuffer = await imageFile.arrayBuffer();
      const base64Image = arrayBufferToBase64(imageBuffer);
      
      let description = '';
      let analysisMethod = '';
      let debugInfo: any = {
        gemini_attempted: false,
        gemini_error: null,
        hf_attempted: false,
        hf_error: null
      };

      // Try Gemini 1.5 Flash first (FREE and reliable!)
      if (env.GOOGLE_API_KEY) {
        try {
          console.log('🤖 Using Gemini 1.5 Flash for analysis...');
          debugInfo.gemini_attempted = true;
          
          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GOOGLE_API_KEY}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    {
                      text: "Analyze this image of beads in detail. I need you to identify and describe:\n\n1. MATERIALS: What are these beads made of? (glass, stone, metal, ceramic, wood, plastic, etc.)\n2. COLORS: What specific colors do you see?\n3. SHAPES: What shapes are the beads? (round, oval, cylindrical, faceted, etc.)\n4. SIZE: How large do they appear to be?\n5. FINISH: What type of finish do they have? (glossy, matte, textured, etc.)\n6. BEAD TYPE: What specific type of beads are these? (seed beads, gemstone beads, glass beads, etc.)\n\nBe specific and detailed in your analysis as this will help identify the exact type of beads for jewelry making purposes."
                    },
                    {
                      inline_data: {
                        mime_type: imageFile.type,
                        data: base64Image
                      }
                    }
                  ]
                }],
                generationConfig: {
                  temperature: 0.4,
                  topK: 32,
                  topP: 1,
                  maxOutputTokens: 300,
                }
              })
            }
          );

          console.log('📡 Gemini response status:', geminiResponse.status);

          if (geminiResponse.ok) {
            const geminiResult = await geminiResponse.json();
            console.log('✅ Gemini analysis received');
            
            if (geminiResult.candidates && geminiResult.candidates[0]?.content?.parts[0]?.text) {
              description = geminiResult.candidates[0].content.parts[0].text;
              analysisMethod = 'Gemini-1.5-Flash-FREE';
              console.log('📝 Gemini description received');
            } else {
              console.log('⚠️ Gemini response structure unexpected:', JSON.stringify(geminiResult));
              debugInfo.gemini_error = 'Unexpected response structure';
            }
          } else {
            const errorText = await geminiResponse.text();
            console.log('❌ Gemini failed:', geminiResponse.status, errorText);
            debugInfo.gemini_error = `HTTP ${geminiResponse.status}: ${errorText}`;
          }
        } catch (error) {
          console.log('⚠️ Gemini error:', error);
          debugInfo.gemini_error = error.message;
        }
      } else {
        console.log('⚠️ No Google API key configured');
        debugInfo.gemini_error = 'No API key configured';
      }

      // Fallback to Hugging Face if Gemini fails
      if (!description && env.HF_API_TOKEN) {
        console.log('🔄 Falling back to Hugging Face...');
        debugInfo.hf_attempted = true;
        try {
          const hfResponse = await fetch(
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

          console.log('📡 HF response status:', hfResponse.status);

          if (hfResponse.ok) {
            const result = await hfResponse.json();
            console.log('✅ HF result:', result);
            if (result && Array.isArray(result) && result[0]?.generated_text) {
              description = result[0].generated_text;
              analysisMethod = 'HuggingFace-Fallback';
            } else {
              debugInfo.hf_error = 'Unexpected response structure';
            }
          } else {
            const errorText = await hfResponse.text();
            console.log('❌ HF failed:', hfResponse.status, errorText);
            debugInfo.hf_error = `HTTP ${hfResponse.status}: ${errorText}`;
          }
        } catch (error) {
          console.log('❌ HuggingFace fallback failed:', error);
          debugInfo.hf_error = error.message;
        }
      } else if (!description) {
        console.log('⚠️ No HuggingFace API token configured');
        debugInfo.hf_error = 'No API token configured';
      }

      // Ultimate fallback with detailed error info
      if (!description) {
        return new Response(JSON.stringify({
          error: 'Unable to analyze image at this time. Please try again later.',
          debug: {
            error_message: 'All AI services unavailable',
            details: debugInfo,
            timestamp: new Date().toISOString(),
            suggestions: [
              env.GOOGLE_API_KEY ? null : 'Google API key not configured',
              env.HF_API_TOKEN ? null : 'HuggingFace token not configured',
            ].filter(Boolean)
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
      const suggestions = findMatchingBeads(analysis, analysisMethod.includes('Fallback'));

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
          analysis_method: analysisMethod,
          timestamp: new Date().toISOString(),
          ...debugInfo
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

function analyzeDescription(description: string) {
  const beadKeywords = {
    materials: {
      glass: ['glass', 'crystal', 'transparent', 'clear', 'shiny', 'smooth', 'translucent', 'vitreous'],
      metal: ['metal', 'silver', 'gold', 'copper', 'bronze', 'brass', 'metallic', 'steel', 'aluminum'],
      stone: ['stone', 'marble', 'granite', 'quartz', 'agate', 'natural', 'jasper', 'rock', 'mineral', 'gemstone', 'jade', 'turquoise'],
      wood: ['wood', 'wooden', 'natural', 'brown', 'grain', 'timber', 'bamboo'],
      ceramic: ['ceramic', 'porcelain', 'clay', 'glazed', 'pottery', 'fired'],
      plastic: ['plastic', 'acrylic', 'synthetic', 'resin', 'polymer'],
      pearl: ['pearl', 'nacre', 'lustrous', 'iridescent', 'mother-of-pearl'],
      seed: ['seed', 'small', 'tiny', 'delicate', 'fine']
    },
    colors: {
      blue: ['blue', 'navy', 'cobalt', 'azure', 'sapphire', 'turquoise', 'aqua', 'teal', 'cerulean'],
      red: ['red', 'crimson', 'ruby', 'burgundy', 'scarlet', 'maroon', 'cherry'],
      green: ['green', 'emerald', 'jade', 'olive', 'forest', 'lime', 'mint'],
      yellow: ['yellow', 'gold', 'amber', 'citrine', 'golden', 'lemon'],
      purple: ['purple', 'violet', 'amethyst', 'lavender', 'lilac', 'plum'],
      clear: ['clear', 'transparent', 'crystal', 'see-through', 'colorless'],
      black: ['black', 'ebony', 'onyx', 'dark', 'jet'],
      white: ['white', 'pearl', 'ivory', 'cream', 'pale', 'snow'],
      pink: ['pink', 'rose', 'magenta', 'blush', 'salmon'],
      orange: ['orange', 'coral', 'peach', 'tangerine', 'apricot'],
      brown: ['brown', 'tan', 'beige', 'coffee', 'chocolate', 'earth', 'natural', 'umber'],
      colorful: ['colorful', 'multicolored', 'various colors', 'different colors', 'mixed colors', 'rainbow', 'varied']
    },
    shapes: {
      round: ['round', 'sphere', 'ball', 'circular', 'spherical', 'globular'],
      oval: ['oval', 'elliptical', 'egg', 'elongated', 'oblong'],
      cylinder: ['cylinder', 'tube', 'barrel', 'cylindrical', 'tubular'],
      faceted: ['faceted', 'cut', 'geometric', 'angular', 'crystalline', 'multi-sided'],
      irregular: ['irregular', 'organic', 'freeform', 'natural shape', 'random'],
      flat: ['flat', 'disc', 'coin', 'button', 'tablet'],
      small: ['small', 'tiny', 'little', 'mini', 'miniature'],
      large: ['large', 'big', 'chunky', 'oversized', 'substantial']
    },
    finishes: {
      glossy: ['glossy', 'shiny', 'polished', 'lustrous', 'reflective'],
      matte: ['matte', 'dull', 'frosted', 'non-reflective'],
      textured: ['textured', 'rough', 'bumpy', 'ridged', 'etched']
    }
  };

  const analysis = {
    materials: [] as Array<{type: string, confidence: number, matched_words: string[]}>,
    colors: [] as Array<{type: string, confidence: number, matched_words: string[]}>,
    shapes: [] as Array<{type: string, confidence: number, matched_words: string[]}>,
    finishes: [] as Array<{type: string, confidence: number, matched_words: string[]}>
  };

  const lowercaseDesc = description.toLowerCase();
  
  for (const [category, items] of Object.entries(beadKeywords)) {
    for (const [item, words] of Object.entries(items)) {
      const matches = words.filter(word => lowercaseDesc.includes(word));
      if (matches.length > 0) {
        (analysis as any)[category].push({
          type: item,
          confidence: Math.min(matches.length / words.length * 1.2, 1.0), // Boost confidence slightly
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

function findMatchingBeads(analysis: any, isFallback: boolean = false) {
  const suggestions = [];
  
  // Get top characteristics
  const topMaterial = analysis.materials[0];
  const topColor = analysis.colors[0];
  const topShape = analysis.shapes[0];
  const topFinish = analysis.finishes[0];
  
  // Material-based suggestions
  if (topMaterial?.type === 'stone') {
    suggestions.push({
      title: `Natural ${topColor?.type || ''} Stone Beads`.trim(),
      slug: 'natural-stone-beads',
      description: `Genuine natural stone beads ${topColor ? `in beautiful ${topColor.type} tones ` : ''}with unique patterns and earthy appeal`,
      confidence: isFallback ? 0.75 : 0.92,
      category: 'stone',
      tags: ['stone', 'natural', 'gemstone', topColor?.type].filter(Boolean)
    });
  }

  if (topMaterial?.type === 'glass') {
    const shapeDesc = topShape?.type === 'round' ? 'round ' : '';
    const colorDesc = topColor?.type && topColor.type !== 'clear' ? `${topColor.type} ` : '';
    suggestions.push({
      title: `${colorDesc}${shapeDesc}Glass Beads`.trim(),
      slug: 'glass-beads',
      description: `High-quality ${shapeDesc}glass beads ${colorDesc ? `in stunning ${topColor.type} ` : ''}perfect for jewelry making and crafts`,
      confidence: isFallback ? 0.70 : 0.88,
      category: 'glass',
      tags: ['glass', 'jewelry', topColor?.type, topShape?.type].filter(Boolean)
    });
  }

  if (topMaterial?.type === 'metal') {
    suggestions.push({
      title: 'Metal Accent Beads',
      slug: 'metal-beads',
      description: `Premium metal beads ${topColor ? `with ${topColor.type} finish ` : ''}that add weight and elegance to jewelry designs`,
      confidence: isFallback ? 0.75 : 0.85,
      category: 'metal',
      tags: ['metal', 'elegant', 'durable', topColor?.type].filter(Boolean)
    });
  }

  if (topMaterial?.type === 'seed') {
    suggestions.push({
      title: 'Seed Beads',
      slug: 'seed-beads',
      description: `Tiny, uniform seed beads ${topColor ? `in ${topColor.type} ` : ''}perfect for intricate beadwork and detailed patterns`,
      confidence: isFallback ? 0.80 : 0.90,
      category: 'seed',
      tags: ['seed', 'small', 'detailed', 'beadwork', topColor?.type].filter(Boolean)
    });
  }

  if (topMaterial?.type === 'pearl') {
    suggestions.push({
      title: 'Pearl Beads',
      slug: 'pearl-beads',
      description: 'Lustrous pearl beads with natural iridescence and timeless elegance',
      confidence: isFallback ? 0.75 : 0.88,
      category: 'pearl',
      tags: ['pearl', 'lustrous', 'elegant', 'classic']
    });
  }

  // Shape-based suggestions
  if (topShape?.type === 'faceted') {
    suggestions.push({
      title: 'Faceted Crystal Beads',
      slug: 'faceted-crystal',
      description: `Multi-faceted beads ${topColor ? `in ${topColor.type} ` : ''}that sparkle and catch light beautifully`,
      confidence: isFallback ? 0.70 : 0.82,
      category: 'crystal',
      tags: ['faceted', 'crystal', 'sparkle', topColor?.type].filter(Boolean)
    });
  }

  // Multi-color suggestions
  if (analysis.colors.length > 2 || topColor?.type === 'colorful') {
    suggestions.push({
      title: 'Mixed Color Bead Collection',
      slug: 'mixed-color-beads',
      description: 'Diverse assortment of beads in multiple colors for vibrant, creative jewelry projects',
      confidence: isFallback ? 0.65 : 0.78,
      category: 'mixed',
      tags: ['colorful', 'variety', 'creative', 'assorted']
    });
  }

  // Ensure we have at least one suggestion
  if (suggestions.length === 0) {
    suggestions.push({
      title: 'Artisan Craft Beads',
      slug: 'craft-beads',
      description: 'Quality beads perfect for handmade jewelry and creative craft projects',
      confidence: 0.65,
      category: 'craft',
      tags: ['craft', 'handmade', 'creative', 'quality']
    });
  }
  
  // Return top 3 suggestions
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}