import { join } from 'path';
import merge from 'webpack-merge';
import ChunkRenamePlugin from 'chunk-rename-webpack-plugin';
import UglifyJsPlugin from 'uglifyjs-webpack-plugin';

const include = join(__dirname, 'src');
const baseConfig = {
  entry: {
    Addon: './src/addon',
    AddonContainer: './src/addon-container'
  },
  output: {
    path: join(__dirname, 'dist'),
    filename: '[name].js',
    library: '[name]'
  },
  module: {
    loaders: [
      { test: /\.js$/, loader: 'babel-loader', include },
    ]
  }
};

const browserConfig = merge(baseConfig, {
  plugins: [
    new ChunkRenamePlugin({
      Addon: 'addon.js',
      AddonContainer: 'addon-container.js',
    }),
  ]
});

const browserConfigMinified = merge(baseConfig, {
  devtool: 'source-map',
  plugins: [
    new ChunkRenamePlugin({
      Addon: 'addon.min.js',
      AddonContainer: 'addon-container.min.js',
    }),
    new UglifyJsPlugin({
      sourceMap: true
    })
  ]
});

const commonJsConfig = merge(baseConfig, {
  output: {
    libraryTarget: 'commonjs'
  },
  plugins: [
    new ChunkRenamePlugin({
      Addon: 'addon.commonjs.js',
      AddonContainer: 'addon-container.commonjs.js',
    }),
  ]
});

module.exports = [ browserConfig, browserConfigMinified, commonJsConfig ];
