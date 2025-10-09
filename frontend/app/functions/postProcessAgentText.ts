import { Citation, RelatedQuery } from "../../lib/agent-api/types";

export const citationsColorMap: Record<number, string[]> = {
    1: ["bg-[#F0F2FF]", "text-[#2446E0]"],
    2: ["bg-[#EDF8E8]", "text-[#026A4B]"],
    3: ["bg-[#F6F3FC]", "text-[#6D31BF]"],
    4: ["bg-[#F9F5EC]", "text-[#7D5C02]"],
    5: ["bg-[#FCF3FC]", "text-[#962696]"],
    6: ["bg-[#ECF4F9]", "text-[#035B87]"],
    7: ["bg-[#FFF1E0]", "text-[#9A3E13]"],
    8: ["bg-[#F0F2FF]", "text-[#2446E0]"],
    9: ["bg-[#EDF8E8]", "text-[#026A4B]"],
    10: ["bg-[#F6F3FC]", "text-[#6D31BF]"],
    11: ["bg-[#F9F5EC]", "text-[#7D5C02]"],
    12: ["bg-[#FCF3FC]", "text-[#962696]"],
    13: ["bg-[#ECF4F9]", "text-[#035B87]"],
    14: ["bg-[#FFF1E0]", "text-[#9A3E13]"],
};

export function convertCitationsSpecialCharactersToSpan(text: string) {
    return text.replace(/【†(\d+)†】/g, (_, number) => {
        return `<span class="cursor-default rounded-full shrink-0 size-5 inline-flex items-center justify-center ${citationsColorMap[Number(number)][0]} ${citationsColorMap[Number(number)][1]} text-xs font-semibold">${number}</span>`;
    })
};

export function postProcessAgentText(text: string, relatedQueries: RelatedQuery[], citations: Citation[]): string {
    const RELATED_QUERIES_REGEX = /Related query:\s*(.*?)\s*Answer:\s*(.*?)(?=\nRelated query:|\n*$)/gs;
    const relatedQueriesExtractedText = relatedQueries.length > 0 ? text.replace(RELATED_QUERIES_REGEX, "") + "\nRelated Queries:\n" : text;
    const citationsMarkdownProcessedText = citations.length > 0 ? convertCitationsSpecialCharactersToSpan(relatedQueriesExtractedText) : relatedQueriesExtractedText;

    return citationsMarkdownProcessedText;
}