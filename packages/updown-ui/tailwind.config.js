module.exports = {
  future: {
    // removeDeprecatedGapUtilities: true,
    // purgeLayersByDefault: true,
  },

  purge: [
    'src/**/*.js',
    'src/**/*.jsx',
    'src/**/*.ts',
    'src/**/*.tsx',
    'public/**/*.html'
  ],
  theme: {
    fontSize: {
      base: '1.4rem',
      h1: '6.8rem',
      h2: '4.5rem',
      h3: '4.1rem',
      h4: '3rem',
      h5: '2.7rem',
      h6: '2rem',
      'paragraph-1': '2rem',
      'paragraph-2': '1.8rem',
      body: '1.6rem',
      'small-text': '1.4rem',
      captions: '1.2rem'
    },
    fontFamily: {
      poppins: ['Nunito', 'sans-serif']
    },
    extend: {
      borderRadius: {
        primary: '14px',
        16: '16px'
      },
      boxShadow: {
        card: '0px 24px 64px rgba(0, 0, 0, 0.15)'
      },
      colors: {
        primary: '#E9CB99',
        secondary: '#243B7F',
        'theme-dark-gray': '#263238',
        'theme-green': '#0ACF83',
        'theme-red': ' #FF0000',
        'theme-yellow': '#FFCB4C'
      }
    }
  },
  variants: {},
  plugins: []
}
