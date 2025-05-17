import { HarmCategory, HarmBlockThreshold, GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import KeyManager from './geminiKeyManager';

// Error patterns for API responses
const errors = {
  quota: /(quota exceeded|resource exhausted|limit reached|usage limit)/i,
  auth: /(api key not valid|invalid api key|authentication failed|unauthorized)/i,
  perms: /(permission denied|access denied)/i,
  safety: /(blocked due to SAFETY|safety settings|harmful|content policy|violates|inappropriate content)/i
};

export async function generateResponse(cmd: string, ctx: string = "", genre: string = ""): Promise<string> {
  const keys = KeyManager.getInstance();
  let tries = 0;
  const maxTries = keys.getTotalKeysCount() + 1;
  
  console.log(`Generating response for: "${cmd.substring(0, 20)}..."`);
  console.log(`Genre: ${genre || "None"}`);
  console.log(`Keys: ${keys.getAvailableKeysCount()}/${keys.getTotalKeysCount()}`);
  
  while (tries < maxTries) {
    tries++;
    try {
      console.log(`Try ${tries}/${maxTries} with key #${keys.getCurrentKeyIndex() + 1}`);
      
      const gen = await keys.getActiveGenAI();
      const model = gen.getGenerativeModel({
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
        generationConfig: {
          temperature: 0.8,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1024,
        }
      });
      
      let prompt = "";
      const genreText = genre ? `This is a ${genre.toLowerCase()} adventure.` : "";
      
      if (ctx) {
        prompt = `You are narrating an interactive story game. ${genreText}

Story so far:
${ctx}

Player's action: "${cmd}"

Content guidelines:
- Allow mature themes like dating, romance, relationships
- Filter extreme content like slurs or explicit material
- Keep responses under 100 words unless asked for more
- Let players drive the story and world-building
- Present clear choices when needed
- Follow the player's creative direction

Continue the story based on their action.`;
      }
      
      const result = await model.generateContent(prompt || cmd);
      const text = result.response.text();
      
      if (!text?.trim()) {
        throw new Error("Empty response from API");
      }
      
      console.log(`Got response with key #${keys.getCurrentKeyIndex() + 1}`);
      return text;
      
    } catch (err: any) {
      const msg = err?.message || err?.toString() || '';
      console.error(`API error (key #${keys.getCurrentKeyIndex() + 1}):`, err);
      
      if (errors.safety.test(msg)) {
        console.warn("Content blocked by safety filters");
        return "I notice that might not be appropriate for our story. Could you rephrase it in a more family-friendly way?";
      }
      
      if (
        errors.quota.test(msg) ||
        errors.auth.test(msg) ||
        errors.perms.test(msg) ||
        err?.status === 429 ||
        err?.status === 401 ||
        err?.status === 403
      ) {
        console.warn(`Key #${keys.getCurrentKeyIndex() + 1} exhausted. Trying next.`);
        keys.markCurrentKeyExhausted();
        
        if (keys.getAvailableKeysCount() > 0) {
          console.log(`Using key #${keys.getCurrentKeyIndex() + 1}`);
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
      }
      
      try {
        console.log("Testing API directly...");
        const test = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_1 || "");
        const testModel = test.getGenerativeModel({ model: "gemini-2.0-flash" });
        const testResult = await testModel.generateContent("Test message");
        console.log("Test result:", testResult.response.text());
      } catch (testErr) {
        console.error("Test failed:", testErr);
      }
      
      return keys.getAvailableKeysCount() === 0 ?
        "Our storytellers are taking a break. Please try again later." :
        "Having trouble with that. Mind trying a different approach?";
    }
  }
  
  return "Story service unavailable. Please try again later.";
} 