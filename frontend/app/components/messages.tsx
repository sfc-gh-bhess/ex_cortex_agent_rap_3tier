import { useScrollToBottom } from '../hooks/use-scroll-to-bottom';
import { Overview } from './overview';
import { memo } from 'react';
import equal from 'fast-deep-equal';
import { AgentApiState, AgentMessage } from '@/lib/agent-api';
import { PreviewMessage } from './message';
import { ThinkingMessage } from './chat-thinking-message';

interface MessagesProps {
    agentState: AgentApiState;
    messages: AgentMessage[];
    latestAssistantMessageId: string | null;
}

function PureMessages({
    agentState,
    messages,
    latestAssistantMessageId,
}: MessagesProps) {
    const [messagesContainerRef, messagesEndRef] =
        useScrollToBottom<HTMLDivElement>();

    return (
        <div
            ref={messagesContainerRef}
            className="flex flex-col min-w-0 gap-12 flex-1 overflow-y-scroll pt-4"
        >
            {messages.length === 0 && <Overview />}

            {messages.map((message, index) => (
                <PreviewMessage
                    key={message.id + index}
                    message={message}
                    agentState={agentState}
                    isLatestAssistantMessage={latestAssistantMessageId === message.id}
                />
            ))}

            {agentState === AgentApiState.LOADING && <ThinkingMessage />}

            <div
                ref={messagesEndRef}
                className="shrink-0 min-w-[24px] min-h-[24px]"
            />
        </div>
    );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
    if (prevProps.agentState !== nextProps.agentState) return false;
    if (prevProps.messages.length !== nextProps.messages.length) return false;
    if (!equal(prevProps.messages, nextProps.messages)) return false;
    return true;
});
