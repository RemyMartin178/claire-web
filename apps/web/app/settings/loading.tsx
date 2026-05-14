export default function SettingsLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 select-none">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-8 h-8 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: '#1562df', borderRightColor: '#1562df33' }}
        />
        <p className="text-[13px] font-medium text-[#86868B]">Chargement des paramètres...</p>
      </div>
    </div>
  )
}
