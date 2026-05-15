export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-white px-6 pt-[18vh] select-none">
      <div className="max-w-sm w-full flex flex-col items-center gap-6">
        <div
          className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: '#1562df', borderRightColor: '#1562df33' }}
        />
        <p className="text-[14px] font-medium text-[#86868B]">Chargement...</p>
      </div>
    </div>
  )
}
