import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from '@/components/ui/avatar';
import type { ComponentProps, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
    from: 'user' | 'assistant' | 'system';
};

export const Message = ({ className, from, ...props }: MessageProps) => (
    <div
        className={cn(
            'group flex w-full items-end gap-2 py-4',
            from === 'user' ? 'flex-row justify-end' : 'flex-row-reverse justify-end',
            '[&>div]:max-w-[80%]',
            className,
        )}
        {...props}
    />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement> & {
    from: 'user' | 'assistant' | 'system';
};

export const MessageContent = ({
    children,
    className,
    from,
    ...props
}: MessageContentProps) => (
    <div
        className={cn(
            'flex flex-col gap-2 rounded-2xl text-[15px] px-4 py-3 overflow-hidden shadow-sm',
            from === 'user'
                ? 'bg-[#007aff] text-white rounded-br-none'
                : 'bg-[#f2f2f7] text-[#1d1d1f] border border-gray-100 font-medium rounded-bl-none',
            className,
        )}
        {...props}
    >
        <div>{children}</div>
    </div>
);

export type MessageAvatarProps = ComponentProps<typeof Avatar> & {
    src?: string;
    name?: string;
};

export const MessageAvatar = ({
    src,
    name,
    className,
    ...props
}: MessageAvatarProps) => (
    <Avatar
        className={cn('size-8 ring-1 ring-gray-100', className)}
        {...props}
    >
        {src && <AvatarImage alt="" className="mt-0 mb-0" src={src} />}
        <AvatarFallback className="text-[10px] font-bold text-[#8e8e93] bg-[#f2f2f7]">
            {name?.slice(0, 2).toUpperCase() || 'AI'}
        </AvatarFallback>
    </Avatar>
);
