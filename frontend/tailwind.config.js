/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tron: {
          primary: "#0066FF",
          electric: "#008CFF",
          cyan: "#00DFFF",
          lightCyan: "#B9F3FF",
          navy: "#071638",
          dark: "#0a192f",
          card: "rgba(255, 255, 255, 0.8)",
          glass: "rgba(255, 255, 255, 0.75)",
          border: "rgba(0, 140, 255, 0.18)",
          borderLight: "rgba(226, 238, 248, 0.9)",
          borderGlow: "rgba(0, 223, 255, 0.45)",
          bgWhite: "#F8FCFF",
          muted: "#64748B",
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Noto Sans JP"', '"Noto Sans Bengali"', '"Noto Sans Devanagari"', '"Noto Sans Myanmar"', 'sans-serif'],
        display: ['"Outfit"', '"Noto Sans JP"', '"Noto Sans Bengali"', '"Noto Sans Devanagari"', '"Noto Sans Myanmar"', 'sans-serif'],
        heading: ['"Outfit"', '"Noto Sans JP"', '"Noto Sans Bengali"', '"Noto Sans Devanagari"', '"Noto Sans Myanmar"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'tron-gradient': 'linear-gradient(135deg, #008CFF 0%, #0066FF 100%)',
        'cyan-gradient': 'linear-gradient(135deg, #00DFFF 0%, #008CFF 100%)',
        'glass-gradient': 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
      },
      boxShadow: {
        'tron-glow': '0 0 25px -4px rgba(0, 140, 255, 0.45)',
        'cyan-glow': '0 0 25px -4px rgba(0, 223, 255, 0.45)',
        'blue-btn': '0 8px 24px -4px rgba(0, 102, 255, 0.35)',
        'glass-card': '0 12px 40px -10px rgba(0, 102, 255, 0.08), 0 1px 3px rgba(0, 140, 255, 0.05)',
        'glass-pop': '0 20px 50px -10px rgba(0, 102, 255, 0.14), 0 0 20px rgba(0, 223, 255, 0.1)',
      },
      animation: {
        'hud-spin': 'hudSpin 30s linear infinite',
        'hud-spin-reverse': 'hudSpinRev 25s linear infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite alternate',
        'float-slow': 'floatSlow 5s ease-in-out infinite',
      },
      keyframes: {
        hudSpin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        hudSpinRev: {
          '0%': { transform: 'rotate(360deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
        pulseGlow: {
          '0%': { filter: 'drop-shadow(0 0 8px rgba(0, 223, 255, 0.4))' },
          '100%': { filter: 'drop-shadow(0 0 22px rgba(0, 140, 255, 0.8))' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};
