// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { omit, isEqual, pick } = require('lodash')
const { deepStrictEqual, strictEqual, ok } = require('assert')
const { createFetcherWithRetry, buildPostOpts } = require('../../../lib/fetch')
const { devApiBaseUrl, prodApiBaseUrl, getComponents, definition, fetchRetry } = require('../testConfig')
const nock = require('nock')
const fs = require('fs')
const callFetch = createFetcherWithRetry(fetchRetry)
const { normalizeLicenseExpression } = require('../../../lib/compareDefinitions')

;(async function () {
  const components = await getComponents()
  describe('Validate definitions', function () {
    this.timeout(definition.timeout)

    //Rest a bit to avoid overloading the servers
    afterEach(() => new Promise(resolve => setTimeout(resolve, definition.interval)))

    describe('Validation between dev and prod', function () {
      before(() => {
        loadFixtures().forEach(([url, definition]) => {
          nock(prodApiBaseUrl, { allowUnmocked: true }).get(url).reply(200, definition)
        })
      })
      console.info(`Testing definitions for ${JSON.stringify(components)}`)
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
          deepStrictEqualExpectedEntries(foundDef, omit(expectedDef, ['files', '_id']))
        })
      })

      describe('Search coordinates via pattern', function () {
        it(`should find coordinates for aws-sdk-java`, async function () {
          const response = await callFetch(`${devApiBaseUrl}/definitions?pattern=aws-sdk-java`).then(r => r.json())
          ok(response.length > 0)
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
          deepStrictEqualExpectedEntries(actualDef, expectedDef)
        })
      })
    })
  })
})()

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
  deepStrictEqual(
    normalizeLicenseExpression(result.licensed.declared),
    normalizeLicenseExpression(expectation.licensed.declared)
  )
  let actual = omit(result.licensed, ['facets', 'declared'])
  let expected = omit(expectation.licensed, ['facets', 'declared'])
  deepStrictEqualExpectedEntries(actual, expected)
}

function compareDescribed(result, expectation) {
  const actual = omit(result.described, ['tools'])
  const expected = omit(expectation.described, ['tools'])
  deepStrictEqualExpectedEntries(actual, expected)
}

function deepStrictEqualExpectedEntries(actual, expected) {
  const pickedActual = pick(actual, Object.keys(expected))
  deepStrictEqual(pickedActual, expected)
}

function isFileEqual(expectedFiles, f) {
  const expected = expectedFiles.get(f.path)
  const isLicenseEqual = isEqual(normalizeLicenseExpression(f.license), normalizeLicenseExpression(expected.license))
  if (!isLicenseEqual) return false
  const normResult = omit(f, ['license'])
  const normExpect = omit(expected, ['license'])
  return isEqual(normResult, normExpect)
}

function compareFiles(result, expectation) {
  const resultFiles = filesToMap(result)
  const expectedFiles = filesToMap(expectation)
  const extraInResult = result.files.filter(f => !expectedFiles.has(f.path))
  const missingInResult = expectation.files.filter(f => !resultFiles.has(f.path))
  const differentEntries = result.files.filter(f => expectedFiles.has(f.path) && !isFileEqual(expectedFiles, f))
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
  let coordinatesString = `type=${type}&provider=${provider}&name=${name}`
  coordinatesString += namespace && namespace !== '-' ? `&namespace=${namespace}` : ''
  const response = await callFetch(
    `${devApiBaseUrl}/definitions?${coordinatesString}&sortDesc=true&sort=revision`
  ).then(r => r.json())
  return response.data.find(d => d.coordinates.revision === revision)
}

function loadFixtures() {
  const location = 'test/integration/fixtures/definitions'
  return fs
    .readdirSync(location)
    .filter(f => f.endsWith('.json'))
    .map(jsonFile => JSON.parse(fs.readFileSync(`${location}/${jsonFile}`)))
    .map(definition => {
      const { coordinates } = definition
      const namespace = coordinates.namespace || '-'
      const coordinatesString = `${coordinates.type}/${coordinates.provider}/${namespace}/${coordinates.name}/${coordinates.revision}`
      return [`/definitions/${coordinatesString}`, definition]
    })
}
