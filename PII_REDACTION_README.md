# PII Redaction Architectural Approaches

This document outlines three different architectural patterns for masking Personally Identifiable Information (PII) before sending prompts to Large Language Models (LLMs), and how to safely unmask them during internal tool execution or UI rendering.

---

## Approach 1: Stateless Secret-Key Encryption

This approach involves encrypting the PII using symmetric encryption (e.g., AES-256-GCM) with a server-side Secret Key. The encrypted string itself becomes the placeholder token (e.g., `[MASKED_iv:tag:cipher]`). The LLM receives this encrypted token, and tools decrypt it using the same Secret Key when they need the original data.

### Advantages
* **Perfectly Stateless & Durable:** No in-memory mapping or external database is required. Because the token inherently carries the encrypted payload, this perfectly aligns with serverless architectures and durable agent frameworks that may pause and resume.
* **Highly Secure against LLMs:** AES encryption guarantees the LLM cannot read or reverse-engineer the underlying PII without the secret key.
* **No Extra Infrastructure:** Everything runs entirely within your own application servers without relying on third-party proxy services.

### Disadvantages
* **Asynchronous UI Rendering:** Because the Secret Key cannot be exposed to the browser (for security), the UI must make asynchronous network calls to the server to decrypt tokens before displaying them on screen.
* **Token Size:** Encrypted tokens are longer than simple placeholders, which slightly increases token usage and cost.
* **Regex Limitations:** Typically relies on regular expressions to detect PII before masking, which can miss complex, unstructured, or varied PII formats.

---

## Approach 2: Stateful Dictionary Mapping

This approach replaces PII with a short, opaque placeholder token (e.g., `[MASKED_EMAIL_0]`) and stores the mapping to the real value in a centralized dictionary (like an in-memory `Map`, Redis cache, or database).

### Advantages
* **Perfectly Opaque:** The token contains absolutely zero data, providing absolute mathematical security against LLMs.
* **Token Efficiency:** The placeholder tokens are very short, saving on LLM token costs.
* **Synchronous UI (If Cached):** If the client holds the dictionary, the UI can unmask data instantly without extra round-trips to the server.

### Disadvantages
* **State & Durability Mismatch:** If stored in memory on a serverless function, the mapping is wiped out when the function sleeps or restarts. If an agent pauses for approval, the context is lost and tools cannot unmask the data.
* **Memory Leaks:** A naive global dictionary will grow endlessly over time in long-running servers, leading to crashes.
* **Complex State Management:** Requires integrating a durable, database-backed session store (like Redis or Postgres) just to safely persist the dictionaries across requests and function invocations.

---

## Approach 3: Masking Outside the Agent (AI Gateway / Proxy)

This approach points your application to an external AI Proxy or Data Privacy Vault (e.g., Cloudflare AI Gateway, Portkey, Skyflow). The proxy intercepts the outbound request, runs heavy Natural Language Processing (NLP) models to mask the PII, forwards it to the LLM, and automatically unmasks it on the way back before it reaches your application.

### Advantages
* **Stateless Application:** Your application code remains completely stateless and unburdened by redaction logic.
* **Enterprise-Grade Accuracy:** Proxies use advanced Machine Learning (Named Entity Recognition) to accurately detect and redact context-heavy PII that basic Regex misses.
* **Security & Compliance:** Offloading redaction to a specialized, certified vault makes achieving strict compliance frameworks (like HIPAA or SOC2) significantly easier.

### Disadvantages
* **Additional Infrastructure & Cost:** Adds another paid service subscription and potential point of failure to your stack.
* **Latency:** Introduces an extra network hop (App -> Proxy -> LLM), which can add latency to requests, especially noticeable during streaming responses.
* **Less Granular Tool Control:** Because the proxy handles unmasking before the response reaches your code, injecting the masked data directly into local tools requires careful proxy configuration.
