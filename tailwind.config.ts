import type { Config } from "tailwindcss";

export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        beige: "hsl(var(--color-beige))",
        "warm-white": "hsl(var(--color-warm-white))",
        greige: "hsl(var(--color-greige))",
        charcoal: "hsl(var(--color-charcoal))",
        "warm-brown": "hsl(var(--color-warm-brown))",
        gold: "hsl(var(--color-gold))",
        surface: "hsl(var(--surface))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
      },
      fontFamily: {
        hebrew: ["Heebo", "sans-serif"],
        bodoni: ["Bodoni Moda", "serif"],
        montserrat: ["Montserrat", "sans-serif"],
        playfair: ["Playfair Display", "serif"],
      },
      letterSpacing: {
        "logo-values": "0.5em",
        "logo-descriptor": "0.2em",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.8s ease forwards",
        "bounce-slow": "bounce 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
