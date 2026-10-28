/** @type {import('tailwindcss').Config} */

// Channels live in src/styles/tailwind.css as "R G B" so opacity modifiers
// such as ring-secondary/30 can compile inside @apply.
const withAlpha = (variable) => `rgb(var(${variable}) / <alpha-value>)`

module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: withAlpha("--color-border"),
        input: withAlpha("--color-input"),
        ring: withAlpha("--color-ring"),
        background: withAlpha("--color-background"),
        foreground: withAlpha("--color-foreground"),
        primary: {
          DEFAULT: withAlpha("--color-primary"),
          foreground: withAlpha("--color-primary-foreground"),
        },
        secondary: {
          DEFAULT: withAlpha("--color-secondary"),
          foreground: withAlpha("--color-secondary-foreground"),
        },
        destructive: {
          DEFAULT: withAlpha("--color-destructive"),
          foreground: withAlpha("--color-destructive-foreground"),
        },
        muted: {
          DEFAULT: withAlpha("--color-muted"),
          foreground: withAlpha("--color-muted-foreground"),
        },
        accent: {
          DEFAULT: withAlpha("--color-accent"),
          foreground: withAlpha("--color-accent-foreground"),
        },
        popover: {
          DEFAULT: withAlpha("--color-popover"),
          foreground: withAlpha("--color-popover-foreground"),
        },
        card: {
          DEFAULT: withAlpha("--color-card"),
          foreground: withAlpha("--color-card-foreground"),
        },
        success: {
          DEFAULT: withAlpha("--color-success"),
          foreground: withAlpha("--color-success-foreground"),
        },
        warning: {
          DEFAULT: withAlpha("--color-warning"),
          foreground: withAlpha("--color-warning-foreground"),
        },
        error: {
          DEFAULT: withAlpha("--color-error"),
          foreground: withAlpha("--color-error-foreground"),
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        bricolage: ['var(--font-bricolage)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}