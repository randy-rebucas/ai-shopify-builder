export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessageInput {
  role: ChatRole;
  content: string;
}

export interface CompletionRequest {
  system?: string;
  messages: ChatMessageInput[];
  maxTokens?: number;
}

export interface AIProvider {
  id: string;
  complete(request: CompletionRequest): Promise<string>;
}

export type AIProviderId = "claude" | "openai";
