export interface AIResponseOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIProvider {
  generateResponse(options: AIResponseOptions): Promise<string>;
}
