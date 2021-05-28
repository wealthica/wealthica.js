import { join } from 'path';
import merge from 'webpack-merge';
// eslint-disable-next-line import/no-extraneous-dependencies
import TerserPlugin from 'terser-webpack-plugin';
import ESLintPlugin from 'eslint-webpack-plugin';

const include = join(__dirname, 'src');

const browserConfig = {
  entry: {
    Addon: {
      import: './src/addon',
      filename: 'addon.js',
      library: {
        name: '[name]',
        type: 'var',
      },
    },
    AddonContainer: {
      import: './src/addon-container',
      filename: 'addon-container.js',
      library: {
        name: '[name]',
        type: 'var',
      },
    },
  },
  output: {
    path: join(__dirname, 'dist'),
  },
  optimization: {
    minimize: false,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
      }),
    ],
  },
  mode: 'production',
  module: {
    rules: [
      { test: /\.js$/, loader: 'babel-loader', include },
    ],
  },
};

const browserMinifiedConfig = merge(browserConfig, {
  devtool: 'source-map',
  entry: {
    Addon: {
      filename: 'addon.min.js',
    },
    AddonContainer: {
      filename: 'addon-container.min.js',
    },
  },
  optimization: {
    minimize: true,
  },
});

const browserES5Config = merge(browserConfig, {
  entry: {
    Addon: {
      filename: 'addon.es5.js',
    },
    AddonContainer: {
      filename: 'addon-container.es5.js',
    },
  },
  target: ['web', 'es5'],
});

const browserES5MinifiedConfig = merge(browserES5Config, {
  devtool: 'source-map',
  entry: {
    Addon: {
      filename: 'addon.es5.min.js',
    },
    AddonContainer: {
      filename: 'addon-container.es5.min.js',
    },
  },
  optimization: {
    minimize: true,
  },
});

const commonJsConfig = merge(browserConfig, {
  entry: {
    Addon: {
      library: {
        type: 'commonjs',
      },
    },
    AddonContainer: {
      library: {
        type: 'commonjs',
      },
    },
  },
  output: {
    path: join(__dirname, 'lib'),
  },
});

const commonJsES5Config = merge(commonJsConfig, {
  entry: {
    Addon: {
      filename: 'addon.es5.js',
    },
    AddonContainer: {
      filename: 'addon-container.es5.js',
    },
  },
  plugins: [
    // Have eslint here so it only run once instead of once for each build config
    new ESLintPlugin(),
  ],
  target: 'es5',
});

module.exports = [
  browserConfig,
  browserMinifiedConfig,
  browserES5Config,
  browserES5MinifiedConfig,
  commonJsConfig,
  commonJsES5Config,
];
