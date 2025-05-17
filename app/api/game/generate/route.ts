import { NextRequest, NextResponse } from 'next/server';
import { generateResponse } from '@/lib/geminiService';
import { 
  containsProhibitedContent, 
  filterProhibitedContent, 
  getContentWarningMessage,
  isEducationalResponse
} from '@/lib/contentFilter';

export async function POST(req: NextRequest) {
  try {
    const { command, context, genre } = await req.json();
    
    if (!command?.trim()) {
      return NextResponse.json({ error: 'Command required' }, { status: 400 });
    }

    // Check content
    if (containsProhibitedContent(command)) {
      return NextResponse.json({ 
        response: "Let's keep our story family-friendly! Try rephrasing that." 
      });
    }
    
    console.log(`Processing command: "${command}", genre: ${genre || 'none'}`);
    
    // Get response
    const response = await generateResponse(command, context, genre);
    const filtered = filterProhibitedContent(response);
    
    // Check if the response is educational about inappropriate content
    if (isEducationalResponse(response)) {
      // If it's an educational response, don't filter it
      return NextResponse.json({ response });
    }
    
    // Return the filtered response
    return NextResponse.json({ response: filtered });
    
  } catch (err: any) {
    console.error('Generation error:', err);
    return NextResponse.json(
      { error: 'Failed to continue story', details: err.message },
      { status: 500 }
    );
  }
} 