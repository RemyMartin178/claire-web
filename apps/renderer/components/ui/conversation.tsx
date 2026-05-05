'use client';

import { Button } from '@/components/ui/button';
import { ArrowDownIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useCallback, useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type ConversationProps = ComponentProps<'div'>;

export const Conversation = ({ className, children, ...props }: ConversationProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [children]);

    return (
        <div
            ref={scrollRef}
            className={cn('relative flex-1 overflow-y-auto no-scrollbar', className)}
            {...props}
        >
            {children}
        </div>
    );
};

export type ConversationContentProps = ComponentProps<'div'>;

export const ConversationContent = ({
    className,
    ...props
}: ConversationContentProps) => (
    <div className={cn('p-4', className)} {...props} />
);

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
    className,
    ...props
}: ConversationScrollButtonProps) => {
    // Simplified version without use-stick-to-bottom state
    return null;
};
