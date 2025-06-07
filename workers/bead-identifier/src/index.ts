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

      // Convert to base64 using safe method
      const imageBuffer = await imageFile.arrayBuffer();
      const base64Image = arrayBufferToBase64(imageBuffer);

      console.log('🔄 Converted to base64, length:', base64Image.length);

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

      // Use Hugging Face Inference API for image description
      console.log('🤖 Calling Hugging Face API...');
      const aiResponse = await fetch(
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
      console.log('✅ AI Result received');
      
      const description = result[0]?.generated_text || 'Unable to generate description';
      console.log('📝 Final description:', description);

      // Simple response for now to test basic functionality
      const response = {
        description,
        status: 'success',
        debug: {
          image_info: {
            size: imageFile.size,
            type: imageFile.type,
            name: imageFile.name
          },
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
