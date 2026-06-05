import type { AIResponseOptions, AIProvider } from './types';

/**
 * Groq AI Provider
 * Uses the Groq SDK to generate responses
 */
export class GroqProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_GROQ_API_KEY || '';
    this.model = import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile';
  }

  async generateResponse(options: AIResponseOptions): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY is not configured. Set VITE_GROQ_API_KEY in your environment.');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: options.systemPrompt || 'You are a helpful AI assistant.',
          },
          {
            role: 'user',
            content: options.prompt,
          },
        ],
        temperature: options.temperature ?? 0.4,
        max_tokens: options.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}
