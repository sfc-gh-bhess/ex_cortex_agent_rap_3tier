import { AgentMessage } from "../../types";

/**
 * Appends a tool response to the last message in the assistant message.
 */
export function appendToolResponseToAssistantMessage(
    assistantMessage: AgentMessage,
    toolResponse: AgentMessage['content'][number],
) {
    assistantMessage.content.push(toolResponse);
}