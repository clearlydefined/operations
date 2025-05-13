// (c) Copyright 2025, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT
const { cleanupPR } = require('../../lib/cleanupPR')
const { curation } = require('./testConfig')

cleanupPR(curation)
  .then(() => console.log('Cleanup completed.'))
  .catch(error => console.error(`Error during cleanup: ${error.message}`))
