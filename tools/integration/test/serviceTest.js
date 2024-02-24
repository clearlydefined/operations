// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { omit, isEqual } = require('lodash')
const { expect } = require('chai')
const { callFetch, buildPostOpts } = require('../lib/fetch')
const { devApiBaseUrl, prodApiBaseUrl, components, definition } = require('./testConfig')

describe('Service tests', function () {
  this.timeout(definition.timeout)

  //Rest a bit to avoid overloading the servers
  afterEach(() => new Promise(resolve => setTimeout(resolve, definition.timeout / 2)))

  describe('Validation between dev and prod', function () {
    describe('Validate definitions', function () {
      components.forEach(coordinates => {
        it(`should return the same definition as prod for ${coordinates}`, () => fetchAndCompareDefinition(coordinates))
      })
    })

    describe('Validate attachments', function () {
      this.timeout(definition.timeout * 1.5)
      components.forEach(coordinates => {
        it(`should have the same attachement as prod for ${coordinates}`, () => fetchAndCompareAttachments(coordinates))
      })
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
        expect(foundDef).to.be.deep.equal(omit(expectedDef, ['files']))
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
        expect(actualDef).to.be.deep.equal(expectedDef)
      })
    })

    describe('Validate curation', function () {
      describe('Propose curation', function () {
        const coordinates = components[0]
        const [type, provider, namespace, name, revision] = coordinates.split('/')
        const curation = {
          described: {
            releaseDate: new Date().toISOString().substring(0, 10) //yyyy-mm-dd
          }
        }
        let prNumber

        before(async function () {
          const response = await callFetch(
            `${devApiBaseUrl}/curations`,
            buildCurationOpts(coordinates, type, provider, namespace, name, revision, curation)
          ).then(r => r.json())
          prNumber = response.prNumber
        })

        it('should create the PR via curation', async function () {
          expect(prNumber).to.be.ok
        })

        it('should get the curation by PR', async function () {
          const fetchedCuration = await callFetch(
            `${devApiBaseUrl}/curations/${type}/${provider}/${namespace}/${name}/${revision}/pr/${prNumber}`
          ).then(r => r.json())
          expect(fetchedCuration).to.be.deep.equal(curation)
        })

        it('should reflect the PR in definition preview', async function () {
          const curatedDefinition = await callFetch(
            `${devApiBaseUrl}/definitions/${type}/${provider}/${namespace}/${name}/${revision}/pr/${prNumber}`
          ).then(r => r.json())
          expect(curatedDefinition.described.releaseDate).to.be.equal(curation.described.releaseDate)
        })

        it('should get of list of PRs for component', async function () {
          const response = await callFetch(`${devApiBaseUrl}/curations/${type}/${provider}/${namespace}/${name}`).then(
            r => r.json()
          )
          const proposedPR = response.contributions.filter(c => c.prNumber === prNumber)
          expect(proposedPR).to.be.ok
        })

        it('should get PRs for components via post', async function () {
          const coordinates = `${type}/${provider}/${namespace}/${name}`
          const response = await callFetch(`${devApiBaseUrl}/curations`, buildPostOpts([coordinates])).then(r =>
            r.json()
          )
          const proposedPR = response[coordinates].contributions.filter(c => c.prNumber === prNumber)
          expect(proposedPR).to.be.ok
        })
      })

      describe('Merged curation', function () {
        const curatedCoordinates = 'npm/npmjs/@nestjs/platform-express/6.2.2'
        const expected = {
          licensed: {
            declared: 'Apache-2.0'
          }
        }
        it('should get merged curation for coordinates', async function () {
          const response = await callFetch(`${devApiBaseUrl}/curations/${curatedCoordinates}`).then(r => r.json())
          expect(response).to.be.deep.equal(expected)
        })

        it('should reflect merged curation in definition for coordinates', async function () {
          const curatedDefinition = await getDefinition(devApiBaseUrl, curatedCoordinates, true)
          expect(curatedDefinition.licensed.declared).to.be.deep.equal(expected.licensed.declared)
        })
      })
    })
  })
})

function buildCurationOpts(coordinates, type, provider, namespace, name, revision, curation) {
  const contributionInfo = {
    type: 'other',
    summary: `test ${coordinates}`
  }
  const patch = {
    coordinates: { type, provider, namespace, name },
    revisions: {
      [revision]: curation
    }
  }
  const curationBody = { contributionInfo, patches: [patch] }
  return {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(curationBody)
  }
}

async function findDefinition(coordinates) {
  const [type, provider, namespace, name, revision] = coordinates.split('/')
  const response = await callFetch(
    `${devApiBaseUrl}/definitions?type=${type}&provider=${provider}&namespace=${namespace}&name=${name}&sortDesc=true&sort=revision`
  ).then(r => r.json())
  return response.data.find(d => d.coordinates.revision === revision)
}

async function fetchAndCompareAttachments(coordinates) {
  const expectedAttachments = await findAttachments(coordinates)
  for (const sha256 of expectedAttachments) {
    await compareAttachment(sha256)
  }
}

async function findAttachments(coordinates) {
  const definition = await getDefinition(prodApiBaseUrl, coordinates)
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
