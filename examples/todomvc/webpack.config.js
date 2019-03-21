const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
// const tsConfig = require('./tsconfig.json');


module.exports = function() {
  return {
    module: {
      rules: [{
        test: /\.tsx?$/,
        loader: 'ts-loader',
//        options: { compilerOptions: tsConfig.compilerOptions, },
      }, {
        test: /\.css$/,
        loaders: ['style-loader', 'css-loader'],
      }]
    },
    resolve: {
      extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    },
    devtool: 'off',
    mode: 'development',
  };
};
