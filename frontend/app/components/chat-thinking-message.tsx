import { motion } from 'framer-motion';
import { SparklesIcon } from './icons';
import { cx } from 'class-variance-authority';

export const ThinkingMessage = () => {
    return (
        <motion.div
            className="w-full mx-auto max-w-3xl px-4 group/message "
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
        >
            <div
                className={cx(
                    'h-[24px] overflow-hidden items-end flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl',
                    {
                        'group-data-[role=user]/message:bg-muted': true,
                    },
                )}
            >
                <div className="size-6 flex items-center rounded-full justify-center shrink-0 border-none animate-pulse">
                    <SparklesIcon size={16} />
                </div>

                <div className="flex flex-col gap-2 w-full">
                    <div className="flex flex-col gap-4 text-muted-foreground text-md">
                        Thinking...
                    </div>
                </div>
            </div>
        </motion.div>
    );
};