module.exports = {
  presets: [
    ['next/babel']
  ],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    '@babel/plugin-proposal-private-methods',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-private-property-in-object'
  ]
}