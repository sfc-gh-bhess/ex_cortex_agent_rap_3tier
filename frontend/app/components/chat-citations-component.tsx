import { Citation } from "@/lib/agent-api";
import { CitationDialog } from "./citation-dialog";
import { extractRelevantCitations } from "@/lib/agent-api/functions/chat/extractRelevantCitations";

export interface ChatCitationsComponentProps {
    citations: Citation[];
    agentApiText: string;
}

export function ChatCitationsComponent(props: ChatCitationsComponentProps) {
    const { citations, agentApiText } = props;
    const relevantCitationsOnly = extractRelevantCitations(agentApiText, citations);

    return (
        <div className="flex flex-row gap-4">
            {relevantCitationsOnly.map((citation: Citation) => (
                <CitationDialog
                    key={citation.text}
                    citationsNumber={citation.number}
                    citation={citation.text} />
            ))}
        </div>
    )
}