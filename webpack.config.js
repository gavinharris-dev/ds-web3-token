const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const production = process.env.NODE_ENV === "production" || false;

module.exports = {
  entry: ["./src/index.ts"], //  <- Modify it to your entry name.
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  mode: "production",
  output: {
    filename: production ? "index.min.js" : "index.js",
    path: path.resolve(__dirname, "dist"),
    globalObject: "this",
    library: "ds-web3-token",
    libraryExport: "default",
    libraryTarget: "umd",
  },
  optimization: {
    minimize: production,
    minimizer: [new TerserPlugin({})],
  },
};
