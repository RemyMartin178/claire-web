'use client';

import { Calendar, X } from 'lucide-react';

interface MeetingNotificationProps {
  title: string;
  time: string;            // e.g. "Maintenant" / "Dans 2 min" / "14:30"
  participants?: number;
  onJoin?: () => void;
  onDismiss?: () => void;
  onMute?: () => void;
}

/**
 * Meeting notification card — 400px wide, multi-layer drop shadow,
 * blue rim, light + dark variants auto.
 */
export default function CluelyMeetingNotification({
  title,
  time,
  participants,
  onJoin,
  onDismiss,
  onMute,
}: MeetingNotificationProps) {
  return (
    <div className="cluely-notification-container">
      {/* Top row : icon + title + close */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="cluely-glow-dot !size-9 shrink-0">
            <Calendar size={16} className="text-white" strokeWidth={2.2} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold leading-tight text-neutral-900 dark:text-white truncate">
              {title}
            </div>
            <div className="text-[12px] text-neutral-500 dark:text-white/60 mt-0.5 flex items-center gap-2">
              <span>{time}</span>
              {participants && (
                <>
                  <span className="size-1 rounded-full bg-current opacity-40" />
                  <span>{participants} participants</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="size-6 shrink-0 rounded-full flex items-center justify-center text-neutral-500 dark:text-white/50 hover:bg-black/5 dark:hover:bg-[#27272a]/70 transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={onJoin}
          className="cluely-notification-accent-button flex-1 h-9 rounded-lg text-[13px] font-medium"
        >
          Rejoindre la réunion
        </button>

        {onMute && (
          <button
            onClick={onMute}
            className="cluely-notification-button h-9 px-3 rounded-lg text-[13px] font-medium"
          >
            Plus tard
          </button>
        )}
      </div>
    </div>
  );
}
