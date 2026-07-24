import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['var(--font-cinzel)', 'serif'],
        serif: ['var(--font-cormorant)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Theme-driven palette (customizable at runtime)
        base: 'hsl(var(--c-bg) / <alpha-value>)',
        soft: 'hsl(var(--c-bg-alt) / <alpha-value>)',
        surface: 'hsl(var(--c-surface) / <alpha-value>)',
        ink: 'hsl(var(--c-ink) / <alpha-value>)',
        'ink-soft': 'hsl(var(--c-ink-soft) / <alpha-value>)',
        subtle: 'hsl(var(--c-muted) / <alpha-value>)',
        accent1: 'hsl(var(--c-accent) / <alpha-value>)',
        accent2: 'hsl(var(--c-accent-2) / <alpha-value>)',
        gold: 'hsl(var(--c-gold) / <alpha-value>)',
        teal: 'hsl(var(--c-teal) / <alpha-value>)',
        line: 'hsl(var(--c-line) / <alpha-value>)',
        // shadcn tokens (kept for component compatibility)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      boxShadow: {
        soft: '0 1px 2px hsl(var(--c-ink) / 0.04), 0 8px 24px -12px hsl(var(--c-ink) / 0.12)',
        card: '0 1px 3px hsl(var(--c-ink) / 0.06), 0 18px 40px -24px hsl(var(--c-ink) / 0.22)',
        glow: '0 10px 40px -8px hsl(var(--c-accent) / 0.55)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'flip-in': {
          '0%': { transform: 'rotateY(90deg)', opacity: '0' },
          '100%': { transform: 'rotateY(0deg)', opacity: '1' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.2', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.15)' },
        },
        // Barajado: oscilación de rotación de todo el mazo mientras se mezcla.
        'shuffle-deck': {
          '0%, 100%': { transform: 'rotate(-9deg) translateX(-2%)' },
          '25%': { transform: 'rotate(6deg) translateX(3%)' },
          '50%': { transform: 'rotate(-5deg) translateX(-3%)' },
          '75%': { transform: 'rotate(8deg) translateX(2%)' },
        },
        // Cada carta del mazo se contonea con su propio desfase.
        'card-sway': {
          '0%, 100%': { transform: 'rotate(-4deg) translateY(0)' },
          '50%': { transform: 'rotate(4deg) translateY(-6px)' },
        },
        // Volteo 3D del anverso al revelar.
        'card-flip': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        // Reparto: la carta entra desde el mazo hasta su sitio.
        'deal-in': {
          '0%': { opacity: '0', transform: 'translateY(30px) rotate(-8deg) scale(0.85)' },
          '100%': { opacity: '1', transform: 'translateY(0) rotate(0) scale(1)' },
        },
        // Elevación suave de la carta ya revelada.
        'card-rise': {
          '0%': { transform: 'translateY(10px)', opacity: '0.6' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.8s ease both',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'spin-slow': 'spin-slow 26s linear infinite',
        'flip-in': 'flip-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        marquee: 'marquee 34s linear infinite',
        twinkle: 'twinkle 4s ease-in-out infinite',
        'shuffle-deck': 'shuffle-deck 0.5s ease-in-out infinite',
        'card-sway': 'card-sway 2.2s ease-in-out infinite',
        'card-flip': 'card-flip 0.7s cubic-bezier(0.4, 0, 0.2, 1) both',
        'deal-in': 'deal-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'card-rise': 'card-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
      },
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
