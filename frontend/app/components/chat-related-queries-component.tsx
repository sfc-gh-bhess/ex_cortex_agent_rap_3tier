import { RelatedQuery } from "@/lib/agent-api";
import { motion } from "framer-motion";
import { Markdown } from "./markdown";
import { convertCitationsSpecialCharactersToSpan } from "../functions/postProcessAgentText";

export interface ChatRelatedQueriesComponentProps {
    relatedQueries: RelatedQuery[];
}

export function ChatRelatedQueriesComponent(props: ChatRelatedQueriesComponentProps) {
    const { relatedQueries } = props;

    return (
        <motion.div
            className="flex flex-col gap-4 w-full"
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { delay: 0 } }}
        >
            {relatedQueries.map((query) => (
                <details key={query.relatedQuery}>
                    <summary>{query.relatedQuery}</summary>
                    <Markdown>{convertCitationsSpecialCharactersToSpan(query.answer)}</Markdown>
                </details>
            ))}
        </motion.div>
    )
}