import { defineTool } from "eve/tools";
import { z } from "zod";
import { docker } from "eve/sandbox/docker";

export default defineTool({
  description: "Run a provided Python script using the Docker sandbox backend.",
  inputSchema: z.object({ script: z.string() }),
  async execute({ script }, ctx) {
    // currently docker should be inside the same machine (server).

    // APPROACH FOR SEPARATING THE COMPUTE
    // To run this Docker container on a remote heavy-compute machine rather than the web server:
    // Simply set the DOCKER_HOST environment variable before starting your Eve Node.js app.
    // Example: export DOCKER_HOST="ssh://ubuntu@your-heavy-compute-server-ip"
    // Eve's built-in docker() factory will automatically route all commands to the remote daemon!

    const backend = docker({
      image: "ghcr.io/vercel/eve:latest",
      pullPolicy: "if-not-present",
    });

    const handle = await backend.create({
      sessionKey: "docker-python-tool-session",
      templateKey: null,
      runtimeContext: { appRoot: process.cwd() },
    });

    const sandbox = handle.session;

    try {
      await sandbox.writeTextFile({ path: "script.py", content: script });
      const result = await sandbox.run({ command: "python3 script.py" });
      return { stdout: result.stdout, stderr: result.stderr };
    } finally {
      await handle.shutdown();
    }
  },
});
