import {
    CopyIcon,
    ShareIcon,
} from "lucide-react"
import { Action, Actions } from "@/components/ui/actions"
import { Message, MessageContent } from "@/components/ui/message"
import { cn } from "@/lib/utils"
import { toast } from "react-hot-toast"

interface AiActionsProps {
    role: 'user' | 'assistant';
    content: string;
}

export const AiMessageWithActions = ({ role, content }: AiActionsProps) => {
    const handleCopy = () => {
        navigator.clipboard.writeText(content)
        toast.success("Copié dans le presse-papier")
    }

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Claire AI Response',
                text: content,
            }).catch(console.error)
        } else {
            handleCopy()
        }
    }

    return (
        <Message from={role} className={cn(role === 'assistant' ? 'items-start' : 'items-end')}>
            <div className="flex flex-col gap-2 w-full">
                <MessageContent from={role}>{content}</MessageContent>
                {role === "assistant" && (
                    <Actions className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity justify-start px-1">
                        <Action
                            label="Copier"
                            onClick={handleCopy}
                            className="size-8"
                        >
                            <CopyIcon className="size-3.5" />
                        </Action>
                        <Action
                            label="Partager"
                            onClick={handleShare}
                            className="size-8"
                        >
                            <ShareIcon className="size-3.5" />
                        </Action>
                    </Actions>
                )}
            </div>
        </Message>
    )
}
