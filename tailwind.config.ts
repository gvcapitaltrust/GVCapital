import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "gv-gold": "#B8860B",
        background: "#ffffff",
        foreground: "#1a1a1a",
      },
    },
  },
  plugins: [],
} satisfies Config;
