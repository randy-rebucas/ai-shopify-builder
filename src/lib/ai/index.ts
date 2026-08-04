import type { AIProvider, AIProviderId } from "./types";
import { ClaudeProvider } from "./providers/claude";
import { OpenAIProvider } from "./providers/openai";

export * from "./types";

const providers: Record<AIProviderId, () => AIProvider> = {
  claude: () => new ClaudeProvider(),
  openai: () => new OpenAIProvider(),
};

export function getAIProvider(id: AIProviderId = "claude"): AIProvider {
  const factory = providers[id];
  if (!factory) {
    throw new Error(`Unknown AI provider: ${id}`);
  }
  return factory();
}
