import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Safety error patterns
const SAFETY_BLOCK_PATTERN = /(blocked due to SAFETY|safety settings|harmful|content policy|violates|inappropriate content)/i;

export async function POST(req: NextRequest) {
  try {
    // Parse the JSON request body
    const body = await req.json();
    const { key, prompt } = body;
    
    if (!key) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }
    
    const testPrompt = prompt || "Respond with a short hello message";
    console.log(`Testing Gemini API key with prompt: "${testPrompt}"`);
    
    try {
      // Initialize the API with the provided key
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ]
      });
      
      // Make a simple test request
      const result = await model.generateContent(testPrompt);
      const text = result.response.text();
      
      return NextResponse.json({
        success: true,
        key_valid: true,
        response: text
      });
    } catch (apiError: any) {
      console.error("Gemini API error:", apiError);
      
      // Check if this is a safety block
      const errorMessage = apiError?.message || '';
      if (SAFETY_BLOCK_PATTERN.test(errorMessage)) {
        return NextResponse.json({
          success: false,
          key_valid: true, // The key is valid, but content was blocked
          error: "The API request was blocked by safety filters. Please try a different prompt.",
          friendly_message: "I notice the request might not be appropriate. Please try with more family-friendly content.",
          details: "Content was blocked by safety filters"
        });
      }
      
      return NextResponse.json({
        success: false,
        key_valid: false,
        error: apiError.message,
        details: apiError.details || apiError.stack || JSON.stringify(apiError)
      });
    }
    
  } catch (error: any) {
    console.error('Error testing Gemini API:', error);
    
    return NextResponse.json(
      { error: 'Failed to test API key', details: error.message },
      { status: 500 }
    );
  }
} 