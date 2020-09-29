const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader')

module.exports = {
  mode: 'development',
  entry: {
    app: resolve('./dev/index.tsx')
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      title: 'Development',
      template: resolve('./dev/index.html')
    })
  ],
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".vue"]
  },
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      { 
        test: /.tsx?$/, 
        // loader: "ts-loader", 
        use: [
          'babel-loader',
          {
            loader: 'ts-loader',
            options: {
              appendTsxSuffixTo: [/\.vue$/],
              transpileOnly: true
            }
          }
        ]
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      }
    ]
  },
  output: {
    filename: '[name].bundle.[hash:10].js',
    path: resolve('dist'),
    publicPath: '/'
  },
  devServer: {
    historyApiFallback: true,
    contentBase: resolve('dist'),
    port: 9000
  }
};

function resolve(uri) {
  return path.resolve(__dirname, uri);
}