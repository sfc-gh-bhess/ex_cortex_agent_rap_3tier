import { AgentMessage } from "../../types";
import { convertSnowflakeTableDataToMarkdown } from "../chat/convertSnowflakeTableDataToMarkdown";

/**
 * appends a table to the last message in the assistant message as markdown
 */
export function appendFetchedTableToAssistantMessage(
    // passing as reference to avoid mutation
    assistantMessage: AgentMessage,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tableData: any,
    toolResult: boolean,
): void {
    const sqlMarkdown = convertSnowflakeTableDataToMarkdown(tableData);

    assistantMessage.content.push({
        type: "fetched_table",
        tableMarkdown: sqlMarkdown,
        toolResult: toolResult,
    });
}