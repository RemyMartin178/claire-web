/** @type {import('tailwindcss').Config} */

// Supports opacity modifiers (bg-input/50, text-muted-foreground/70, border-border/60 …)
// on CSS variables that hold full oklch() color values.
const cssVar = (variable) => ({ opacityValue }) => {
	if (opacityValue !== undefined) {
		return `color-mix(in srgb, var(${variable}) ${Math.round(parseFloat(opacityValue) * 100)}%, transparent)`
	}
	return `var(${variable})`
}

module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./components/**/*.{js,ts,jsx,tsx,mdx}',
		'./app/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			fontFamily: {
				'heading': ['"Geist Variable"', 'Inter', '-apple-system', 'sans-serif'],
				'body': ['"Geist Variable"', 'Inter', '-apple-system', 'sans-serif'],
				'sans': ['"Geist Variable"', 'Inter', '-apple-system', 'sans-serif'],
				'serif': ['Lora', 'Georgia', 'Times New Roman', 'serif'],
			},
			letterSpacing: {
				tightest: '-0.022em',
				apple: '-0.011em',
			},
			colors: {
				// Cluely design tokens — via var() + color-mix pour opacity modifiers
				background: cssVar('--background'),
				foreground: cssVar('--foreground'),
				muted: {
					DEFAULT: cssVar('--muted'),
					foreground: cssVar('--muted-foreground'),
				},
				input: cssVar('--input'),
				border: cssVar('--border'),
				sidebar: cssVar('--sidebar'),
				card: {
					DEFAULT: cssVar('--card'),
					foreground: cssVar('--card-foreground'),
				},
				popover: {
					DEFAULT: cssVar('--popover'),
					foreground: cssVar('--popover-foreground'),
				},
				accent: {
					DEFAULT: cssVar('--accent'),
					foreground: cssVar('--accent-foreground'),
				},
				secondary: {
					DEFAULT: cssVar('--secondary'),
					foreground: cssVar('--secondary-foreground'),
				},
				// hsl() gardé pour primary et destructive (non remplacés par Cluely)
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				ring: cssVar('--ring'),
				'subtle-bg': '#f8f7f4',
				'subtle-active-bg': '#e7e5e4',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))',
				},
			},
			spacing: {
				'18': '4.5rem',
				'88': '22rem',
			},
			borderRadius: {
				'xs': '2px',
				'sm': '4px',
				'md': '8px',
				'lg': '12px',
				'xl': '16px',
				'2xl': '24px',
			},
			boxShadow: {
				'sm': '0 1px 3px rgba(0,0,0,0.1)',
				'md': '0 4px 6px rgba(0,0,0,0.1)',
				'lg': '0 8px 20px rgba(0,0,0,0.1)',
			},
			keyframes: {
				'fade-in': {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
				'slide-in': {
					'0%': { transform: 'translateY(-10px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' },
				},
				'slide-up': {
					'0%': { transform: 'translateY(10px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' },
				},
				'scale-in': {
					'0%': { transform: 'scale(0.95)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' },
				},
				'bounce-gentle': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-5px)' },
				},
				'slide-in-right': {
					'0%': { transform: 'translateX(100%)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' },
				},
				'slide-out-right': {
					'0%': { transform: 'translateX(0)', opacity: '1' },
					'100%': { transform: 'translateX(100%)', opacity: '0' },
				},
			},
			animation: {
				'fade-in': 'fade-in 0.6s ease-out',
				'slide-in': 'slide-in 0.6s ease-out',
				'slide-up': 'slide-up 0.6s ease-out',
				'scale-in': 'scale-in 0.4s ease-out',
				'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
				'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
				'slide-out-right': 'slide-out-right 0.3s ease-out forwards',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
}
