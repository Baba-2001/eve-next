"use client";

import type { UserContent } from "ai";
import { useEveAgent } from "eve/react";
import { AlertCircleIcon, BrainIcon } from "lucide-react";
import { useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";
import { AgentMessage } from "./agent-message";

const AGENT_NAME = "Observability Demo";
const DEMO_PROMPTS = [
  {
    label: "Invalid SQL",
    detail: "orders.customer_email → undefined-column error",
    prompt:
      "Run this exact SQL: SELECT id, customer_email, total_amount FROM orders ORDER BY created_at DESC LIMIT 5;",
  },
  {
    label: "Users under 25",
    detail: "Orders joined to users after schema inspection",
    prompt:
      "Get orders for users with age less than 25. Read the schema first.",
  },
  {
    label: "Recent orders",
    detail: "Real orders table and columns",
    prompt: "Show the recent orders after inspecting the schema.",
  },
] as const;

type AgentStatus = ReturnType<typeof useEveAgent>["status"];
export function AgentChat() {
  const [cancellationError, setCancellationError] = useState<string>();
  const agent = useEveAgent();
  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const isEmpty = agent.data.messages.length === 0;
  const lastMessage = agent.data.messages.at(-1);
  const isPendingAssistantShell =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.every((part) => part.type === "step-start");
  const errorMessage = cancellationError ?? agent.error?.message;
  const submitStatus = agent.status === "resuming" ? "submitted" : agent.status;
  const showPendingThinking =
    submitStatus === "submitted" || submitStatus === "streaming";

  const prepareTurn = () => {
    setCancellationError(undefined);
  };

  const sendDemoPrompt = async (prompt: string) => {
    if (isBusy) return;
    prepareTurn();
    await agent.send(prompt);
  };

  const requestCancellation = async () => {
    if (!isBusy) return;
    setCancellationError(undefined);
    try {
      await agent.cancel();
    } catch (error: unknown) {
      setCancellationError(toErrorMessage(error));
    }
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    let text = message.text.trim();
    if ((text.length === 0 && message.files.length === 0) || isBusy) return;

    prepareTurn();

    // Mask emails using state-less secure AES tokens
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const matches = Array.from(text.matchAll(emailRegex));
    if (matches.length > 0) {
      const { getSecureToken } = await import("@/app/actions");
      for (const match of matches) {
        const token = await getSecureToken(match[0]);
        text = text.replace(match[0], token);
      }
    }

    if (message.files.length === 0) {
      await agent.send(text);
      return;
    }

    const parts: UserContent = [];
    if (text.length > 0) {
      parts.push({ text, type: "text" });
    }
    for (const file of message.files) {
      parts.push({
        data: file.url,
        filename: file.filename,
        mediaType: file.mediaType,
        type: "file",
      });
    }

    await agent.send(parts);
  };

  const composer = (
    <PromptInput onSubmit={handleSubmit}>
      <PromptInputTextarea placeholder="Send a message…" />
      <PromptInputSubmit onStop={requestCancellation} status={submitStatus} />
    </PromptInput>
  );

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      {isEmpty ? null : (
        <header className="flex h-14 shrink-0 items-center justify-center gap-3 pl-4 pr-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-muted-foreground text-sm">
              {AGENT_NAME}
            </span>
            <StatusDot status={agent.status} />
          </span>
        </header>
      )}

      {errorMessage ? (
        <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pt-2 sm:px-6">
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm">
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">Request failed</p>
              <p className="mt-0.5 text-muted-foreground">{errorMessage}</p>
            </div>
          </div>
        </div>
      ) : null}

      {isEmpty ? null : (
        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6 sm:px-6">
            {agent.data.messages.map((message, index) =>
              showPendingThinking &&
              isPendingAssistantShell &&
              message.id === lastMessage?.id ? null : (
                <AgentMessage
                  canRespond={!isBusy}
                  isStreaming={
                    agent.status === "streaming" &&
                    index === agent.data.messages.length - 1
                  }
                  key={message.id}
                  message={message}
                  onInputResponses={(inputResponses) => {
                    prepareTurn();
                    return agent.respond(inputResponses);
                  }}
                />
              ),
            )}
            {showPendingThinking ? <PendingThinking /> : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      <div
        className={cn(
          "mx-auto w-full px-4 sm:px-6",
          isEmpty
            ? "flex max-w-xl flex-1 flex-col items-center justify-center gap-8 pb-[10vh]"
            : "max-w-3xl shrink-0 pb-6",
        )}
      >
        {isEmpty ? (
          <div className="flex w-full flex-col items-center gap-5 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                OpenTelemetry + Langfuse ready
              </div>
              <h1 className="font-medium text-5xl tracking-tighter">
                {AGENT_NAME}
              </h1>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                A presenter-friendly agent for tracing model calls, database
                tools, failed queries, and schema-aware recovery.
              </p>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-3">
              {DEMO_PROMPTS.map((demo) => (
                <button
                  className="rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isBusy}
                  key={demo.label}
                  onClick={() => sendDemoPrompt(demo.prompt)}
                  type="button"
                >
                  <span className="block text-sm font-medium">
                    {demo.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {demo.detail}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="w-full">{composer}</div>
      </div>
    </main>
  );
}

function PendingThinking() {
  return (
    <Message aria-live="polite" from="assistant">
      <MessageContent>
        <div className="mb-4 flex w-full items-center gap-2 text-muted-foreground text-sm">
          <BrainIcon className="size-4" />
          <span>Thinking...</span>
        </div>
      </MessageContent>
    </Message>
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unable to cancel the response.";
}

function StatusDot({ status }: { readonly status: AgentStatus }) {
  const isLive = status === "submitted" || status === "streaming";
  const tone =
    status === "error"
      ? "bg-destructive"
      : isLive
        ? "bg-emerald-500"
        : status === "ready"
          ? "bg-muted-foreground"
          : "bg-muted-foreground/50";

  return (
    <span className="relative flex size-1">
      {isLive ? (
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-75",
            tone,
          )}
        />
      ) : null}
      <span
        className={cn(
          "relative inline-flex size-1 rounded-full transition-colors",
          tone,
        )}
      />
    </span>
  );
}
