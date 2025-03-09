/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        "fade-in": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 }
        },
        "slide-in-from-top": {
          "0%": { transform: "translateY(-10px)" },
          "100%": { transform: "translateY(0)" }
        }
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-in-out",
        "slide-in-from-top": "slide-in-from-top 0.2s ease-out"
      }
    },
  },
  plugins: [],
};
