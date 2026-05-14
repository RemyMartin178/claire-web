import React from 'react';

const injectStyles = (id, css) => {
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }
};

const CSS = `
@keyframes eb-fadein {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes eb-draw {
  from { stroke-dashoffset: 40; opacity: 0; }
  to   { stroke-dashoffset: 0;  opacity: 1; }
}

.eb-root {
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%; min-height: 120px;
  font-family: 'Geist Variable', 'Geist', -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.eb-card {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 22px 24px; border-radius: 16px;
  background: linear-gradient(to bottom, rgba(24,23,28,0.75), rgba(24,23,28,0.80));
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.07);
  box-shadow: 0 12px 40px rgba(0,0,0,0.5);
  animation: eb-fadein 0.3s ease forwards;
  max-width: 260px; text-align: center;
}

.eb-icon {
  width: 36px; height: 36px; color: rgba(239,68,68,0.85);
}
.eb-icon path {
  stroke-dasharray: 40;
  stroke-dashoffset: 40;
  animation: eb-draw 0.6s ease 0.15s forwards;
}

.eb-title {
  font-size: 12.5px; font-weight: 600;
  color: rgba(255,255,255,0.85); margin: 0; line-height: 1.3;
}
.eb-subtitle {
  font-size: 10.5px; font-weight: 400;
  color: rgba(255,255,255,0.38); margin: 0; line-height: 1.5;
}

.eb-btn {
  margin-top: 4px;
  padding: 5px 14px; border-radius: 8px; border: none;
  font-family: inherit; font-size: 11px; font-weight: 500;
  cursor: pointer; transition: opacity 0.15s;
  background: radial-gradient(179.05% 132.83% at 46.18% -23.44%, #1562df 0%, #0c26a8 100%);
  color: #CBE3FF;
  box-shadow: 0 0 0 0.678px #0c44a1, inset 0 -1.355px 0 #022c70, inset 0 0.678px 0 #81b6ff;
}
.eb-btn:hover { opacity: 0.82; }
`;

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
        this.handleReset = this.handleReset.bind(this);
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary] Vue en erreur:', error, info);
    }

    handleReset() {
        this.setState({ hasError: false, error: null });
    }

    render() {
        injectStyles('eb-styles', CSS);

        if (!this.state.hasError) {
            return this.props.children;
        }

        const viewName = this.props.viewName || 'cette vue';

        return React.createElement('div', { className: 'eb-root' },
            React.createElement('div', { className: 'eb-card' },
                React.createElement('svg', {
                    className: 'eb-icon',
                    viewBox: '0 0 24 24', fill: 'none',
                    stroke: 'currentColor', strokeWidth: '1.5',
                    strokeLinecap: 'round', strokeLinejoin: 'round'
                },
                    React.createElement('path', { d: 'M18 6L6 18M6 6l12 12' })
                ),
                React.createElement('p', { className: 'eb-title' }, `Erreur dans ${viewName}`),
                React.createElement('p', { className: 'eb-subtitle' },
                    'Un problème inattendu s\'est produit. Vos données sont intactes.'
                ),
                React.createElement('button', {
                    className: 'eb-btn',
                    onClick: this.handleReset
                }, 'Réessayer')
            )
        );
    }
}

export default ErrorBoundary;
