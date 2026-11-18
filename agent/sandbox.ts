import { defineSandbox } from "eve/sandbox";
import { DockerSandbox } from "eve/sandbox/docker";

// Use one persistent Docker container per eve session. Docker is the sandbox
// backend; the agent does not expose a separate tool for creating containers.
export const environment = DockerSandbox.environment();

export default defineSandbox(() =>
  environment.open({ networkPolicy: "allow-all" }),
);
