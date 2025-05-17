import { NextRequest, NextResponse } from 'next/server';
import { generateAIResponse } from '@/lib/geminiService';
import { 
  containsProhibitedContent, 
  filterProhibitedContent, 
  getContentWarningMessage,
  isEducationalResponse
} from '@/lib/contentFilter';

export async function POST(req: NextRequest) {
  try {
    // Parse the JSON request body
    const body = await req.json();
    const { command, context, genre } = body;
    
    if (!command) {
      return NextResponse.json(
        { error: 'Command is required' },
        { status: 400 }
      );
    }

    // Check for prohibited content in the command
    if (containsProhibitedContent(command)) {
      return NextResponse.json(
        { response: getContentWarningMessage() },
        { status: 200 }
      );
    }
    
    console.log(`API route received: command="${command}", genre="${genre || 'not specified'}"`);
    
    // Generate the AI response
    const response = await generateAIResponse(command, context, genre);
    
    // Check if the response is educational about inappropriate content
    if (isEducationalResponse(response)) {
      // If it's an educational response, don't filter it
      return NextResponse.json({ response });
    }
    
    // Otherwise, filter any prohibited content from AI response
    const filteredResponse = filterProhibitedContent(response);
    
    // Return the filtered response
    return NextResponse.json({ response: filteredResponse });
    
  } catch (error: any) {
    console.error('Error generating AI response:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate response', details: error.message },
      { status: 500 }
    );
  }
} 