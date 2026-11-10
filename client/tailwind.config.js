/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        ethiopic: ['"Noto Sans Ethiopic"', 'Nyala', 'Abyssinica SIL', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#EAF0FA',  // Light Blue (Secondary background)
          100: '#D6E3F5',
          200: '#ADC7EC',
          300: '#84ABE3',
          400: '#5C8FDA',
          500: '#3569B5', // Royal Blue (Primary brand color)
          600: '#2C5798',
          700: '#23457B',
          800: '#1A345E',
          900: '#122341',
          950: '#0C172B',
        },
        gold: {
          50: '#FFFDE6',
          100: '#FFFAB3',
          200: '#FFF680',
          300: '#FFF24D',
          400: '#FFE500', // Golden Yellow (Secondary accent)
          500: '#E6CF00',
          600: '#B8A500',
          700: '#8A7C00',
          800: '#5C5300',
        },
        warmOrange: {
          DEFAULT: '#FFB347', // Warm Orange (Highlights & notices)
          50: '#FFF6ED',
          100: '#FFEDD5',
          500: '#FFB347',
          600: '#EA9425',
          700: '#C27312',
        },
        charcoal: {
          DEFAULT: '#20242B', // Dark Charcoal (Main text)
          50: '#F5F6F7',
          100: '#E6E8EA',
          500: '#505662',
          700: '#2F343E',
          900: '#20242B',
        },
      },
      lineHeight: {
        ethiopic: '1.65',
      },
    },
  },
  plugins: [],
}
