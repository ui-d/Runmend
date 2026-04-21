/**
 * Reusable Anthropic SDK mock. Scripts messages.create responses.
 */

import { vi } from "vitest";

export interface AnthropicMessageContent {
  type: "text";
  text: string;
}

export interface AnthropicMessage {
  id: string;
  type: "message";
  role: "assistant";
  content: AnthropicMessageContent[];
  model: string;
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
}

export function createAnthropicMock() {
  const create = vi.fn();

  function scriptResponse(text: string): AnthropicMessage {
    return {
      id: "msg_test",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text }],
      model: "claude-sonnet-4-5-20250929",
      stop_reason: "end_turn",
      usage: { input_tokens: 100, output_tokens: 200 },
    };
  }

  const client = {
    messages: { create },
  };

  return { client, create, scriptResponse };
}

export type AnthropicMock = ReturnType<typeof createAnthropicMock>;
