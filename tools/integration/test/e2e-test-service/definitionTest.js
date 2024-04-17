// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { omit, isEqual } = require('lodash')
const { deepStrictEqual, strictEqual } = require('assert')
const { callFetch, buildPostOpts } = require('../../lib/fetch')
const { devApiBaseUrl, prodApiBaseUrl, expectedResponses, components, definition } = require('../testConfig')
const nock = require('nock')

describe('Validation definitions between dev and prod', function () {
  this.timeout(definition.timeout)

  before(() => {
    expectedResponses.forEach(({ url, response }) =>
      nock(prodApiBaseUrl, { allowUnmocked: true }).get(url).reply(200, response)
    )
  })

  //Rest a bit to avoid overloading the servers
  afterEach(() => new Promise(resolve => setTimeout(resolve, definition.timeout / 2)))

  describe('Validation between dev and prod', function () {
    components.forEach(coordinates => {
      it(`should return the same definition as prod for ${coordinates}`, () => fetchAndCompareDefinition(coordinates))
    })
  })

  describe('Validate on dev', function () {
    const coordinates = components[0]

    describe('Search definitions', function () {
      it(`should find definition for ${coordinates}`, async function () {
        const [foundDef, expectedDef] = await Promise.all([
          findDefinition(coordinates),
          getDefinition(devApiBaseUrl, coordinates)
        ])
        deepStrictEqual(foundDef, omit(expectedDef, ['files']))
      })
    })

    describe('Post to /definitions', function () {
      it(`should get definition via post to /definitions for ${coordinates}`, async function () {
        const postDefinitions = callFetch(`${devApiBaseUrl}/definitions`, buildPostOpts([coordinates])).then(r =>
          r.json()
        )
        const [actualDef, expectedDef] = await Promise.all([
          postDefinitions.then(r => r[coordinates]),
          getDefinition(devApiBaseUrl, coordinates)
        ])
        deepStrictEqual(actualDef, expectedDef)
      })
    })
  })
})

async function fetchAndCompareDefinition(coordinates) {
  const [recomputedDef, expectedDef] = await Promise.all([
    getDefinition(devApiBaseUrl, coordinates, true),
    getDefinition(prodApiBaseUrl, coordinates)
  ])
  compareDefinition(recomputedDef, expectedDef)
}

async function getDefinition(apiBaseUrl, coordinates, reCompute = false) {
  reCompute = apiBaseUrl === devApiBaseUrl && reCompute
  let url = `${apiBaseUrl}/definitions/${coordinates}`
  if (reCompute) url += '?force=true'
  return await callFetch(url).then(r => r.json())
}

function compareDefinition(recomputedDef, expectedDef) {
  deepStrictEqual(recomputedDef.coordinates, expectedDef.coordinates)
  compareLicensed(recomputedDef, expectedDef)
  compareDescribed(recomputedDef, expectedDef)
  compareFiles(recomputedDef, expectedDef)
  deepStrictEqual(recomputedDef.score, expectedDef.score)
}

function compareLicensed(result, expectation) {
  const actual = omit(result.licensed, ['facets'])
  const expected = omit(expectation.licensed, ['facets'])
  deepStrictEqual(actual, expected)
}

function compareDescribed(result, expectation) {
  const actual = omit(result.described, ['tools'])
  const expected = omit(expectation.described, ['tools'])
  deepStrictEqual(actual, expected)
}

function compareFiles(result, expectation) {
  const resultFiles = filesToMap(result)
  const expectedFiles = filesToMap(expectation)
  const extraInResult = result.files.filter(f => !expectedFiles.has(f.path))
  const missingInResult = expectation.files.filter(f => !resultFiles.has(f.path))
  const differentEntries = result.files.filter(f => expectedFiles.has(f.path) && !isEqual(expectedFiles.get(f.path), f))

  const differences = [...extraInResult, ...missingInResult, ...differentEntries]
  differences.forEach(f => logDifferences(expectedFiles.get(f.path), resultFiles.get(f.path)))

  strictEqual(missingInResult.length, 0, 'Some files are missing in the result')
  strictEqual(extraInResult.length, 0, 'There are extra files in the result')
  strictEqual(differentEntries.length, 0, 'Some files are different between the result and the expectation')
}

function logDifferences(expected, actual) {
  console.log('-------------------')
  console.log(`expected: ${JSON.stringify(expected || {})}`)
  console.log(`actual:   ${JSON.stringify(actual || {})}`)
}

function filesToMap(result) {
  return new Map(result.files.map(f => [f.path, f]))
}

async function findDefinition(coordinates) {
  const [type, provider, namespace, name, revision] = coordinates.split('/')
  const response = await callFetch(
    `${devApiBaseUrl}/definitions?type=${type}&provider=${provider}&namespace=${namespace}&name=${name}&sortDesc=true&sort=revision`
  ).then(r => r.json())
  return response.data.find(d => d.coordinates.revision === revision)
}
