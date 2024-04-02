// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const js = require('@eslint/js')
const globals = require('globals')
const eslintConfigPrettier = require('eslint-config-prettier')

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha
      },
      parserOptions: {
        sourceType: 'module'
      }
    },
    rules: {
      'no-console': 'off'
    }
  },
  eslintConfigPrettier
]
