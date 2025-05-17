import { HarmCategory, HarmBlockThreshold, GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import GeminiKeyManager from './geminiKeyManager';

// Error codes and messages we expect from Gemini API for quota/key issues
const ERROR_PATTERNS = {
  QUOTA_EXCEEDED: /(quota exceeded|resource exhausted|limit reached|usage limit)/i,
  INVALID_KEY: /(api key not valid|invalid api key|authentication failed|unauthorized)/i,
  PERMISSION_DENIED: /(permission denied|access denied)/i,
  SAFETY_BLOCK: /(blocked due to SAFETY|safety settings|harmful|content policy|violates|inappropriate content)/i
};

export async function generateAIResponse(command: string, context: string = "", genre: string = ""): Promise<string> {
  const keyManager = GeminiKeyManager.getInstance();
  let attempts = 0;
  const maxAttempts = keyManager.getTotalKeysCount() + 1; // +1 to allow for one retry with all keys
  
  console.log(`Starting generateAIResponse with command: "${command.substring(0, 20)}..."`);
  console.log(`Genre: ${genre || "Not specified"}`);
  console.log(`Available keys: ${keyManager.getAvailableKeysCount()}/${keyManager.getTotalKeysCount()}`);
  
  // Try each key with some delay between attempts to avoid rate limits
  while (attempts < maxAttempts) {
    attempts++;
    try {
      console.log(`Attempt ${attempts}/${maxAttempts} - Using key #${keyManager.getCurrentKeyIndex() + 1}`);
      
      // Get the current active Gemini instance
      const genAI = await keyManager.getActiveGenAI();
      
      // Configure the model - using Gemini-2.0-flash with less restrictive safety settings
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
        ],
        // Add generation config for more robust outputs
        generationConfig: {
          temperature: 0.8,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1024,
        }
      });
      
      // Create the prompt
      let prompt = "";
      const genreContext = genre ? `This is a ${genre.toLowerCase()} adventure.` : "";
      
      if (context) {
        prompt = `You are the AI that powers QuestGPT, a text-based interactive adventure game. ${genreContext}

Here's the story so far:
${context}

The player's command is: "${command}"

IMPORTANT CONTENT MODERATION INSTRUCTIONS:
1. Allow mature themes and topics including dating, romance, relationships, and non-explicit references to sex or adult activities.
2. Only filter extremely offensive language like racial slurs, extreme hate speech, or explicit graphic sexual content.
3. Be comfortable discussing dating, relationships, flirting, and adult topics in a tasteful, non-explicit way.
4. Only provide educational responses about inappropriate content when extreme slurs or hate speech are used.

If the player's command contains extreme slurs or hate speech, provide a brief educational response. Otherwise:

Your role is to FOLLOW THE PLAYER'S LEAD and help develop the world and characters THEY want to create. If they describe a character, setting, or plot element, incorporate it exactly as they describe. Be concise and to the point.

Important rules:
- Keep responses under 100 words unless the player specifically requests more detail
- Ask questions about what they'd like to see in the story when appropriate
- If the player wants to introduce new characters, settings, or plot elements, let them do so freely
- Present clear choices or options when the player seems unsure
- The player's creative direction always overrides any predetermined storyline

Respond now with a brief, engaging continuation based on the player's command.`;
      } else {
        prompt = `You are the AI that powers QuestGPT, a text-based interactive adventure game. ${genreContext}

The player has entered the command: "${command}".

IMPORTANT CONTENT MODERATION INSTRUCTIONS:
1. Allow mature themes and topics including dating, romance, relationships, and non-explicit references to sex or adult activities.
2. Only filter extremely offensive language like racial slurs, extreme hate speech, or explicit graphic sexual content.
3. Be comfortable discussing dating, relationships, flirting, and adult topics in a tasteful, non-explicit way.
4. Only provide educational responses about inappropriate content when extreme slurs or hate speech are used.

If the player's command contains extreme slurs or hate speech, provide a brief educational response. Otherwise:

Your role is to FOLLOW THE PLAYER'S LEAD and help them create the adventure THEY want to experience. 

Important rules:
- Keep responses under 100 words unless the player specifically requests more detail
- If the player wants to create specific characters, settings, or plot elements, incorporate them exactly as described
- If this is the first command, ask them what kind of adventure they want to create or what characters they'd like to play as
- Present clear choices and let the player know they can shape the world however they wish
- The player's creative direction always overrides any predetermined storyline

Respond now with a brief, engaging response that encourages the player to take control of their adventure.`;
      }
      
      console.log(`Sending prompt to Gemini (length: ${prompt.length} chars)`);
      console.log(`Prompt sample: "${prompt.substring(0, 100)}..."`);
      
      // Generate content with improved error handling
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      if (!text || text.trim().length === 0) {
        throw new Error("Empty response from Gemini API");
      }
      
      console.log(`Successfully generated response using key #${keyManager.getCurrentKeyIndex() + 1}`);
      return text;
      
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || '';
      console.error(`Error with Gemini API (key #${keyManager.getCurrentKeyIndex() + 1}):`, error);
      console.error(`Full error details:`, JSON.stringify(error, null, 2));
      
      // Check if this is a safety block
      if (ERROR_PATTERNS.SAFETY_BLOCK.test(errorMessage)) {
        console.warn("Content was blocked by Gemini's safety filters");
        return "I notice the conversation is heading in a direction that might not be appropriate. Could you please rephrase your request with more family-friendly language? I'm here to help create a fun adventure story we can both enjoy!";
      }
      
      // Check if this is a quota or authentication error
      if (
        ERROR_PATTERNS.QUOTA_EXCEEDED.test(errorMessage) ||
        ERROR_PATTERNS.INVALID_KEY.test(errorMessage) ||
        ERROR_PATTERNS.PERMISSION_DENIED.test(errorMessage) ||
        error?.status === 429 || // Too Many Requests
        error?.status === 401 || // Unauthorized
        error?.status === 403    // Forbidden
      ) {
        console.warn(`Key #${keyManager.getCurrentKeyIndex() + 1} exhausted or invalid. Rotating to next key.`);
        keyManager.markCurrentKeyExhausted();
        
        // If we still have available keys, retry
        if (keyManager.getAvailableKeysCount() > 0) {
          console.log(`Retrying with key #${keyManager.getCurrentKeyIndex() + 1}`);
          // Add a small delay before trying the next key to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
      }
      
      // Try a direct call with a simple test to see if the API is working at all
      try {
        console.log("Attempting direct test of Gemini API...");
        const directTest = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_1 || "");
        const testModel = directTest.getGenerativeModel({ model: "gemini-2.0-flash" });
        const testResult = await testModel.generateContent("Say 'test successful' if you can see this message.");
        console.log("Direct test result:", testResult.response.text());
      } catch (testError) {
        console.error("Direct test failed:", testError);
      }
      
      // If we get here, there was an error that's not related to quota or all keys are exhausted
      return `Sorry, I'm having trouble continuing our adventure right now. Would you mind trying a different approach or wording? ${keyManager.getAvailableKeysCount() === 0 ? 
        "Our storytellers are currently at capacity. Please try again later." : 
        "I'm excited to see where your adventure goes next!"}`;
    }
  }
  
  return "I apologize, but our storytelling services are currently unavailable. Please try again later.";
} 