import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, CompletionRequest } from "../types";

const REQUEST_TIMEOUT_MS = 120_000;

export class ClaudeProvider implements AIProvider {
  id = "claude";
  private client: Anthropic;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    this.client = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });
  }

  async complete({ system, messages, maxTokens = 4096 }: CompletionRequest): Promise<string> {
    const startedAt = Date.now();
    console.log(`[ai:claude] request start — ${messages.length} message(s), maxTokens=${maxTokens}`);
    try {
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: maxTokens,
        system,
        messages: messages.map((m) => ({ role: m.role === "system" ? "user" : m.role, content: m.content })),
      });

      console.log(`[ai:claude] request done in ${Date.now() - startedAt}ms — stop_reason=${response.stop_reason}`);
      return response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");
    } catch (error) {
      console.error(`[ai:claude] request failed after ${Date.now() - startedAt}ms —`, error);
      throw error;
    }
  }
}
