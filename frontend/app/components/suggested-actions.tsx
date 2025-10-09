'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface SuggestedActionsProps {
    handleSubmit: (input: string) => void;
}

export const SuggestedActions = ({ handleSubmit }: SuggestedActionsProps) => {
    let suggestedActions = [
        'How many claims are currently open? How many are $10K or higher?',
        'Create a chart from repair invoices by zipcodes for Austin.  Are there certain areas with higher repair charges?',
        'List appraisal clauses related to snowmobiles across all our contracts?',
        'Rental car'
    ];

    if (process.env.NEXT_PUBLIC_SUGGESTED_QUERIES) {
        try {
            suggestedActions = JSON.parse(process.env.NEXT_PUBLIC_SUGGESTED_QUERIES);
        } catch {
            toast.error('Error parsing from NEXT_PUBLIC_SUGGESTED_QUERIES. Please make sure it is valid JSON.');
        }
    }

    return (
        <div className="grid sm:grid-cols-2 gap-2 w-full">
            {suggestedActions.map((suggestedAction, index) => (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ delay: 0.05 * index }}
                    key={`suggested-action-${suggestedAction}-${index}`}
                    className={index > 1 ? 'hidden sm:block' : 'block'}
                >
                    <Button
                        variant="ghost"
                        onClick={(e) => {
                            e.preventDefault();
                            handleSubmit(suggestedAction);
                        }}
                        className="size-full text-left border px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col justify-start items-start whitespace-normal text-muted-foreground"
                    >
                        {suggestedAction}
                    </Button>
                </motion.div>
            ))}
        </div>
    );
}
