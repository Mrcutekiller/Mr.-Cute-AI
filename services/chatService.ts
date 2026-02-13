import { Personality, Attachment, User, AIProvider } from '../types';
import { SYSTEM_INSTRUCTION_TEMPLATE } from '../constants';

export class ChatService {
  private currentPersonality: Personality | null = null;
  private currentProvider: AIProvider = 'google';
  private googleApiKey = '';
  private openaiApiKey = '';

  configure(user?: User) {
    this.currentProvider = user?.aiProvider || 'google';
    this.googleApiKey = user?.googleApiKey?.trim() || '';
    this.openaiApiKey = user?.openaiApiKey?.trim() || '';
  }

  initChat(personality: Personality, user?: User) {
    this.configure(user);
    this.currentPersonality = personality;
  }

  private buildSystemInstruction(personality: Personality, user?: User) {
    let systemInstruction = SYSTEM_INSTRUCTION_TEMPLATE.replace('{{PERSONALITY}}', personality);

    if (user) {
      systemInstruction = systemInstruction
        .replace('{{USER_NAME}}', user.name || 'Friend')
        .replace('{{USER_AGE}}', user.age || 'Unknown')
        .replace('{{USER_GENDER}}', user.gender || 'Unknown')
        .replace('{{USER_BIO}}', user.bio || 'None');
    }

    return systemInstruction;
  }

  private async sendOpenAIMessage(text: string, attachment: Attachment | undefined, personality: Personality, user?: User): Promise<string> {
    if (!this.openaiApiKey) return 'Please add your OpenAI API key in Settings to continue.';

    const systemInstruction = this.buildSystemInstruction(personality, user);
    const userContent = attachment && attachment.mimeType.startsWith('image/')
      ? [
          { type: 'text', text },
          { type: 'image_url', image_url: { url: `data:${attachment.mimeType};base64,${attachment.data}` } },
        ]
      : text;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userContent },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      return 'OpenAI request failed. Please verify your key and try again.';
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || "Sorry, I couldn't think of a response.";
  }

  private async sendGoogleMessage(text: string, attachment: Attachment | undefined, personality: Personality, user?: User): Promise<string> {
    if (!this.googleApiKey) return 'Please add your Google API key in Settings to continue.';

    const systemInstruction = this.buildSystemInstruction(personality, user);
    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];

    if (text) parts.push({ text });
    if (attachment) {
      parts.push({
        inline_data: {
          mime_type: attachment.mimeType,
          data: attachment.data,
        },
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(this.googleApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: parts.length ? parts : [{ text: 'Hello' }] }],
        }),
      }
    );

    if (!response.ok) {
      console.error('Google API error:', await response.text());
      return 'Google request failed. Please verify your key and try again.';
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't think of a response.";
  }

  async sendMessage(text: string, attachment: Attachment | undefined, personality: Personality, user?: User): Promise<string> {
    try {
      this.configure(user);
      this.currentPersonality = personality;

      if (this.currentProvider === 'openai') {
        return await this.sendOpenAIMessage(text, attachment, personality, user);
      }
      return await this.sendGoogleMessage(text, attachment, personality, user);
    } catch (error) {
      console.error('Error sending message:', error);
      return 'Something went wrong. Try again?';
    }
  }
}
