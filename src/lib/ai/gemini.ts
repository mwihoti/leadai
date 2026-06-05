import type { AIResponseOptions, AIProvider } from './types';

/**
 * Gemini AI Provider
 * Uses the Google Generative AI API to generate responses
 */
export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    this.model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';
  }

  async generateResponse(options: AIResponseOptions): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured. Set VITE_GEMINI_API_KEY in your environment.');
    }

    const fullPrompt = options.systemPrompt
      ? `${options.systemPrompt}\n\n${options.prompt}`
      : options.prompt;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: fullPrompt }],
            },
          ],
          generationConfig: {
            temperature: options.temperature ?? 0.4,
            maxOutputTokens: options.maxTokens,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}
