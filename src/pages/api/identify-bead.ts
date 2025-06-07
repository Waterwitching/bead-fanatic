// API endpoint to proxy requests to the Cloudflare Worker
export async function POST({ request }: { request: Request }) {
  try {
    console.log('🔗 API route called, forwarding to worker...');
    
    // Get the form data from the request
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      console.error('❌ No image file in request');
      return new Response(JSON.stringify({
        error: 'No image provided'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('📸 Image file received:', {
      name: imageFile.name,
      size: imageFile.size,
      type: imageFile.type
    });
    
    // Forward the request to your Cloudflare Worker
    const workerUrl = 'https://bead-identifier.eroewen.workers.dev';
    console.log('🚀 Calling worker at:', workerUrl);
    
    const response = await fetch(workerUrl, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type - let the browser set it for FormData
    });

    console.log('📡 Worker response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Worker error:', response.status, errorText);
      throw new Error(`Worker responded with status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Worker response received, analysis method:', data.debug?.analysis_method);
    
    // Return the response from the worker
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('💥 Error in bead identification API:', error);
    
    // Handle TypeScript error typing
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(JSON.stringify({
      error: 'Failed to identify bead. Please try again.',
      details: errorMessage,
      debug: {
        timestamp: new Date().toISOString(),
        error_type: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}