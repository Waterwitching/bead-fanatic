export interface Env {
  HF_API_TOKEN: string;
  BEAD_DATA: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://beadfanatic.co.uk',
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

      // Convert to base64 for AI processing
      const imageBuffer = await imageFile.arrayBuffer();
      const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

      // Use Hugging Face Inference API for image description
      const response = await fetch(
        'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large',
        {
          headers: {
            'Authorization': `Bearer ${env.HF_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify({
            inputs: base64Image,
            parameters: {
              max_length: 100,
              num_beams: 4
            }
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const result = await response.json();
      const description = result[0]?.generated_text || 'Unable to generate description';

      // Enhanced analysis with keyword matching
      const analysis = analyzeDescription(description);
      
      // Find matching beads based on analysis
      const suggestions = await findMatchingBeads(analysis, env.BEAD_DATA);

      return new Response(JSON.stringify({
        description,
        analysis,
        suggestions
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });

    } catch (error) {
      console.error('Error identifying bead:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to identify bead. Please try again.' 
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
      stone: ['stone', 'marble', 'granite', 'quartz', 'agate', 'natural'],
      wood: ['wood', 'wooden', 'natural', 'brown', 'grain'],
      ceramic: ['ceramic', 'porcelain', 'clay', 'glazed'],
      plastic: ['plastic', 'acrylic', 'synthetic']
    },
    types: {
      venetian: ['venetian', 'murano', 'italy', 'italian', 'gold leaf', 'aventurine'],
      seed: ['seed', 'small', 'tiny', 'round', 'uniform'],
      czech: ['czech', 'bohemian', 'fire polished'],
      pearl: ['pearl', 'lustrous', 'round', 'white', 'cream', 'nacre'],
      lampwork: ['lampwork', 'handmade', 'artisan', 'swirl', 'pattern']
    },
    shapes: {
      round: ['round', 'sphere', 'ball', 'circular'],
      oval: ['oval', 'elliptical', 'egg'],
      cylinder: ['cylinder', 'tube', 'barrel'],
      disc: ['disc', 'flat', 'coin'],
      irregular: ['irregular', 'organic', 'freeform']
    },
    colors: {
      blue: ['blue', 'navy', 'cobalt', 'azure', 'sapphire'],
      red: ['red', 'crimson', 'ruby', 'burgundy'],
      green: ['green', 'emerald', 'jade', 'olive'],
      yellow: ['yellow', 'gold', 'amber', 'citrine'],
      purple: ['purple', 'violet', 'amethyst', 'lavender'],
      clear: ['clear', 'transparent', 'crystal']
    }
  };

  const analysis = {
    materials: [] as Array<{type: string, confidence: number, matched_words: string[]}>,
    types: [] as Array<{type: string, confidence: number, matched_words: string[]}>,
    shapes: [] as Array<{type: string, confidence: number, matched_words: string[]}>,
    colors: [] as Array<{type: string, confidence: number, matched_words: string[]}>
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

async function findMatchingBeads(analysis: any, kvStore: KVNamespace) {
  // This would normally query your bead database
  // For now, return mock suggestions based on analysis
  
  const suggestions = [];
  
  // Check for Venetian glass indicators
  const hasVenetianIndicators = analysis.types.some((t: any) => t.type === 'venetian') ||
                                analysis.materials.some((m: any) => m.type === 'glass');
  
  if (hasVenetianIndicators) {
    suggestions.push({
      title: 'Venetian Glass Beads',
      slug: 'venetian-glass',
      description: 'Traditional Italian glass beads with distinctive patterns',
      confidence: 0.85,
      category: 'glass',
      tags: ['venetian', 'glass', 'luxury']
    });
  }
  
  // Check for seed bead indicators
  const hasSeedIndicators = analysis.types.some((t: any) => t.type === 'seed') ||
                           analysis.shapes.some((s: any) => s.type === 'round');
  
  if (hasSeedIndicators) {
    suggestions.push({
      title: 'Seed Beads',
      slug: 'seed-beads',
      description: 'Small, uniform beads perfect for detailed beadwork',
      confidence: 0.75,
      category: 'glass',
      tags: ['seed', 'small', 'beadwork']
    });
  }
  
  // Add more logic for other bead types based on analysis
  
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}