var path = require('path');
var webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const production = process.env.NODE_ENV === 'production' || false;

var PATHS = {
  entryPoint: path.resolve(__dirname, 'src/index.ts'),
  bundles: path.resolve(__dirname, 'dist'),
};

var config = {
  experiments: {
    asyncWebAssembly: true,
    layers: true,
  },
  // These are the entry point of our library. We tell webpack to use
  // the name we assign later, when creating the bundle. We also use
  // the name to filter the second entry point for applying code
  // minification via UglifyJS
  entry: {
    'my-lib': [PATHS.entryPoint],
    'my-lib.min': [PATHS.entryPoint],
  },
  // The output defines how and where we want the bundles. The special
  // value `[name]` in `filename` tell Webpack to use the name we defined above.
  // We target a UMD and name it MyLib. When including the bundle in the browser
  // it will be accessible at `window.MyLib`
  output: {
    path: PATHS.bundles,
    filename: '[name].js',
    libraryTarget: 'umd',
    library: 'MyLib',
    umdNamedDefine: true,
  },
  // Add resolve for `tsx` and `ts` files, otherwise Webpack would
  // only look for common JavaScript file extension (.js)
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    fallback: {
      fs: false,
      tls: false,
      net: false,
      path: false,
      zlib: false,
      http: false,
      https: false,
      stream: false,
      crypto: false,
      util: false,
    },
  },
  // Activate source maps for the bundles in order to preserve the original
  // source when the user debugs the application
  devtool: 'source-map',
  optimization: {
    minimize: production,
    minimizer: [new TerserPlugin({})],
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
};

module.exports = config;
