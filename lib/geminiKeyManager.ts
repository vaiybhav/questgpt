import { GoogleGenerativeAI } from '@google/generative-ai';
import nodemailer from 'nodemailer';

type KeyStatus = {
  key: string;
  exhausted: boolean;
};

class KeyManager {
  private static instance: KeyManager;
  private keys: KeyStatus[] = [];
  private currentKeyIndex = 0;
  private notificationSent = false;

  private constructor() {
    // Load keys from env
    const keys = [
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
      process.env.GEMINI_API_KEY_4,
      process.env.GEMINI_API_KEY_5
    ].filter(Boolean) as string[];

    this.keys = keys.map(key => ({ key, exhausted: false }));
  }

  static getInstance(): KeyManager {
    if (!KeyManager.instance) {
      KeyManager.instance = new KeyManager();
    }
    return KeyManager.instance;
  }

  getCurrentKeyIndex(): number {
    return this.currentKeyIndex;
  }

  getTotalKeysCount(): number {
    return this.keys.length;
  }

  getAvailableKeysCount(): number {
    return this.keys.filter(k => !k.exhausted).length;
  }

  markCurrentKeyExhausted(): void {
    if (this.currentKeyIndex < this.keys.length) {
      this.keys[this.currentKeyIndex].exhausted = true;
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
    }
  }

  private async sendNotification(): Promise<void> {
    if (this.notificationSent) return;

    try {
      const availableKeys = this.getAvailableKeysCount();
      const totalKeys = this.getTotalKeysCount();
      const threshold = Math.floor(totalKeys * 0.3);

      if (availableKeys <= threshold) {
        await fetch('/api/game/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Low on API keys: ${availableKeys}/${totalKeys} remaining`
          })
        });
        this.notificationSent = true;
      }
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
  }

  async getActiveGenAI(): Promise<GoogleGenerativeAI> {
    // Reset if all exhausted
    if (this.keys.every(k => k.exhausted)) {
      this.keys.forEach(k => k.exhausted = false);
      this.currentKeyIndex = 0;
      console.log("All keys exhausted - resetting");
    }

    // Find working key
    let start = this.currentKeyIndex;
    let found = false;
    
    do {
      if (!this.keys[this.currentKeyIndex].exhausted) {
        found = true;
        break;
      }
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
    } while (this.currentKeyIndex !== start);
    
    if (!found) {
      throw new Error("No working keys available");
    }
    
    await this.sendNotification();
    return new GoogleGenerativeAI(this.keys[this.currentKeyIndex].key);
  }
}

export default KeyManager; 