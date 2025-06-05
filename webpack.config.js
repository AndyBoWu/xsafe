const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const isDevelopment = !isProduction;

  return {
    // Multiple entry points for different parts of the extension
    entry: {
      background: './src/background/background.js',
      content: './src/content/content.js',
      popup: './src/popup/popup.js',
      options: './src/options/options.js'
    },

    // Output configuration
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true, // Clean dist folder before each build
    },

    // Resolve modules
    resolve: {
      extensions: ['.js', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@background': path.resolve(__dirname, 'src/background'),
        '@content': path.resolve(__dirname, 'src/content'),
        '@popup': path.resolve(__dirname, 'src/popup'),
        '@options': path.resolve(__dirname, 'src/options'),
        '@utils': path.resolve(__dirname, 'src/utils')
      }
    },

    // Module rules for different file types
    module: {
      rules: [
        // JavaScript files
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: {
                    chrome: '88' // Chrome extension compatibility
                  },
                  modules: false
                }]
              ]
            }
          }
        },

        // CSS files
        {
          test: /\.css$/,
          use: [
            isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                sourceMap: isDevelopment,
                importLoaders: 1
              }
            }
          ]
        },

        // Images and assets
        {
          test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
          type: 'asset/resource',
          generator: {
            filename: 'images/[name][ext]'
          }
        },

        // Fonts
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name][ext]'
          }
        }
      ]
    },

    // Plugins
    plugins: [
      // Copy static assets
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'manifest.json',
            to: 'manifest.json'
          },
          {
            from: 'icons',
            to: 'icons',
            noErrorOnMissing: true
          },
          {
            from: 'src/content/placeholder.css',
            to: 'placeholder.css',
            noErrorOnMissing: true
          }
        ]
      }),

      // Extract CSS into separate files
      new MiniCssExtractPlugin({
        filename: '[name].css',
        chunkFilename: '[id].css'
      }),

      // Generate HTML files for popup and options
      new HtmlWebpackPlugin({
        template: './src/popup/popup.html',
        filename: 'popup.html',
        chunks: ['popup'],
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true
        } : false
      }),

      new HtmlWebpackPlugin({
        template: './src/options/options.html',
        filename: 'options.html',
        chunks: ['options'],
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true
        } : false
      }),

      // Bundle analyzer (only when ANALYZE=true)
      ...(process.env.ANALYZE ? [new BundleAnalyzerPlugin()] : [])
    ],

    // Optimization
    optimization: {
      minimize: isProduction,
      minimizer: [
        // JavaScript minification
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction, // Remove console.log in production
            },
            format: {
              comments: false, // Remove comments
            },
          },
          extractComments: false,
        }),

        // CSS minification
        new CssMinimizerPlugin()
      ],

      // Split chunks for better caching
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: -10,
            reuseExistingChunk: true,
          }
        }
      }
    },

    // Development server configuration
    devtool: isDevelopment ? 'cheap-module-source-map' : false,

    // Performance hints
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000, // 500kb
      maxAssetSize: 512000
    },

    // Stats configuration
    stats: {
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false
    },

    // Target for Chrome extension
    target: 'web',

    // Development mode specific settings
    ...(isDevelopment && {
      cache: {
        type: 'filesystem',
      },
      watchOptions: {
        ignored: /node_modules/,
        aggregateTimeout: 300,
        poll: 1000
      }
    })
  };
};
