'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { memo } from 'react';
import equal from 'fast-deep-equal';
import { 
    AgentApiState, 
    AgentMessage, 
    AgentMessageRole, 
    AgentMessageChartContent, 
    AgentMessageFetchedTableContent, 
    AgentMessageTextContent, 
    AgentMessageToolResultsContent, 
    AgentMessageToolUseContent, 
    Citation, 
    CortexSearchCitationSource, 
    RELATED_QUERIES_REGEX, 
    RelatedQuery 
} from '@/lib/agent-api';
import { prettifyChartSpec } from '@/lib/agent-api/functions/chat/prettifyChartSpec';
import { postProcessAgentText } from '../functions/postProcessAgentText';
import { ChatTextComponent } from './chat-text-component';
import { ChatChartComponent } from './chat-chart-component';
import { ChatSQLComponent } from './chat-sql-component';
import { ChatTableComponent } from './chat-table-component';
import { ChatRelatedQueriesComponent } from './chat-related-queries-component';
import { ChatCitationsComponent } from './chat-citations-component';

interface PreviewMessageProps {
    message: AgentMessage;
    agentState: AgentApiState;
    isLatestAssistantMessage: boolean;
}

const PurePreviewMessage = ({
    message,
    agentState,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isLatestAssistantMessage,
}: PreviewMessageProps) => {
    // Skip messages with only search citations (no text yet)
    if (
        message.content.length === 2 &&
        message.content[0]?.type === "tool_use" &&
        (message?.content[0] as AgentMessageToolUseContent)?.tool_use?.name === "search1"
    ) {
        return null;
    }

    let agentApiText = "";
    const role = message.role;
    const citations: Citation[] = [];
    const relatedQueries: RelatedQuery[] = [];
    const agentResponses: React.ReactElement[] = [];

    // Process each content item in the message
    message.content.forEach((content) => {
        if (content.type === "text") {
            const { text } = (content as AgentMessageTextContent);
            agentApiText = text;

            // Extract related queries if citations exist
            if (citations.length > 0) {
                relatedQueries.push(...text.matchAll(RELATED_QUERIES_REGEX).map(match => ({
                    relatedQuery: match[1].trim(),
                    answer: match[2].trim()
                })));
            }

            const postProcessedText = postProcessAgentText(text, relatedQueries, citations);
            agentResponses.push(<ChatTextComponent key={text} text={postProcessedText} role={role} />);

        } else if (content.type === "tool_results") {
            const toolResultsContent = (content as AgentMessageToolResultsContent).tool_results.content[0].json;

            // Search results contain citations
            if ("searchResults" in toolResultsContent) {
                citations.push(...toolResultsContent.searchResults.map((result: CortexSearchCitationSource) => ({
                    text: result.text,
                    number: parseInt(String(result.source_id), 10),
                })))
            }

            // Analyst text explanation
            if ("text" in toolResultsContent) {
                const { text } = toolResultsContent;
                agentResponses.push(<ChatTextComponent key={text} role={role} text={text} />);
            }

            // SQL statement (will be REDACTED if from backend)
            if ("sql" in toolResultsContent) {
                const { sql } = toolResultsContent;
                agentResponses.push(<ChatSQLComponent key={sql} sql={sql} />);
            }

        } else if (content.type === "fetched_table") {
            const tableContent = (content as AgentMessageFetchedTableContent);
            agentResponses.push(
                <ChatTableComponent 
                    key={`${tableContent.tableMarkdown}-${tableContent.toolResult}`} 
                    tableMarkdown={tableContent.tableMarkdown} 
                    toolResult={tableContent.toolResult} 
                />
            );

        } else if (content.type === "chart") {
            const chartContent = (content as AgentMessageChartContent);
            const chartSpec = prettifyChartSpec(JSON.parse(chartContent.chart.chart_spec));
            agentResponses.push(<ChatChartComponent key={JSON.stringify(chartSpec)} chartSpec={chartSpec} />);
        }
    });

    // Don't render if no content
    if (agentResponses.length === 0) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                className="w-full mx-auto max-w-3xl px-4 group/message"
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                data-role={message.role}
            >
                <div className='flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-lg group-data-[role=user]/message:w-fit'>
                    <div className="flex flex-col gap-4 w-full">
                        {agentResponses}

                        {role === AgentMessageRole.ASSISTANT && relatedQueries.length > 0 && (
                            <ChatRelatedQueriesComponent relatedQueries={relatedQueries} />
                        )}

                        {role === AgentMessageRole.ASSISTANT && citations.length > 0 && agentState === AgentApiState.IDLE && agentApiText && (
                            <ChatCitationsComponent agentApiText={agentApiText} citations={citations} />
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export const PreviewMessage = memo(
    PurePreviewMessage,
    (prevProps, nextProps) => {
        if (!equal(prevProps.agentState, nextProps.agentState)) return false;
        if (!equal(prevProps.message.content, nextProps.message.content)) return false;
        return true;
    },
);
