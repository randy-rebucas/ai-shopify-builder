import OpenAI from "openai";
import type { AIProvider, CompletionRequest } from "../types";

const REQUEST_TIMEOUT_MS = 120_000;

export class OpenAIProvider implements AIProvider {
  id = "openai";
  private client: OpenAI;

  constructor(apiKey = process.env.OPENAI_API_KEY) {
    this.client = new OpenAI({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });
  }

  async complete({ system, messages, maxTokens = 4096 }: CompletionRequest): Promise<string> {
    const startedAt = Date.now();
    console.log(`[ai:openai] request start — ${messages.length} message(s), maxTokens=${maxTokens}`);
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: maxTokens,
        messages: [
          ...(system ? [{ role: "system" as const, content: system }] : []),
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      });

      console.log(`[ai:openai] request done in ${Date.now() - startedAt}ms — finish_reason=${response.choices[0]?.finish_reason}`);
      return response.choices[0]?.message?.content ?? "";
    } catch (error) {
      console.error(`[ai:openai] request failed after ${Date.now() - startedAt}ms —`, error);
      throw error;
    }
  }
}
