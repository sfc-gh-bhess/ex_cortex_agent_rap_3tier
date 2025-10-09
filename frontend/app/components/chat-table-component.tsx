import { motion } from "framer-motion";
import { Markdown } from "./markdown";

export interface ChatTableComponentProps {
    tableMarkdown: string;
    toolResult: boolean;
}

export function ChatTableComponent(props: ChatTableComponentProps) {
    const { tableMarkdown, toolResult } = props;

    return (
        <motion.div
            className="w-full mx-auto max-w-3xl pr-4 pl-0 group/message"
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { delay: 0 } }}
        >
            {toolResult ? (
                <details open={false}>
                    <summary>View result table</summary>
                    <Markdown>{tableMarkdown}</Markdown>
                </details>
            ) : (
                <Markdown>{tableMarkdown}</Markdown>
            )}
        </motion.div>
    )
}