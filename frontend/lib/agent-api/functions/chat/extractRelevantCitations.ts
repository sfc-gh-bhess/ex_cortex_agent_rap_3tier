import { Citation } from "../../types";

/**
 * Extracts relevant citations from the Cortex search text.
 */
export function extractRelevantCitations(cortexSearchText: string, citations: Citation[]): Citation[] {
    const pattern = /【†(\d+)†】/g;
    const uniqueNumbers = new Set<number>();

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(cortexSearchText)) !== null) {
        uniqueNumbers.add(Number(match[1]));
    }

    return citations.filter(citation => uniqueNumbers.has(citation.number));
}