'use client';

import cx from 'classnames';
import type React from 'react';
import {
    useRef,
    useEffect,
    useCallback,
    memo,
} from 'react';
import { toast } from 'sonner';
import { useWindowSize } from 'usehooks-ts';

import { ArrowUpIcon } from './icons';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { SuggestedActions } from './suggested-actions';

export const ChatInput = ({
    isLoading,
    messagesLength,
    handleSubmit,
    className,
}: {
    isLoading: boolean;
    messagesLength: number;
    handleSubmit: (input: string) => void;
    className?: string;
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { width } = useWindowSize();

    useEffect(() => {
        if (textareaRef.current) {
            adjustHeight();
        }
    }, []);

    const adjustHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
        }
    };

    const resetHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = '98px';
        }
    };

    const submitForm = useCallback(() => {
        if (!textareaRef.current) return;

        if (textareaRef.current.value.trim() === '') {
            toast.error('Please enter a message.');
            return;
        }

        handleSubmit(textareaRef.current.value);
        textareaRef.current.value = '';
        resetHeight();

        if (width && width > 768) {
            textareaRef.current?.focus();
        }
    }, [handleSubmit, width]);

    return (
        <div className="relative w-full flex flex-col gap-6">
            {messagesLength === 0 && (
                <SuggestedActions handleSubmit={handleSubmit} />
            )}

            {/* Removed rounded-2xl */}
            <Textarea
                ref={textareaRef}
                placeholder="Send a message..."
                className={cx(
                    'border-0 min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none !text-base bg-muted pb-10 dark:border-zinc-700',
                    className,
                )}
                rows={2}
                autoFocus
                onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();

                        if (isLoading) {
                            toast.error('Please wait for the model to finish its response!');
                        } else {
                            submitForm();
                        }
                    }
                }}
            />

            <div className="absolute bottom-0 right-0 p-2 w-fit flex flex-row justify-end">
                <SendButton
                    input={textareaRef.current?.value ?? ''}
                    submitForm={submitForm}
                />
            </div>
        </div>
    );
}

function PureSendButton({
    submitForm,
    input,
}: {
    submitForm: () => void;
    input: string;
}) {
    return (
        <Button
            className="p-2 size-full border dark:border-zinc-600"
            onClick={(event) => {
                event.preventDefault();
                submitForm();
            }}
            variant="accent"
            disabled={input.length === 0}
        >
            <ArrowUpIcon size={14} />
        </Button>
    );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    return true;
});
