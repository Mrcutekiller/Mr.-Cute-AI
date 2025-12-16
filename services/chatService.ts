
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { Personality, Attachment, User } from '../types';
import { SYSTEM_INSTRUCTION_TEMPLATE } from '../constants';

export class ChatService {
  private ai: GoogleGenAI;
  private chatSession: Chat | null = null;
  private currentPersonality: Personality | null = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  initChat(personality: Personality, user?: User) {
    // If personality changed or no session, create new one
    if (this.chatSession && this.currentPersonality === personality) {
      return;
    }

    let systemInstruction = SYSTEM_INSTRUCTION_TEMPLATE.replace('{{PERSONALITY}}', personality);
    
    if (user) {
        systemInstruction = systemInstruction
            .replace('{{USER_NAME}}', user.name || 'Friend')
            .replace('{{USER_AGE}}', user.age || 'Unknown')
            .replace('{{USER_GENDER}}', user.gender || 'Unknown')
            .replace('{{USER_BIO}}', user.bio || 'None');
    }

    this.chatSession = this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
      },
    });
    this.currentPersonality = personality;
  }

  async sendMessage(text: string, attachment?: Attachment): Promise<string> {
    if (!this.chatSession) {
      throw new Error("Chat session not initialized");
    }

    try {
      let response: GenerateContentResponse;

      if (attachment) {
        // Send multimodal message
        response = await this.chatSession.sendMessage({
          message: [
            { text: text },
            {
              inlineData: {
                mimeType: attachment.mimeType,
                data: attachment.data
              }
            }
          ]
        });
      } else {
        // Text only
        response = await this.chatSession.sendMessage({
          message: text
        });
      }
      return response.text || "Sorry, I couldn't think of a response.";
    } catch (error) {
      console.error("Error sending message:", error);
      return "Something went wrong. Try again?";
    }
  }
}
