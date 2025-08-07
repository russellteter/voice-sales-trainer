/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Class Brand Colors
        'class-purple': '#4739E7',
        'class-light-purple': '#DAD7FA',
        'class-pale-purple': '#EDECFD',
        'no-2-pencil-yellow': '#FFBA00',
        'midnight-blue': '#0A1849',
        
        // Purple Tints
        'darkest-purple': '#241D74',
        'dark-purple': '#352BAD',
        'dark-middle-purple': '#6C61EC',
        'middle-purple': '#9188F1',
        'light-middle-purple': '#B5B0F5',
        'lightest-purple': '#F4F4FE',
        
        // Gray Tints
        'darkest-gray': '#0E0E1E',
        'dark-gray': '#4B4D52',
        'middle-gray': '#B1B3B7',
        'light-gray': '#E8E8E8',
        'lightest-gray': '#F2F2F2',
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        'light': 300,
        'normal': 400,
        'bold': 700,
        'black': 900,
      },
      backgroundImage: {
        'gradient-class': 'linear-gradient(135deg, #4739E7 0%, #9188F1 100%)',
        'gradient-class-blue': 'linear-gradient(135deg, #4739E7 0%, #0A1849 100%)',
      },
    },
  },
  plugins: [],
}