/* eslint-disable global-require */

module.exports = {
  plugins: {
    tailwindcss: {},
    ...(process.env.NODE_ENV === `production`
      ? {
          '@fullhuman/postcss-purgecss': {
            content: [`./src/**/*.js`, `./src/*.css`],
            defaultExtractor: (content) =>
              content.match(/[\w-/:]+(?<!:)/g) || [],
            whitelist: []
          },
          autoprefixer: {}
        }
      : {})
  }
};
