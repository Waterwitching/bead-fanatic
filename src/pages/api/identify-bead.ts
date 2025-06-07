// API endpoint to proxy requests to the Cloudflare Worker
export async function POST({ request }: { request: Request }) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    
    // Forward the request to your Cloudflare Worker
    // Replace with your actual worker URL when deployed
    const workerUrl = 'https://bead-identifier.YOUR_SUBDOMAIN.workers.dev';
    
    const response = await fetch(workerUrl, {
      method: 'POST',
      body: formData,
      // Forward headers
      headers: {
        // Don't set Content-Type - let the browser set it for FormData
      }
    });

    if (!response.ok) {
      throw new Error(`Worker responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Return the response from the worker
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('Error in bead identification API:', error);
    
    // Handle TypeScript error typing
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(JSON.stringify({
      error: 'Failed to identify bead. Please try again.',
      details: errorMessage
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}
