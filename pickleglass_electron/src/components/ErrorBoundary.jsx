import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const { pageName = 'cette page', onReset } = this.props

    return (
      <div className="flex flex-col items-center justify-center h-full px-8 py-24 text-center">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>

        <p className="text-[13px] font-semibold text-[#111827] mb-1">
          Erreur dans {pageName}
        </p>
        <p className="text-[12px] text-[#6b7280] mb-5 max-w-[220px] leading-relaxed">
          Un problème inattendu s'est produit. Vos données sont intactes.
        </p>

        <button
          onClick={() => {
            this.setState({ hasError: false, error: null })
            onReset?.()
          }}
          className="px-4 py-1.5 rounded-lg text-[12px] font-medium text-white bg-[#111827] hover:bg-[#1f2937] transition-colors"
        >
          Réessayer
        </button>
      </div>
    )
  }
}

export default ErrorBoundary
