// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { deepStrictEqual, strictEqual, ok } = require('assert')
const { callFetchWithRetry: callFetch, buildPostOpts } = require('../../../lib/fetch')
const { devApiBaseUrl, definition, curation } = require('../testConfig')

describe('Validate curation', function () {
  this.timeout(definition.timeout)

  //Rest a bit to avoid overloading the servers
  afterEach(() => new Promise(resolve => setTimeout(resolve, definition.timeout / 2)))

  const coordinates = 'maven/mavencentral/org.apache.httpcomponents/httpcore/4.4.16'
  const title = curation.title || `test ${coordinates}`

  describe('Propose curation', function () {
    const [type, provider, namespace, name, revision] = coordinates.split('/')
    const curation = {
      described: {
        releaseDate: new Date().toISOString().substring(0, 10) //yyyy-mm-dd
      }
    }
    let prNumber

    before('curate', async function () {
      const curationResponse = await callFetch(
        `${devApiBaseUrl}/curations`,
        buildCurationOpts(title, type, provider, namespace, name, revision, curation)
      ).then(r => r.json())
      prNumber = curationResponse.prNumber
    })

    it('should create the PR via curation', async function () {
      ok(prNumber)
    })

    it(`should get the curation by PR via /curations/${coordinates}/pr`, async function () {
      const fetchedCuration = await callFetch(`${devApiBaseUrl}/curations/${coordinates}/pr/${prNumber}`).then(r =>
        r.json()
      )
      deepStrictEqual(fetchedCuration, curation)
    })

    it(`should reflect the PR in definition preview via definitions/${coordinates}/pr`, async function () {
      const curatedDefinition = await callFetch(`${devApiBaseUrl}/definitions/${coordinates}/pr/${prNumber}`).then(r =>
        r.json()
      )
      strictEqual(curatedDefinition.described.releaseDate, curation.described.releaseDate)
    })

    it(`should get of list of PRs for component via /curations/${type}/${provider}/${namespace}/${name}`, async function () {
      const response = await callFetch(`${devApiBaseUrl}/curations/${type}/${provider}/${namespace}/${name}`).then(r =>
        r.json()
      )
      const proposedPR = response.contributions.filter(c => c.prNumber === prNumber)
      ok(proposedPR)
    })

    it('should get PRs for components via post /curations', async function () {
      const revisionlessCoordinates = `${type}/${provider}/${namespace}/${name}`
      const response = await callFetch(`${devApiBaseUrl}/curations`, buildPostOpts([revisionlessCoordinates])).then(r =>
        r.json()
      )
      const proposedPR = response[revisionlessCoordinates].contributions.filter(c => c.prNumber === prNumber)
      ok(proposedPR)
    })
  })

  describe('Merged curation', function () {
    const curatedCoordinates = 'npm/npmjs/@nestjs/platform-express/6.2.2'
    const expected = {
      licensed: {
        declared: 'Apache-2.0'
      }
    }
    it(`should get merged curation for coordinates via /curations/${curatedCoordinates}`, async function () {
      const response = await callFetch(`${devApiBaseUrl}/curations/${curatedCoordinates}`).then(r => r.json())
      deepStrictEqual(response, expected)
    })

    it(`should reflect merged curation in definition for coordinates ${curatedCoordinates}`, async function () {
      const curatedDefinition = await getDefinition(devApiBaseUrl, curatedCoordinates, true)
      deepStrictEqual(curatedDefinition.licensed.declared, expected.licensed.declared)
    })
  })
})

function buildCurationOpts(title, type, provider, namespace, name, revision, curation) {
  const contributionInfo = {
    type: 'other',
    summary: title
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

async function getDefinition(apiBaseUrl, coordinates, reCompute = false) {
  reCompute = apiBaseUrl === devApiBaseUrl && reCompute
  let url = `${apiBaseUrl}/definitions/${coordinates}`
  if (reCompute) url += '?force=true'
  return await callFetch(url).then(r => r.json())
}
