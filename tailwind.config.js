module.exports = {
  content: ['./index.html', './src/**/*.{svelte,ts,css}'],
  theme: {
    extend: {
      colors: {
        background: '#fafafa',
        accent: {
          DEFAULT: '#a0aec0',
          muted: '#cbd5e0'
        }
      }
    }
  },
  plugins: []
};
