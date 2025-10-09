import { motion } from 'framer-motion';
import { MessageIcon } from './icons';

export const Overview = () => {
    return (
        <motion.div
            key="overview"
            className="w-full h-full flex justify-center items-center"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ delay: 0.5 }}
        >
            <div className="flex flex-col gap-4 mt-[9rem]">
                <p className="flex flex-row justify-center gap-4 items-center">
                    <MessageIcon size={32} />
                </p>
                <h1 className="text-[28px] font-bold">What can I help with?</h1>
            </div>
        </motion.div>
    );
};
