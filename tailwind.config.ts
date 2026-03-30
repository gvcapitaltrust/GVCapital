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
        "gv-gold": "#9A7D2E",
        background: "#FAFAF8",
        foreground: "#1a1a1a",
      },
    },
  },
  plugins: [],
} satisfies Config;
