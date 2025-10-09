import { AgentMessage } from "../../types";

/**
 * appends a table to the last message in the assistant message as markdown
 */
export function appendChartToAssistantMessage(
    // passing as reference to avoid mutation
    assistantMessage: AgentMessage,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chartData: any,
): void {
    assistantMessage.content.push({
        type: "chart",
        chart: chartData,
    });
}