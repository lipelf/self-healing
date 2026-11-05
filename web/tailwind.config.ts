import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1.5rem', screens: { '2xl': '1240px' } },
    extend: {
      colors: {
        marca: {
          DEFAULT: '#FF6B00',
          50: '#FFF4EC', 100: '#FFE6D4', 200: '#FFC8A3',
          300: '#FFA76E', 400: '#FF8A3D', 500: '#FF6B00',
          600: '#E65A00', 700: '#BF4A00', 800: '#993B00', 900: '#7A2F00',
        },
        grafite: {
          DEFAULT: '#16151A',
          50: '#F7F7F8', 100: '#EFEEF1', 200: '#DEDCE3',
          300: '#C2BFCB', 400: '#8E8A9B', 500: '#625E6E',
          600: '#46424F', 700: '#312E38', 800: '#211F27', 900: '#16151A',
        },
        sucesso: '#0E7C5A',
        alerta: '#B45309',
        erro: '#D1293D',
        borda: '#E7E5EA',
        fundo: '#FAF9FB',
      },
      borderRadius: { xl: '14px', '2xl': '20px', '3xl': '28px' },
      fontFamily: {
        sans: ['var(--fonte-corpo)', 'system-ui', 'sans-serif'],
        titulo: ['var(--fonte-titulo)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        suave: '0 1px 2px rgba(22,21,26,.05)',
        media: '0 4px 16px rgba(22,21,26,.07)',
        alta: '0 18px 48px rgba(22,21,26,.12)',
        marca: '0 10px 30px rgba(255,107,0,.28)',
      },
      keyframes: {
        surgir: { from: { opacity: '0', transform: 'translateY(10px)' },
                  to: { opacity: '1', transform: 'none' } },
        pulo: { '0%,100%': { transform: 'scale(1)' },
                '35%': { transform: 'scale(1.3)' } },
        brilho: { from: { backgroundPosition: '-420px 0' },
                  to: { backgroundPosition: '420px 0' } },
      },
      animation: {
        surgir: 'surgir .36s cubic-bezier(.22,.8,.36,1) both',
        pulo: 'pulo .45s cubic-bezier(.22,.8,.36,1)',
        brilho: 'brilho 1.3s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
