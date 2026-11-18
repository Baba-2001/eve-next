import { LangfuseSpanProcessor } from "@langfuse/otel";
import { otelIntegration } from "eve/instrumentation/otel";

const hasLangfuseCredentials = Boolean(
  process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY,
);

/**
 * Keep common PII and credentials out of the Langfuse destination.
 *
 * The chat client already encrypts email addresses before they reach the
 * agent. This second layer also covers values returned by tools or providers
 * before they are exported as trace input/output.
 */
function maskSensitiveData({ data }: { data: unknown }): unknown {
  if (typeof data !== "string") return data;

  return data
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gi, "[REDACTED_EMAIL]")
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "[REDACTED_PHONE]")
    .replace(/\b(?:Bearer\s+|sk-[A-Za-z0-9_-]{16,}|pk-[A-Za-z0-9_-]{16,})\S*/gi, "[REDACTED_SECRET]");
}

export default otelIntegration({
  // eve continues to record its local traces; this is an additional Langfuse
  // destination and does not replace local development observability.
  spanProcessors: hasLangfuseCredentials
    ? [
        new LangfuseSpanProcessor({
          environment: process.env.LANGFUSE_TRACING_ENVIRONMENT ?? process.env.NODE_ENV,
          release: process.env.LANGFUSE_RELEASE,
          mask: maskSensitiveData,
        }),
      ]
    : [],
});
