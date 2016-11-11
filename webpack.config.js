var webpack = require("webpack");
var path = require("path");

module.exports = {
  context: __dirname,
  entry: {
    app: ["./index.js"]
  },
  output: {
    path: path.resolve(__dirname, "build"),
    publicPath: "/build/",
    filename: "bundle.js"
  },
  module: {
    loaders: [
      {
        test: /\.jade$/,
        exclude: /node_modules/,
        loader: 'virtual-jade',
      },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel', // 'babel-loader' is also a valid name to reference
        query: {
          presets: ['es2015']
        }
      },
      {
         test: /\.styl$/,
         loader: 'raw!autoprefixer-loader!stylus-loader',
         include: path.resolve(__dirname, 'bookmark-drawer'),
      },
      {
        test: /\.styl$/,
        loader: 'style-loader!css-loader!autoprefixer-loader!stylus-loader',
        exclude: path.resolve(__dirname, 'bookmark-drawer'),
      },

    ]
  },
};

