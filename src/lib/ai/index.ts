import type { AIResponseOptions } from './types';
import { AnthropicProvider } from './anthropic';
import { GroqProvider } from './groq';
import { GeminiProvider } from './gemini';
import {
  LEAD_ANALYSIS_SYSTEM_PROMPT,
  MESSAGE_GENERATION_SYSTEM_PROMPT,
  POST_GENERATION_SYSTEM_PROMPT,
  CV_MATCH_SYSTEM_PROMPT,
} from './prompts';

export { LEAD_ANALYSIS_SYSTEM_PROMPT, MESSAGE_GENERATION_SYSTEM_PROMPT, POST_GENERATION_SYSTEM_PROMPT, CV_MATCH_SYSTEM_PROMPT };
export type { AIResponseOptions };

/**
 * Get the configured AI provider based on environment variable.
 * Reads VITE_AI_PROVIDER to determine which provider to use.
 */
function getProviderName(): string {
  return (import.meta.env.VITE_AI_PROVIDER || 'anthropic').toLowerCase();
}

function getFallbackEnabled(): boolean {
  return (import.meta.env.VITE_ENABLE_GROQ_FALLBACK || 'true').toLowerCase() !== 'false';
}

function getProvider(name = getProviderName()) {
  switch (name) {
    case 'anthropic':
    case 'claude':
      return new AnthropicProvider();
    case 'groq':
      return new GroqProvider();
    case 'gemini':
      return new GeminiProvider();
    default:
      throw new Error(
        `Unknown AI provider: "${name}". Set VITE_AI_PROVIDER to "anthropic", "groq", or "gemini".`
      );
  }
}

/**
 * Generate an AI response using the configured provider.
 * Checks VITE_AI_PROVIDER env var. If groq -> Groq, if gemini -> Gemini.
 */
export async function generateAIResponse(options: AIResponseOptions): Promise<string> {
  const providerName = getProviderName();
  const provider = getProvider(providerName);

  try {
    return await provider.generateResponse(options);
  } catch (primaryError: any) {
    if (providerName === 'groq' || !getFallbackEnabled()) {
      throw primaryError;
    }

    try {
      return await new GroqProvider().generateResponse(options);
    } catch (fallbackError: any) {
      const primaryLabel = providerName === 'anthropic' || providerName === 'claude' ? 'Claude primary' : `${providerName} primary`;
      throw new Error(
        `${primaryLabel} failed: ${primaryError?.message || 'Unknown primary error'} Groq fallback also failed: ${
          fallbackError?.message || 'Unknown Groq error'
        }`
      );
    }
  }
}
