import { NextResponse } from 'next/server';

// Types for Stable Horde API
type ImageRequest = {
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
  r2?: boolean;
};

type ImageResponse = {
  id: string;
  kudos: number;
  message?: string;
};

type StatusResponse = {
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

type GeneratedImage = {
  img: string;
  seed: number;
  id: string;
};

export async function POST(request: Request) {
  try {
    const { prompt, width = 512, height = 512 } = await request.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    console.log('Generating image:', prompt.substring(0, 100));

    // Get API key from env
    const apiKey = process.env.HORDE_API_KEY || '0000000000';
    if (apiKey === '0000000000') {
      console.warn('Using anonymous key - expect rate limits');
    }
    
    // Build the prompt
    const enhancedPrompt = `${prompt}, cinematic lighting, detailed, realistic`;
    const negativePrompt = "(text), (writing), (letters), (numbers), (words), (font), (type), (typography), watermark, caption, label, signature, logo, (worst quality), (low quality), (blurry), artifacts";
    
    // Request payload
    const payload: ImageRequest = {
      prompt: enhancedPrompt,
      negative_prompt: negativePrompt,
      params: {
        width: Number(width),
        height: Number(height),
        steps: 30,
        cfg_scale: 7.5,
        sampler_name: 'k_euler_a',
        n: 1,
      },
      nsfw: false,
      models: ['stable_diffusion'],
      r2: false,
    };

    // Submit request
    let res = await fetch('https://stablehorde.net/api/v2/generate/async', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('Failed to submit:', { status: res.status, error });
      
      if (res.status === 429) {
        return NextResponse.json({ error: 'Rate limit hit - try again later' }, { status: 429 });
      }
      
      if (res.status === 401) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }
      
      return NextResponse.json({ error: `Request failed: ${error}` }, { status: res.status || 500 });
    }

    const { id } = await res.json();
    if (!id) {
      return NextResponse.json({ error: 'No generation ID received' }, { status: 500 });
    }

    console.log('Generation started:', id);

    // Poll for completion
    let retries = 0;
    const maxRetries = 30;
    let waitTime = 6000;
    let done = false;
    
    while (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 15000)));
      waitTime *= 1.2;
      
      try {
        res = await fetch(`https://stablehorde.net/api/v2/generate/check/${id}`, {
          headers: { 'apikey': apiKey }
        });

        if (!res.ok) {
          const error = await res.text();
          
          if (res.status === 429) {
            console.log('Rate limited, waiting...');
            await new Promise(resolve => setTimeout(resolve, 15000));
            continue;
          }

          console.error('Status check failed:', error);
          if (retries === maxRetries - 1) {
            return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
          }
          continue;
        }

        const status: StatusResponse = await res.json();
        
        if (status.done) {
          console.log('Generation complete');
          done = true;
          break;
        }
        
        console.log(`Poll ${retries + 1}: Queue ${status.queue_position}, Wait ${status.wait_time}s`);
        
        if (status.queue_position > 50) {
          waitTime = Math.min(waitTime * 1.5, 15000);
        }
        
        retries++;
      } catch (err) {
        console.error('Poll error:', err);
        await new Promise(resolve => setTimeout(resolve, 10000));
        retries++;
      }
    }

    if (!done) {
      console.error('Timed out after', maxRetries, 'retries');
      return NextResponse.json({ error: 'Generation timed out' }, { status: 500 });
    }

    // Get the result
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      console.log('Fetching result...');
      res = await fetch(`https://stablehorde.net/api/v2/generate/status/${id}`, {
        headers: { 'apikey': apiKey }
      });

      if (!res.ok) {
        console.error('Failed to get result:', await res.text());
        return NextResponse.json({ error: 'Failed to get result' }, { status: 500 });
      }

      const data = await res.json();
      const image = data?.generations?.[0];

      if (!image?.img) {
        console.error('No image data found');
        return NextResponse.json({ error: 'No image generated' }, { status: 500 });
      }

      console.log('Success!');
      return NextResponse.json({ 
        image: image.img,
        seed: image.seed
      });

    } catch (err) {
      console.error('Error getting result:', err);
      return NextResponse.json({ error: 'Failed to process result' }, { status: 500 });
    }

  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 