import { openai } from "@ai-sdk/openai";
import { defineAgent } from "eve";

export default defineAgent({
  model: openai("gpt-4.1"),
  // Keep local builds independent of an AI Gateway metadata lookup.
  modelContextWindowTokens: 1_000_000,
  compaction: {
    model: openai("gpt-4.1"),
    modelContextWindowTokens: 1_000_000,
  },
});
