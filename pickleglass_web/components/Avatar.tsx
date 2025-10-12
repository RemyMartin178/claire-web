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
    sm: 'h-6 w-6 text-xs',
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

  const baseClasses = `flex shrink-0 select-none items-center justify-center rounded-full font-medium leading-none ${sizeClasses[size]}`
  const colorClasses = avatarUrl
    ? ''
    : 'text-white bg-primary'
  const bgStyle = avatarUrl ? {} : {}

  return (
    <div className={`${baseClasses} ${colorClasses} ${className}`} style={bgStyle}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={name}
          src={avatarUrl}
          className="h-full w-full object-cover rounded-full"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  )
}
