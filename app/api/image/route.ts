import { NextResponse } from 'next/server';

type HordeGenerationRequest = {
  prompt: string;
  negative_prompt?: string;
  params?: {
    width?: number;
    height?: number;
    steps?: number;
    cfg_scale?: number;
    sampler_name?: string;
    n?: number;
  };
  nsfw?: boolean;
  models?: string[];
  replacement_filter?: boolean;
  source_image?: string;
  source_processing?: string;
  source_mask?: string;
  r2?: boolean; // Set to false to get base64 data directly
  shared?: boolean;
  censor_nsfw?: boolean;
  trusted_workers?: boolean;
  slow_workers?: boolean;
  worker_blacklist?: string[];
  worker_id?: string[];
};

type HordeGenerationResponse = {
  id: string;
  kudos: number;
  message?: string;
};

type HordeStatusResponse = {
  done: boolean;
  wait_time: number;
  queue_position: number;
  kudos: number;
  is_possible: boolean;
  processing: boolean;
  finished: number;
  faulted: boolean;
  waiting: number;
};

type HordeGeneratedImage = {
  img: string; // base64 image or URL
  seed: number;
  id: string;
};

export async function POST(request: Request) {
  try {
    // Extract the prompt from the request
    const body = await request.json();
    const { prompt, width = 512, height = 512 } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Valid prompt is required' },
        { status: 400 }
      );
    }

    console.log('Starting image generation for prompt:', prompt.substring(0, 100));

    // Prepare the request to Stable Horde
    const apiKey = process.env.HORDE_API_KEY || '0000000000'; // Anonymous API key fallback
    
    if (!apiKey || apiKey === '0000000000') {
      console.warn('Using anonymous API key - this may cause rate limits or failures');
    }
    
    // Add negative prompts to avoid text and improve quality
    const enhancedPrompt = `${prompt}, cinematic lighting, detailed, realistic`;
    const negativePrompt = "(text:1.5), (writing:1.5), (letters:1.4), (numbers:1.4), (words:1.5), (font:1.4), (type:1.4), (typography:1.4), watermark, caption, label, signature, logo, (worst quality:1.4), (low quality:1.4), (blurry:1.4), artifacts, unclear, indistinct";
    
    // Start with a simpler payload
    const payload: HordeGenerationRequest = {
      prompt: enhancedPrompt,
      negative_prompt: negativePrompt,
      params: {
        width: Number(width),  // Use provided width or default to 512
        height: Number(height), // Use provided height or default to 512
        steps: 30, // Reduced steps
        cfg_scale: 7.5,
        sampler_name: 'k_euler_a', // More reliable sampler
        n: 1,
      },
      nsfw: false,
      models: ['stable_diffusion'],
      r2: false,
    };

    // Submit the generation request
    let generationResponse: Response;
    try {
      generationResponse = await fetch(
        'https://stablehorde.net/api/v2/generate/async',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!generationResponse.ok) {
        const errorText = await generationResponse.text();
        console.error('Failed to submit image generation request:', {
          status: generationResponse.status,
          statusText: generationResponse.statusText,
          error: errorText,
          payload: JSON.stringify(payload),
        });
        
        // Check for specific error cases
        if (generationResponse.status === 429) {
          return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again later.' },
            { status: 429 }
          );
        }
        
        if (generationResponse.status === 401) {
          return NextResponse.json(
            { error: 'Invalid API key or authentication failed' },
            { status: 401 }
          );
        }
        
        return NextResponse.json(
          { error: `Failed to submit image generation request: ${errorText}` },
          { status: generationResponse.status || 500 }
        );
      }
    } catch (error: any) {
      console.error('Network error during image generation request:', error);
      return NextResponse.json(
        { error: 'Network error during image generation request' },
        { status: 500 }
      );
    }

    const generationData: HordeGenerationResponse = await generationResponse.json();
    const { id } = generationData;

    if (!id) {
      return NextResponse.json(
        { error: 'Failed to get generation ID' },
        { status: 500 }
      );
    }

    console.log(`Generation request submitted with ID: ${id}`);

    // Poll for image generation completion
    let statusResponse: Response;
    let statusData: HordeStatusResponse;
    let retries = 0;
    const maxRetries = 30; // Increased to allow for longer queue times
    let waitTime = 6000; // Start with 6 seconds between polls
    let imageGenerated = false;
    
    while (retries < maxRetries) {
      try {
        // Exponential backoff with max of 15 seconds
        await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 15000)));
        waitTime *= 1.2; // Increase wait time by 20% each retry
        
        // Check generation status
        statusResponse = await fetch(
          `https://stablehorde.net/api/v2/generate/check/${id}`,
          {
            headers: {
              'apikey': apiKey,
            },
          }
        );

        if (!statusResponse.ok) {
          const error = await statusResponse.text();
          let errorData;
          try {
            errorData = JSON.parse(error);
          } catch {
            errorData = { message: error };
          }

          // Handle rate limit specifically
          if (statusResponse.status === 429 || (errorData?.message && errorData.message.includes('per 1 minute'))) {
            console.log('Rate limit hit, waiting longer before next retry...');
            await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds
            continue; // Skip this iteration but don't count it as a retry
          }

          console.error('Failed to check image generation status:', errorData);
          if (retries === maxRetries - 1) { // Only return error on last retry
            return NextResponse.json(
              { error: 'Failed to check image generation status' },
              { status: 500 }
            );
          }
          continue;
        }

        statusData = await statusResponse.json();
        
        // Check if generation is complete
        if (statusData.done) {
          console.log('Generation completed successfully');
          imageGenerated = true;
          break;
        }
        
        // Log status with queue position and wait time
        console.log(`Poll ${retries + 1}: Position ${statusData.queue_position}, Wait time: ${statusData.wait_time}s`);
        
        // If we're far in queue, wait longer
        if (statusData.queue_position > 50) {
          waitTime = Math.min(waitTime * 1.5, 15000);
        }
        
        retries++;
      } catch (error) {
        console.error('Error during status check:', error);
        // Wait a bit longer after an error
        await new Promise(resolve => setTimeout(resolve, 10000));
        retries++;
      }
    }

    // Check if we actually got an image
    if (!imageGenerated) {
      console.error('Image generation timed out after', maxRetries, 'retries');
      return NextResponse.json(
        { error: 'Image generation timed out. Please try again.' },
        { status: 500 }
      );
    }

    // Additional delay to ensure the image is fully processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Retrieve the generated image
    try {
      console.log('Fetching completed generation...');
      const completeRequest = await fetch(
        `https://stablehorde.net/api/v2/generate/status/${id}`,
        {
          headers: {
            'apikey': apiKey,
          },
        }
      );

      if (!completeRequest.ok) {
        const error = await completeRequest.text();
        console.error('Failed to retrieve completed generation:', error);
        return NextResponse.json(
          { error: 'Failed to retrieve completed generation' },
          { status: 500 }
        );
      }

      const completeData = await completeRequest.json();

      // Check if we have a valid generation with image data
      if (!completeData?.generations || completeData.generations.length === 0) {
        console.error('No generations found in the response');
        return NextResponse.json(
          { error: 'No image was generated' },
          { status: 500 }
        );
      }

      const generation = completeData.generations[0];
      
      if (!generation?.img) {
        console.error('No img field in the generation');
        return NextResponse.json(
          { error: 'No image data was found in the generation' },
          { status: 500 }
        );
      }

      // Always return the base64 data directly
      console.log('Successfully retrieved image data');
      return NextResponse.json({ 
        image: generation.img,
        seed: generation.seed
      });
    } catch (error: any) {
      console.error('Error processing generated image:', error.message || error);
      return NextResponse.json(
        { error: 'Failed to process image data' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in image generation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 