# Langfuse tracing

The eve agent exports its OpenTelemetry traces to Langfuse through
`@langfuse/otel`. The integration captures one trace per agent turn, including
the agent step, each model generation, and tool calls. eve supplies the model,
token usage, session, and trace hierarchy attributes.

Set these server-side environment variables before starting the app:

```bash
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

Optional deployment labels:

```bash
LANGFUSE_TRACING_ENVIRONMENT=production
LANGFUSE_RELEASE=2026-11-18
```

If either required key is missing, the Langfuse destination remains inactive
and the application continues to run with eve's normal local tracing. Never
expose the secret key to browser code or commit it to the repository.

The Langfuse destination masks common email, phone, bearer-token, and API-key
patterns before export. The chat UI also encrypts email addresses before they
reach the agent; the destination mask is defense in depth for tool/provider
outputs.
