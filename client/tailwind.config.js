/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}', // Esta línea es clave, asegura que todo en /src sea escaneado
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: {
          primary: "hsl(var(--background-primary))",
          secondary: "hsl(var(--background-secondary))",
        },
        foreground: {
          primary: "hsl(var(--text-primary))",
          secondary: "hsl(var(--text-secondary))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: { /* ... (tus colores primarios) ... */ },
        secondary: { /* ... (tus colores secundarios) ... */ },
        destructive: { /* ... */ },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: { /* ... */ },
        popover: { /* ... */ },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: { /* ... */ },
      animation: { /* ... */ },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('tailwindcss-animate')],

}