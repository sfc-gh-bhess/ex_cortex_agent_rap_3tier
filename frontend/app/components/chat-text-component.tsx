import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";

export interface ChatTextComponentProps {
    text: string;
    role: string;
}

export function ChatTextComponent(props: ChatTextComponentProps) {
    const { text, role } = props;

    return (
        <div className="flex flex-row gap-2 items-start">
            <div
                className={cn('flex flex-col gap-4', {
                    'bg-[#f7f7f7] px-4 py-3 rounded-xl':
                        role === 'user',
                })}
            >
                <Markdown>{text}</Markdown>
            </div>
        </div>
    )
}