'use client'

export default function SkeletonLoader() {
  return (
    <div className="flex h-screen bg-[#202123]">
      {/* Sidebar Skeleton */}
      <div className="w-[220px] bg-[#1E1E1E] p-2">
        {/* Logo skeleton */}
        <div className="h-8 bg-gray-700 rounded mb-8 animate-pulse"></div>
        
        {/* Navigation items skeleton */}
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
        
        {/* Bottom section skeleton */}
        <div className="absolute bottom-4 left-2 right-2">
          <div className="h-12 bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
      
      {/* Main content skeleton */}
      <div className="flex-1 p-8">
        {/* Header skeleton */}
        <div className="h-8 bg-gray-700 rounded w-1/3 mb-6 animate-pulse"></div>
        
        {/* Content skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  )
}
