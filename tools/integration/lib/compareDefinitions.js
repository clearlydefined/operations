// (c) Copyright 2024, GitHub and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const SPDX = require('@clearlydefined/spdx')
function compareDocuments(staging, production, ignoredKeys, path = '') {
  let differences = {}
  let overallResults = []

  staging = staging === undefined ? {} : staging
  production = production === undefined ? {} : production

  const keys = new Set([...Object.keys(staging), ...Object.keys(production)])

  for (let key of keys) {
    const currentPath = path ? `${path}.${key}` : key

    if (shouldIgnore(currentPath, ignoredKeys)) {
      continue
    }

    const stagingValue = staging[key]
    const productionValue = production[key]

    const comparison = compareValues(stagingValue, productionValue, ignoredKeys, currentPath)
    overallResults.push(comparison.result)

    if (comparison.result !== 'parity' && comparison.differences) {
      for (let [resultType, diffs] of Object.entries(comparison.differences)) {
        if (!differences[resultType]) {
          differences[resultType] = []
        }
        differences[resultType] = differences[resultType].concat(diffs)
      }
    }
  }

  const overallResult = aggregateOverallResult(overallResults)

  return {
    overallResult,
    differences
  }
}

function compareValues(val1, val2, ignoredKeys, path) {
  val1 = val1 === undefined ? null : val1
  val2 = val2 === undefined ? null : val2

  // Check for null values first
  if (val1 === null && val2 === null) {
    return { result: 'parity' }
  }

  if (val1 === null) {
    if (isEmpty(val2)) {
      return { result: 'parity' }
    } else {
      return handleLargeArrays(null, val2, path, 'regression')
    }
  }

  if (val2 === null) {
    if (isEmpty(val1)) {
      return { result: 'parity' }
    } else {
      return handleLargeArrays(val1, null, path, 'improvement')
    }
  }

  const type1 = getType(val1)
  const type2 = getType(val2)

  if (type1 !== type2) {
    return handleLargeArrays(val1, val2, path, 'inconclusive')
  }

  if (type1 === 'string') {
    if (val1.toLowerCase() === val2.toLowerCase()) {
      return { result: 'parity' }
    } else {
      return handleLargeArrays(val1, val2, path, 'inconclusive')
    }
  }

  if (['number', 'boolean'].includes(type1)) {
    if (val1 === val2) {
      return { result: 'parity' }
    } else {
      return handleLargeArrays(val1, val2, path, 'inconclusive')
    }
  }

  if (type1 === 'array') {
    return compareArrays(val1, val2, path)
  }

  if (type1 === 'object') {
    const objectComparison = compareDocuments(val1, val2, ignoredKeys, path)
    const overallResult = objectComparison.overallResult

    if (Object.keys(objectComparison.differences).length === 0) {
      return { result: 'parity' }
    } else {
      return {
        result: overallResult,
        differences: objectComparison.differences
      }
    }
  }

  return handleLargeArrays(val1, val2, path, 'inconclusive')
}

function handleLargeArrays(val1, val2, path, result) {
  const MAX_ELEMENTS = 10
  let diff = {}

  if (Array.isArray(val1) && Array.isArray(val2)) {
    const set1 = new Set(val1.map(item => (typeof item === 'string' ? item.toLowerCase() : JSON.stringify(item))))
    const set2 = new Set(val2.map(item => (typeof item === 'string' ? item.toLowerCase() : JSON.stringify(item))))

    if (isSuperset(set1, set2)) {
      const addedElements = [...set1].filter(x => !set2.has(x))
      diff.addedElements = addedElements.slice(0, MAX_ELEMENTS)
      result = 'improvement'
    } else if (isSubset(set1, set2)) {
      const missingElements = [...set2].filter(x => !set1.has(x))
      diff.missingElements = missingElements.slice(0, MAX_ELEMENTS)
      result = 'regression'
    } else {
      diff.staging = val1.slice(0, MAX_ELEMENTS)
      diff.production = val2.slice(0, MAX_ELEMENTS)
      result = 'inconclusive'
    }

    if (val1.length > MAX_ELEMENTS || val2.length > MAX_ELEMENTS) {
      diff.truncated = true
    }
  } else {
    diff.staging = Array.isArray(val1) ? val1.slice(0, MAX_ELEMENTS) : val1
    diff.production = Array.isArray(val2) ? val2.slice(0, MAX_ELEMENTS) : val2
    if ((Array.isArray(val1) && val1.length > MAX_ELEMENTS) || (Array.isArray(val2) && val2.length > MAX_ELEMENTS)) {
      diff.truncated = true
    }
  }

  return {
    result: result,
    differences: {
      [result]: [
        {
          field: path,
          diff: diff
        }
      ]
    }
  }
}

function compareArrays(arr1, arr2, path) {
  if (JSON.stringify(arr1).toLowerCase() === JSON.stringify(arr2).toLowerCase()) {
    return { result: 'parity' }
  }

  return handleLargeArrays(arr1, arr2, path, 'inconclusive')
}

function shouldIgnore(path, ignoredKeys) {
  return ignoredKeys.some(prefix => path.startsWith(prefix))
}

function isEmpty(value) {
  if (value === null || value === undefined) return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

function isSuperset(setA, setB) {
  for (let elem of setB) {
    if (!setA.has(elem)) {
      return false
    }
  }
  return true
}

function isSubset(setA, setB) {
  for (let elem of setA) {
    if (!setB.has(elem)) {
      return false
    }
  }
  return true
}

function aggregateOverallResult(results) {
  if (results.includes('regression')) {
    return 'regression'
  }

  if (results.includes('inconclusive')) {
    return 'inconclusive'
  }

  if (results.includes('improvement')) {
    return 'improvement'
  }

  return 'parity'
}

function getType(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function normalizeLicenseExpression(license) {
  return license ? SPDX.expand(license).sort() : license
}

module.exports = { compareDocuments, normalizeLicenseExpression }
