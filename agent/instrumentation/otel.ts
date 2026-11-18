import { otel } from "eve/instrumentation/otel";

export default otel({
  resource: {
    "service.name": "eve-observability-demo",
    "deployment.environment": process.env.VERCEL_ENV ?? "development",
    "service.version": process.env.LANGFUSE_RELEASE ?? "demo",
  },
  tracePolicy: () => ({
    emit: true,
    recordInputs: true,
    recordOutputs: true,
  }),
});
