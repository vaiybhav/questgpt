import { GoogleGenerativeAI } from '@google/generative-ai';
import nodemailer from 'nodemailer';

interface KeyStatus {
  index: number;
  key: string;
  exhausted: boolean;
}

class GeminiKeyManager {
  private keys: KeyStatus[] = [];
  private currentKeyIndex = 0;
  private static instance: GeminiKeyManager;
  private notificationSent = false;

  private constructor() {
    // Load keys from environment variables
    for (let i = 1; i <= 5; i++) {
      const key = process.env[`GEMINI_API_KEY_${i}`];
      if (key) {
        this.keys.push({ index: i, key, exhausted: false });
      }
    }
    
    if (this.keys.length === 0) {
      console.error("No Gemini API keys found in environment variables");
    } else {
      console.log(`Loaded ${this.keys.length} Gemini API keys from environment variables`);
    }
  }

  static getInstance(): GeminiKeyManager {
    if (!GeminiKeyManager.instance) {
      GeminiKeyManager.instance = new GeminiKeyManager();
    }
    return GeminiKeyManager.instance;
  }
  
  async sendLowKeysNotification() {
    // Only send the notification once
    if (this.notificationSent) {
      console.log("Notification already sent, skipping");
      return;
    }
    
    const availableKeys = this.keys.filter(k => !k.exhausted);
    if (availableKeys.length <= 2 && !this.notificationSent) {
      console.log(`Attempting to send low keys notification (${availableKeys.length} keys available)`);
      
      // Check if email configuration is present
      if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        console.error("Email configuration missing. Please set EMAIL_USER and EMAIL_APP_PASSWORD in .env file.");
        return;
      }
      
      try {
        console.log(`Creating email transporter with user: ${process.env.EMAIL_USER}`);
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
          }
        });
        
        const exhaustedKeyNumbers = this.keys
          .filter(k => k.exhausted)
          .map(k => k.index)
          .join(', ');
        
        console.log(`Sending email to vaiybhavc@gmail.com`);
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: 'vaiybhavc@gmail.com',
          subject: '⚠️ QuestGPT: Running Low on API Keys',
          text: `QuestGPT is running low on available Gemini API keys! Only ${availableKeys.length} keys remaining.\n\n` +
                `The following keys need renewal: GEMINI_API_KEY_${exhaustedKeyNumbers}\n\n` +
                `Please update your API keys as soon as possible to ensure uninterrupted service.`,
          html: `
            <h2>⚠️ QuestGPT is running low on API keys!</h2>
            <p>You only have <strong>${availableKeys.length} keys</strong> remaining out of 5.</p>
            <p>The following keys need renewal:</p>
            <ul>
              ${this.keys
                .filter(k => k.exhausted)
                .map(k => `<li>GEMINI_API_KEY_${k.index}</li>`)
                .join('')}
            </ul>
            <p>Please update your API keys as soon as possible to ensure uninterrupted service.</p>
          `
        };
        
        // Use a promisified version to get more details
        await new Promise((resolve, reject) => {
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error('Email send error:', error);
              reject(error);
            } else {
              console.log('Email sent successfully:', info.response);
              resolve(info);
            }
          });
        });
        
        this.notificationSent = true;
        console.log('Low API keys notification email sent');
      } catch (error) {
        console.error('Failed to send notification email:', error);
        // Don't set notificationSent to true so it will retry later
      }
    }
  }

  async getActiveGenAI(): Promise<GoogleGenerativeAI> {
    // If we've tried all keys and they're all exhausted, start over
    // This is a fallback in case some keys recover quota over time
    if (this.keys.every(k => k.exhausted)) {
      this.keys.forEach(k => k.exhausted = false);
      this.currentKeyIndex = 0;
      console.log("All keys were exhausted. Resetting all keys to try again.");
    }

    // Find the next non-exhausted key
    let startIndex = this.currentKeyIndex;
    let foundWorkingKey = false;
    
    do {
      if (!this.keys[this.currentKeyIndex].exhausted) {
        foundWorkingKey = true;
        break;
      }
      
      // Move to next key
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
    } while (this.currentKeyIndex !== startIndex);
    
    if (!foundWorkingKey) {
      throw new Error("All API keys are exhausted");
    }
    
    // Check if we need to send a notification
    await this.sendLowKeysNotification();
    
    // Create a new instance with the current key
    const currentKey = this.keys[this.currentKeyIndex].key;
    return new GoogleGenerativeAI(currentKey);
  }
  
  markCurrentKeyExhausted() {
    if (this.keys.length > 0) {
      this.keys[this.currentKeyIndex].exhausted = true;
      console.log(`Marked key ${this.currentKeyIndex + 1} as exhausted. Moving to next key.`);
      
      // Move to the next key for future requests
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
      
      // Check if we need to send a notification
      this.sendLowKeysNotification().catch(err => {
        console.error("Error sending notification after key exhaustion:", err);
      });
    }
  }
  
  getCurrentKeyIndex(): number {
    return this.currentKeyIndex;
  }
  
  getAvailableKeysCount(): number {
    return this.keys.filter(k => !k.exhausted).length;
  }
  
  getTotalKeysCount(): number {
    return this.keys.length;
  }
}

export default GeminiKeyManager; 