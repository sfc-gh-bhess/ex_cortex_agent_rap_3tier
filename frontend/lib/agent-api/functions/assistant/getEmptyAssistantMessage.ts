import { AgentMessage, AgentMessageRole } from "../../types";

/**
 * Returns an empty assistant message.
 */
export function getEmptyAssistantMessage(latestId: string): AgentMessage {
    return {
        id: latestId,
        role: AgentMessageRole.ASSISTANT,
        content: [],
    }
}