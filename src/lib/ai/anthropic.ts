import type { AIProvider, AIResponseOptions } from './types';

/**
 * Anthropic Claude provider.
 * Direct browser access is acceptable for local demos only; production should proxy this server-side.
 */
export class AnthropicProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
    this.model = import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
  }

  async generateResponse(options: AIResponseOptions): Promise<string> {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured. Set VITE_ANTHROPIC_API_KEY in your environment.');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.4,
        system: options.systemPrompt || 'You are a helpful AI assistant.',
        messages: [
          {
            role: 'user',
            content: options.prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const textBlocks = data.content
      ?.filter((block: any) => block.type === 'text' && typeof block.text === 'string')
      .map((block: any) => block.text);

    return textBlocks?.join('\n').trim() || '';
  }
}
