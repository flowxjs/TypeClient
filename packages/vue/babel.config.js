const  transformJsx = require('./transform-jsx')

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        modules: false,
        targets: {
          browsers: ['Android >= 4.0', 'ios >= 8'],
        },
      },
    ],
  ],
  plugins: [
    transformJsx,
  ]
}
