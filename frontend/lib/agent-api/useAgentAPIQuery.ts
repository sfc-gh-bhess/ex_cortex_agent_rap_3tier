"use client"

import React from "react";
import { events } from 'fetch-event-stream';
import shortUUID from "short-uuid";
import { toast } from "sonner";
import { AgentMessage, AgentMessageRole } from "./types";
import { appendTextToAssistantMessage } from "./functions/assistant/appendTextToAssistantMessage";
import { getEmptyAssistantMessage } from "./functions/assistant/getEmptyAssistantMessage";
import { appendToolResponseToAssistantMessage } from "./functions/assistant/appendToolResponseToAssistantMessage";
import { appendFetchedTableToAssistantMessage } from "./functions/assistant/appendFetchedTableToAssistantMessage";
import { appendChartToAssistantMessage } from "./functions/assistant/appendChartToAssistantMessage";
import { appendTableToAssistantMessage } from "./functions/assistant/appendTableToAssistantMessage";
import { removeFetchedTableFromMessages } from "./functions/chat/removeFetchedTableFromMessages";

export interface AgentApiQueryParams { backendUrl: string }

export enum AgentApiState {
    IDLE = "idle",
    LOADING = "loading",
    STREAMING = "streaming",
}

// =============================================================================
// Helper Functions
// =============================================================================

function parseEventData(eventData: string) {
    try {
        return JSON.parse(eventData);
    } catch {
        return null;
    }
}

function updateMessagesAfterLastUser(currentMessage: AgentMessage) {
    return (prevMessages: AgentMessage[]) => {
        const lastUserMessageIndex = prevMessages.findLastIndex(
            (message) => message.role === AgentMessageRole.USER,
        );
        return [
            ...prevMessages.slice(0, lastUserMessageIndex + 1),
            structuredClone(currentMessage)
        ];
    };
}

function processContentItem(currentMessage: AgentMessage, contentItem: AgentMessage['content'][number]) {
    if ('text' in contentItem) {
        appendTextToAssistantMessage(currentMessage, contentItem.text);
    } else if ('tool_use' in contentItem) {
        appendToolResponseToAssistantMessage(currentMessage, contentItem);
    } else if ('tool_results' in contentItem) {
        appendToolResponseToAssistantMessage(currentMessage, contentItem);
    } else if ('chart' in contentItem) {
        appendChartToAssistantMessage(currentMessage, contentItem.chart);
    } else if ('table' in contentItem) {
        appendTableToAssistantMessage(currentMessage, contentItem.table);
    }
}

// =============================================================================
// Main Hook
// =============================================================================

export function useAgentAPIQuery(params: AgentApiQueryParams) {
    const { backendUrl } = params;

    const [agentState, setAgentState] = React.useState<AgentApiState>(AgentApiState.IDLE);
    const [messages, setMessages] = React.useState<AgentMessage[]>([]);
    const [latestAssistantMessageId, setLatestAssistantMessageId] = React.useState<string | null>(null);

    const handleNewMessage = React.useCallback(async (input: string) => {
        // Add user message
        const newMessages = structuredClone(messages);
        newMessages.push({
            id: shortUUID.generate(),
            role: AgentMessageRole.USER,
            content: [{ type: "text", text: input }],
        });
        setMessages(newMessages);
        setAgentState(AgentApiState.LOADING);

        // Call backend agent API
        const response = await fetch(`${backendUrl}/api/agent/run`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: removeFetchedTableFromMessages(newMessages) })
        });

        // Initialize single assistant message for the entire response
        const assistantMessageId = shortUUID.generate();
        setLatestAssistantMessageId(assistantMessageId);
        const assistantMessage = getEmptyAssistantMessage(assistantMessageId);

        // Process SSE stream
        const streamEvents = events(response);
        for await (const event of streamEvents) {
            // Handle table results from backend SQL execution
            if (event.event === 'table_result') {
                const tableData = parseEventData(event.data!);
                if (tableData) {
                    appendFetchedTableToAssistantMessage(assistantMessage, tableData, true);
                    setMessages(updateMessagesAfterLastUser(assistantMessage));
                }
                continue;
            }

            // Backend signals data-to-analytics is starting (but we stay in same message)
            if (event.event === 'new_assistant_message') {
                // Just continue adding to the same message - no need to create a new one
                continue;
            }

            // Handle completion
            if (event.data === "[DONE]") {
                setAgentState(AgentApiState.IDLE);
                return;
            }

            // Handle errors
            const parsed = parseEventData(event.data!);
            if (!parsed) continue;

            if (parsed.code) {
                toast.error(parsed.message);
                setAgentState(AgentApiState.IDLE);
                return;
            }

            // Process content array
            const contentArray = parsed?.delta?.content || [];
            contentArray.forEach((contentItem: AgentMessage['content'][number]) => {
                processContentItem(assistantMessage, contentItem);
            });

            // Update UI with latest message
            setMessages(updateMessagesAfterLastUser(assistantMessage));

            // Update state when non-search tools are used
            const firstContent = contentArray[0];
            if (firstContent && 'tool_use' in firstContent && firstContent.tool_use?.name !== "search1") {
                setAgentState(AgentApiState.STREAMING);
            }
        }
    }, [backendUrl, messages]);

    return {
        agentState,
        messages,
        handleNewMessage,
        latestAssistantMessageId,
    };
}
