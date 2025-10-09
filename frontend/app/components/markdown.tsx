/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import React, { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

const components: Partial<Components> = {
    table: ({ ...props }) => (
        <div className="max-w-[685px] max-h-[443px] overflow-y-scroll overflow-x-scroll mt-2">
            <table
                {...props}
                className='w-full'
            />
        </div>
    ),
    th: ({ ...props }) => (
        <th
            {...props}
            className="px-2 py-1 border border-border bg-muted text-left leading-relaxed text-xs font-medium text-muted-foreground"
        />
    ),
    td: ({ ...props }) => (
        <td
            {...props}
            className="px-2 py-1 border border-border leading-relaxed text-sm"
        />
    ),
    pre: ({ children }: any) => <>{children}</>,
    ol: ({ children, ...props }: any) => {
        return (
            <ol {...props} className="list-decimal list-outside ml-4">
                {children}
            </ol>
        );
    },
    li: ({ children, ...props }: any) => {
        return (
            <li {...props} className="py-1">
                {children}
            </li>
        );
    },
    ul: ({ children, ...props }: any) => {
        return (
            <ul {...props} className="list-decimal list-outside ml-4">
                {children}
            </ul>
        );
    },
    strong: ({ children, ...props }: any) => {
        return (
            <span {...props} className="font-medium">
                {children}
            </span>
        );
    },
    a: ({ children, ...props }: any) => {
        return (
            <Link
                {...props}
                className="text-blue-500 hover:underline"
                target="_blank"
                rel="noreferrer"
            >
                {children}
            </Link>
        );
    },
    h1: ({ children, ...props }: any) => {
        return (
            <h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>
                {children}
            </h1>
        );
    },
    h2: ({ children, ...props }: any) => {
        return (
            <h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>
                {children}
            </h2>
        );
    },
    h3: ({ children, ...props }: any) => {
        return (
            <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>
                {children}
            </h3>
        );
    },
    h4: ({ children, ...props }: any) => {
        return (
            <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>
                {children}
            </h4>
        );
    },
    h5: ({ children, ...props }: any) => {
        return (
            <h5 className="text-base font-semibold mt-6 mb-2" {...props}>
                {children}
            </h5>
        );
    },
    h6: ({ children, ...props }: any) => {
        return (
            <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
                {children}
            </h6>
        );
    },
};

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeRaw];

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
    return (
        <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
            {children}
        </ReactMarkdown>
    );
};

export const Markdown = memo(
    NonMemoizedMarkdown,
    (prevProps, nextProps) => prevProps.children === nextProps.children,
);
