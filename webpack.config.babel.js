import { join } from 'path';

const include = join(__dirname, 'src');

export default {
  entry: {
    'Addon': './src/addon',
    'AddonContainer': './src/addon-container'
  },
  output: {
    path: join(__dirname, 'dist'),
    filename: '[name].js',
    library: '[name]'
  },
  devtool: 'source-map',
  module: {
    loaders: [
      { test: /\.js$/, loader: 'babel-loader', include },
    ]
  }
}
