"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface LiquidGlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    containerClassName?: string
    onAction?: (value: string) => void
}

export function LiquidGlassInput({
    className,
    containerClassName,
    onAction,
    ...props
}: LiquidGlassInputProps) {
    const [value, setValue] = React.useState("")

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && value.trim()) {
            onAction?.(value)
            setValue("")
        }
    }

    return (
        <div className={cn("relative group w-full", containerClassName)}>
            {/* The "Liquid Glass" Spot/Tache Effect */}
            <div className="absolute inset-0 z-0 h-full w-full rounded-2xl 
          shadow-[0_0_8px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.05),inset_2px_2px_0.5px_-2px_rgba(0,0,0,0.3),inset_-2px_-2px_0.5px_-2px_rgba(0,0,0,0.2),inset_0_0_4px_4px_rgba(0,0,0,0.05),0_0_8px_rgba(255,255,255,0.1)] 
          transition-all duration-500 group-focus-within:shadow-[0_0_12px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.08),inset_2px_2px_0.5px_-2px_rgba(0,0,0,0.4),inset_-2px_-2px_0.5px_-2px_rgba(0,0,0,0.3)]" />

            <div
                className="absolute inset-0 isolate -z-10 h-full w-full overflow-hidden rounded-2xl bg-white/40"
                style={{ backdropFilter: 'url("#input-glass-filter") blur(20px)' }}
            />

            <div className="relative z-10 flex items-center w-full gap-2.5 px-3.5 py-1.5">
                <input
                    className={cn(
                        "flex-1 bg-transparent border-none text-[#1d1d1f] text-[15px] focus:outline-none placeholder-[#86868b] py-1 font-sans selection:bg-[#007aff]/20",
                        className
                    )}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    {...props}
                />

                {/* Buttons/Actions inside the glass spot */}
                <div className="flex items-center gap-1.5 pr-1">
                    <button className="p-2 rounded-full hover:bg-black/5 text-[#86868b] transition-colors">
                        <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                    </button>
                    <button
                        onClick={() => {
                            if (value.trim()) {
                                onAction?.(value)
                                setValue("")
                            }
                        }}
                        className="btn-primary-icon ml-0.5 shadow-lg active:scale-95"
                    >
                        <span className="flex items-center justify-center">
                            <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>
                        </span>
                    </button>
                </div>
            </div>

            <GlassFilterSVG />
        </div>
    )
}

function GlassFilterSVG() {
    return (
        <svg className="hidden">
            <defs>
                <filter
                    id="input-glass-filter"
                    x="-20%"
                    y="-20%"
                    width="140%"
                    height="140%"
                    colorInterpolationFilters="sRGB"
                >
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.04 0.04"
                        numOctaves="2"
                        seed="2"
                        result="noise"
                    />
                    <feGaussianBlur in="noise" stdDeviation="3" result="blurredNoise" />
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="blurredNoise"
                        scale="40"
                        xChannelSelector="R"
                        yChannelSelector="B"
                        result="displaced"
                    />
                    <feGaussianBlur in="displaced" stdDeviation="2" result="finalBlur" />
                    <feComposite in="finalBlur" in2="finalBlur" operator="over" />
                </filter>
            </defs>
        </svg>
    );
}
