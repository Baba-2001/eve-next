# Eve Sandbox: Complete Self-Hosting Guide

This document is a comprehensive guide to understanding, configuring, and scaling the Eve Sandbox for self-hosted environments. It summarizes the core architecture, security models, and scaling strategies for running untrusted AI-generated code safely.

---

## 1. What is the Sandbox?

The sandbox is a completely isolated environment (a filesystem rooted at `/workspace`) where your AI agent executes shell commands, runs scripts, and manages files. It allows the agent to run code dynamically without ever touching your real application runtime or host server files.

Eve agents interact with it through built-in tools (`bash`, `read_file`, `write_file`) or custom tools you write.

---

## 2. The Backends: Docker vs. Microsandbox

When self-hosting Eve, you have two primary production-grade sandbox backends to choose from:

### Option A: Docker

- **How it works:** Runs the sandbox as a standard Docker container. It uses OS-level virtualization (sharing the host's Linux kernel).
- **Requirements:** A running Docker Daemon (Docker Engine, Colima, etc.) and adding your Node.js application user to the `docker` user group.
- **Security:** Good, but relies on software-level container isolation.
- **Features:** Supports coarse-grained network policies (`allow-all` or `deny-all`).

### Option B: Microsandbox

- **How it works:** Spins up an actual Micro Virtual Machine (MicroVM). It uses hardware-level virtualization, giving the sandbox its own dedicated Linux kernel. It clones memory snapshots to boot almost instantly.
- **Requirements:** Your host machine **MUST** support hardware virtualization.
  - On macOS: Apple Silicon (M1/M2/M3).
  - On Linux: `glibc` with **KVM** enabled. (Note: Many cheap cloud VPS providers disable nested virtualization, so you may need a bare-metal server).
- **Security:** Ultimate hardware-level isolation.
- **Features:** Supports **Domain-Level Firewalls** (e.g., allow traffic _only_ to `api.github.com`) and **Credential Brokering** (transparently injecting secret API keys into network headers without exposing the tokens to the AI).

---

## 3. Security and Isolation: Is My App Safe?

**Yes.** If an AI agent goes rogue and runs a command like `kill -9 $(lsof -t -i:3000)` inside the sandbox, your main Eve Node.js application running on the host machine is completely safe.

Why?

1. **Process Isolation (PID Namespace):** The sandbox can only see and interact with processes running _inside itself_. It has zero visibility into the host server.
2. **Network Isolation:** The sandbox operates on a virtual internal network. Even if your main app is running on port 3000 on the host, killing port 3000 inside the sandbox only affects the sandbox's virtual network.

---

## 4. Performance & Scaling

Because Eve sandboxes maintain their `/workspace` state for durable conversational sessions, they are long-lived.

- **Idle Sandboxes:** A sleeping Docker container or MicroVM waiting for user input consumes practically 0% CPU and very little RAM. A standard server can host hundreds of them easily.
- **Active Sandboxes:** If 100 agents are actively running heavy scripts or compiling code simultaneously, they will aggressively compete for CPU and RAM, potentially starving your main Node.js web app and causing crashes via the Linux OOM Killer.

### Enterprise Scaling: Separating the Compute

If you expect high concurrency, **do not run the sandboxes on the same server as your web application**. You have two ways to separate the compute:

#### The Easy Way (Remote Docker CLI)

Eve's `docker()` backend uses the local `docker` CLI. You can route this traffic to a dedicated remote heavy-compute server by setting an environment variable before starting your Eve app:

```bash
export DOCKER_HOST="ssh://ubuntu@your-heavy-compute-server-ip"
npm run start
```

Your web server stays fast, while the remote server handles the heavy lifting.

#### The Enterprise Way (Custom Kubernetes Backend)

If you run Kubernetes, you can write a custom adapter that implements Eve's `SandboxBackend` interface. You would write logic that uses the K8s API to spin up Pods dynamically for every new agent session, fully utilizing your cluster's autoscaling capabilities.

### Lifecycle Maintenance

Because sandboxes are long-lived, you **must** implement a garbage collection strategy on your server to prevent the disk from filling up over time.
For Docker, set up a daily server cron job:

```bash
docker container prune --filter "until=24h" -f
```
