import { NextRequest, NextResponse } from 'next/server';
import GeminiKeyManager from '@/lib/geminiKeyManager';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Simple test to validate if a Gemini API key works
async function testGeminiKey(key: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Simple prompt to test the key
    const result = await model.generateContent("Say hello");
    const text = result.response.text();
    
    return { valid: true };
  } catch (error: any) {
    return { 
      valid: false, 
      error: error.message || "Unknown error"
    };
  }
}

// Admin-only route to check the status of API keys
export async function GET(request: NextRequest) {
  try {
    // You might want to add authentication here in a real application
    // This is for demonstration purposes and should be protected
    
    const keyManager = GeminiKeyManager.getInstance();
    
    // Get additional information about keys if requested
    const url = new URL(request.url);
    const validateParam = url.searchParams.get('validate');
    
    // Basic status info
    const statusData = {
      totalKeys: keyManager.getTotalKeysCount(),
      availableKeys: keyManager.getAvailableKeysCount(),
      currentKeyIndex: keyManager.getCurrentKeyIndex() + 1, // Convert to 1-based for display
    };
    
    // If validation was requested, test the keys
    if (validateParam === 'true') {
      const keyValidations = [];
      
      // Test each key
      for (let i = 1; i <= 5; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key) {
          console.log(`Testing Gemini API key ${i}...`);
          const result = await testGeminiKey(key);
          keyValidations.push({
            keyNumber: i,
            valid: result.valid,
            error: result.error
          });
        }
      }
      
      return NextResponse.json({
        ...statusData,
        keyValidations
      });
    }
    
    return NextResponse.json(statusData);
    
  } catch (error: any) {
    console.error('Error getting key status:', error);
    
    return NextResponse.json(
      { error: 'Failed to get key status', details: error.message },
      { status: 500 }
    );
  }
} 