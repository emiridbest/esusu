module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'inter': ['var(--font-inter)', 'sans-serif'],
        'poppins': ['var(--font-poppins)', 'sans-serif'],
        'roboto': ['var(--font-roboto)', 'sans-serif'],
        'dancing': ['var(--font-dancing)', 'cursive'],
        'caveat': ['var(--font-caveat)', 'cursive'],
        'kalam': ['var(--font-kalam)', 'cursive'],
      },
      colors: {
        // Light theme
        primary: {
          DEFAULT: "#FFD100",
          foreground: "#030303", 
        },
        background: {
          DEFAULT: "rgba(255, 255, 255, 0.9)",
          foreground: "#030303",
        },
        card: {
          DEFAULT: "rgba(255, 255, 255, 0.7)", 
          foreground: "#030303",
        },
        // Dark theme 
        "dark-primary": {
          DEFAULT: "#f9fafa",
          foreground: "#030303",
        },
        "dark-background": {
          DEFAULT: "rgba(15, 15, 15, 0.9)",
          foreground: "#ffffff",
        },
        "dark-card": {
          DEFAULT: "rgba(30, 30, 30, 0.7)", 
          foreground: "#ffffff",
        },
        // Glassmorphism properties
        glass: {
          DEFAULT: "rgba(255, 255, 255, 0.2)",
          dark: "rgba(0, 0, 0, 0.2)",
        },
      },
      backdropFilter: {
        'none': 'none',
        'blur': 'blur(20px)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
};