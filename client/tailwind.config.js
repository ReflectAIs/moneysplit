/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        olive: {
          50: '#f7f7e8',
          100: '#ececd0',
          200: '#d9d9a3',
          300: '#c2c26e',
          400: '#a8a83f',
          500: '#808000', // primary olive
          600: '#6b6b00',
          700: '#555500',
          800: '#3f3f00',
          900: '#2a2a00'
        },
        ink: {
          50: '#f6f6f6',
          100: '#e7e7e7',
          200: '#d1d1d1',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6d6d6d',
          600: '#5d5d5d',
          700: '#4f4f4f',
          800: '#454545',
          900: '#0a0a0a' // primary black
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
