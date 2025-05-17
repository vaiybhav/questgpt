import { NextResponse } from 'next/server';
import GeminiKeyManager from '@/lib/geminiKeyManager';

// Admin-only route to manually mark the current key as exhausted (for testing)
export async function POST() {
  try {
    // You might want to add authentication here in a real application
    // This is for demonstration purposes and should be protected
    
    const keyManager = GeminiKeyManager.getInstance();
    const oldKeyIndex = keyManager.getCurrentKeyIndex() + 1; // Convert to 1-based for display
    
    keyManager.markCurrentKeyExhausted();
    
    const newKeyIndex = keyManager.getCurrentKeyIndex() + 1; // Convert to 1-based for display
    const availableKeys = keyManager.getAvailableKeysCount();
    
    return NextResponse.json({
      success: true,
      message: `Key #${oldKeyIndex} marked as exhausted. Now using key #${newKeyIndex}.`,
      availableKeys,
      totalKeys: keyManager.getTotalKeysCount()
    });
    
  } catch (error: any) {
    console.error('Error exhausting key:', error);
    
    return NextResponse.json(
      { error: 'Failed to exhaust key', details: error.message },
      { status: 500 }
    );
  }
} 