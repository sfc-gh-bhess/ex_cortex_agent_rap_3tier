import { motion } from "framer-motion";
import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

export interface ChatSQLComponentProps {
    sql: string;
}

export function ChatSQLComponent(props: ChatSQLComponentProps) {
    const { sql } = props;

    return (
        <motion.div
            className="w-full mx-auto max-w-3xl pr-4 pl-0 group/message"
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { delay: 0 } }}
        >
            <details>
                <summary>View SQL</summary>
                <SyntaxHighlighter
                    style={oneLight}
                    language="sql"
                    PreTag="div"
                    className="text-sm overflow-x-scroll"
                >
                    {sql}
                </SyntaxHighlighter>
            </details>
        </motion.div>
    )
}