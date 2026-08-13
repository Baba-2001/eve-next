import { defineTool } from "eve/tools";
import { z } from "zod";
import { microsandbox } from "eve/sandbox/microsandbox";

export default defineTool({
  description: "Run a provided Python script using the Microsandbox backend.",
  inputSchema: z.object({ script: z.string() }),
  async execute({ script }, ctx) {
    /* 
     * HOW MICROSANDBOX WORKS & WHERE IT RUNS:
     * - Where: Runs locally on your host server, but relies on hardware virtualization (KVM on Linux, Apple Silicon on macOS).
     * - How: Unlike Docker (which shares the host's kernel using containers), microsandbox spins up true Micro-Virtual Machines (MicroVMs). 
     *   Each sandbox has its own isolated Linux kernel and boots almost instantly using memory snapshots.
     * 
     * PROS vs CONS:
     * - Pros: Ultimate security (hardware-level isolation), allows domain-level firewalls (e.g., allow ONLY github.com), 
     *   and enables Credential Brokering (injecting API keys into network requests without the AI agent seeing the token).
     * - Cons: Your host server MUST support KVM. Many cheap cloud VPS providers disable nested virtualization.
     * 
     * PERFORMANCE WITH MULTIPLE SANDBOXES:
     * - 100 idle MicroVMs consume moderate RAM but almost no CPU. 
     * - 100 ACTIVE MicroVMs executing code simultaneously will aggressively compete for CPU and RAM, quickly starving 
     *   your main Node.js web server. If you expect high concurrency, you must separate the compute (run the 
     *   sandbox workloads on a separate, dedicated KVM-enabled compute node).
     * 
     * WHAT HAPPENS TO OLD SANDBOXES:
     * - In a standard Eve session, sandboxes persist their `/workspace` to disk so the agent can resume conversations later.
     *   Over time, dormant sessions will eat up disk space, requiring periodic pruning of old `.eve/sandbox-cache/` data.
     * - In THIS specific tool implementation, because we manually invoke `backend.create()` and explicitly call 
     *   `handle.shutdown()` in the `finally` block, the VM is instantly destroyed and its resources are freed the 
     *   moment the Python script finishes executing.
     */
    const backend = microsandbox({ memoryMiB: 2048 });
    const handle = await backend.create({
      sessionKey: "microsandbox-python-tool-session",
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

