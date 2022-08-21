const CopyWebpackPlugin = require('copy-webpack-plugin')
const path = require('path')

const packageRoot = __dirname
const assetsSrc = path.join(packageRoot, './src/assets')
const outMainMenubarAssets = path.join(packageRoot, './.webpack/main/menubar/assets')

module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/index.ts',
  // Put your normal webpack config below here
  module: {
    rules: require('./webpack.rules'),
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: assetsSrc, to: outMainMenubarAssets },
      ]
    })
  ]
};
