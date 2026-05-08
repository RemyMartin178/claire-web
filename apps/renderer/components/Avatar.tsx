import * as React from "react"

interface AvatarProps {
  name: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Avatar({
  name,
  avatarUrl = null,
  size = 'md',
  className = ''
}: AvatarProps) {
  const sizeClasses = {
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base'
  }

  const generateInitials = (fullName: string): string => {
    const parts = fullName.split(" ").filter(Boolean)
    if (parts.length === 0) return "U"
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "U"
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }

  const initials = generateInitials(name)

  const baseClasses = `flex shrink-0 select-none items-center justify-center rounded-[6px] font-bold tracking-tight antialiased leading-none ${sizeClasses[size]}`
  const PALETTE = [
    '#A88B7D', // Taupe (Original)
    '#5C6B73', // Ardoise
    '#8B9B96', // Sauge
    '#6B705C', // Olive
    '#A5A58D', // Mousse
    '#B7B7A4', // Sable
    '#6D597A', // Prune
    '#355070', // Bleu nuit
  ]

  const getBackgroundColor = (nameStr: string) => {
    let hash = 0
    for (let i = 0; i < nameStr.length; i++) {
      hash = nameStr.charCodeAt(i) + ((hash << 5) - hash)
    }
    return PALETTE[Math.abs(hash) % PALETTE.length]
  }

  const colorClasses = avatarUrl
    ? ''
    : 'text-white shadow-sm'
  const bgStyle = avatarUrl ? {} : { backgroundColor: getBackgroundColor(name) }

  return (
    <div className={`${baseClasses} ${colorClasses} ${className}`} style={bgStyle}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={name}
          src={avatarUrl}
          className="h-full w-full rounded-[6px] object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  )
}
