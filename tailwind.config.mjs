/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: '#f7567c',
        secondary: '#99e1d9',
        accent: '#fffae3',
        dark: '#5d576b',
        light: '#fcfcfc',
        text: '#2d2a35',
        'text-light': '#6b7280'
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px'
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'medium': '0 8px 30px rgba(0, 0, 0, 0.12)',
        'hard': '0 12px 40px rgba(0, 0, 0, 0.15)',
        'primary': '0 4px 14px 0 rgba(247, 86, 124, 0.3)',
        'primary-lg': '0 8px 25px 0 rgba(247, 86, 124, 0.4)',
        'secondary': '0 4px 14px 0 rgba(153, 225, 217, 0.3)'
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-in',
        'bounce-in': 'bounceIn 0.8s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
}