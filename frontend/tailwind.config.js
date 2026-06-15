/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefcfb",
          100: "#d4f5f3",
          200: "#aceae8",
          300: "#76d8d6",
          400: "#3cbdbd",
          500: "#1ba0a3",
          600: "#137f84",
          700: "#13666b",
          800: "#155257",
          900: "#16444a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)",
        soft: "0 4px 24px rgba(16,24,40,0.06)",
      },
    },
  },
  plugins: [],
};
