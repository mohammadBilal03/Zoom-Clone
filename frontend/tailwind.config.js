/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        zoom: {
          blue: "#2D8CFF",
          "blue-dark": "#0B5CD7",
          "blue-light": "#EAF3FF",
          navy: "#0E1116",
          panel: "#1C1F26",
          "panel-light": "#2A2E37",
          red: "#E02828",
          green: "#3AB874",
          gray: "#747487",
          border: "#E5E7EB",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
      },
    },
  },
  plugins: [],
};
