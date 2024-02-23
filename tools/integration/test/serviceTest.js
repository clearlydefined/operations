// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { omit, isEqual } = require('lodash')
const { expect } = require('chai')
const { callFetch } = require('../lib/fetch')
const { devApiBaseUrl, prodApiBaseUrl, components, definition } = require('./testConfig')

describe('Validation between dev and prod', function () {
  this.timeout(definition.timeout)

  //Rest a bit to avoid overloading the servers
  afterEach(() => new Promise(resolve => setTimeout(resolve, definition.timeout / 2)))

  describe('Validate definitions', function () {
    components.forEach(coordinates => {
      it(`should return the same definition as prod for ${coordinates}`, () => fetchAndCompareDefinition(coordinates))
    })
  })

  describe('Validate attachments', function () {
    components.forEach(coordinates => {
      it(`should have the same attachement as prod for ${coordinates}`, () => fetchAndCompareAttachments(coordinates))
    })
  })
})

async function fetchAndCompareAttachments(coordinates) {
  const expectedAttachments = await findAttachments(coordinates)
  for (const sha256 of expectedAttachments) {
    await compareAttachment(sha256)
  }
}

async function findAttachments(coordinates) {
  const apiBaseUrl = prodApiBaseUrl
  const definition = await callFetch(`${apiBaseUrl}/definitions/${coordinates}`).then(r => r.json())
  return definition.files.filter(f => f.natures || [].includes('license')).map(f => f.hashes.sha256)
}

async function compareAttachment(sha256) {
  const [devAttachment, prodAttachment] = await Promise.all(
    [callFetch(`${devApiBaseUrl}/attachments/${sha256}`), callFetch(`${prodApiBaseUrl}/attachments/${sha256}`)].map(p =>
      p.then(r => r.text())
    )
  )
  expect(devAttachment).to.be.equal(prodAttachment)
}

async function fetchAndCompareDefinition(coordinates) {
  const [recomputedDef, expectedDef] = await Promise.all(
    [
      callFetch(`${devApiBaseUrl}/definitions/${coordinates}?force=true`),
      callFetch(`${prodApiBaseUrl}/definitions/${coordinates}`)
    ].map(p => p.then(r => r.json()))
  )
  compareDefinition(recomputedDef, expectedDef)
}

function compareDefinition(recomputedDef, expectedDef) {
  expect(recomputedDef.coordinates).to.be.deep.equals(expectedDef.coordinates)
  compareLicensed(recomputedDef, expectedDef)
  compareDescribed(recomputedDef, expectedDef)
  compareFiles(recomputedDef, expectedDef)
  expect(recomputedDef.score).to.be.deep.equal(expectedDef.score)
}

function compareLicensed(result, expectation) {
  const actual = omit(result.licensed, ['facets'])
  const expected = omit(expectation.licensed, ['facets'])
  expect(actual).to.be.deep.equals(expected)
}

function compareDescribed(result, expectation) {
  const actual = omit(result.described, ['tools'])
  const expected = omit(expectation.described, ['tools'])
  expect(actual).to.be.deep.equals(expected)
}

function compareFiles(result, expectation) {
  const resultFiles = filesToMap(result)
  const expectedFiles = filesToMap(expectation)
  const extraInResult = result.files.filter(f => !expectedFiles.has(f.path))
  const missingInResult = expectation.files.filter(f => !resultFiles.has(f.path))
  const differentEntries = result.files.filter(f => expectedFiles.has(f.path) && !isEqual(expectedFiles.get(f.path), f))

  const differences = [...extraInResult, ...missingInResult, ...differentEntries]
  differences.forEach(f => logDifferences(expectedFiles.get(f.path), resultFiles.get(f.path)))

  expect(missingInResult.length).to.be.equal(0, 'Some files are missing in the result')
  expect(extraInResult.length).to.be.equal(0, 'There are extra files in the result')
  expect(differentEntries.length).to.be.equal(0, 'Some files are different between the result and the expectation')
}

function logDifferences(expected, actual) {
  console.log('-------------------')
  console.log(`expected: ${JSON.stringify(expected || {})}`)
  console.log(`actual:   ${JSON.stringify(actual || {})}`)
}

function filesToMap(result) {
  return new Map(result.files.map(f => [f.path, f]))
}
