"use client"

import { AgentApiState, useAgentAPIQuery } from "@/lib/agent-api";
import { Messages } from "./components/messages";
import { ChatInput } from "./components/input";
import { ChatHeader } from "./components/chat-header";

export default function Home() {
  // Agent API requires a JWT auth token. For simplicity we are using an api to fetch this,
  // but this can be easily replaced with a login layer and session management
  // const { token: jwtToken } = useAccessToken();

  const { agentState, messages, latestAssistantMessageId, handleNewMessage } = useAgentAPIQuery({
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000",
  })

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader />

        <Messages
          agentState={agentState}
          messages={messages}
          latestAssistantMessageId={latestAssistantMessageId}
        />

        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          <ChatInput
            isLoading={agentState !== AgentApiState.IDLE}
            messagesLength={messages.length}
            handleSubmit={handleNewMessage} />
        </form>
      </div>
    </>
  );
}
