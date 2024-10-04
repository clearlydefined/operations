// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { callFetch } = require('../../../lib/fetch')
const { devApiBaseUrl, prodApiBaseUrl, getComponents, definition } = require('../testConfig')
const { strictEqual } = require('assert')

describe('Validation attachments between dev and prod', async function () {
  this.timeout(definition.timeout * 2)

  //Rest a bit to avoid overloading the servers
  afterEach(() => new Promise(resolve => setTimeout(resolve, definition.timeout / 2)))

  const components = await getComponents()
  components.forEach(coordinates => {
    it(`should have the same attachement as prod for ${coordinates}`, () => fetchAndCompareAttachments(coordinates))
  })
})

async function fetchAndCompareAttachments(coordinates) {
  const expectedAttachments = await findAttachments(prodApiBaseUrl, coordinates)
  for (const sha256 of expectedAttachments) {
    await compareAttachment(sha256)
  }
}

async function findAttachments(apiBaseUrl, coordinates) {
  const definition = await getDefinition(apiBaseUrl, coordinates)
  return definition.files.filter(f => f.natures || [].includes('license')).map(f => f.hashes.sha256)
}

async function compareAttachment(sha256) {
  const [devAttachment, prodAttachment] = await Promise.all(
    [callFetch(`${devApiBaseUrl}/attachments/${sha256}`), callFetch(`${prodApiBaseUrl}/attachments/${sha256}`)].map(p =>
      p.then(r => r.text())
    )
  )
  strictEqual(devAttachment, prodAttachment)
}

async function getDefinition(apiBaseUrl, coordinates, reCompute = false) {
  reCompute = apiBaseUrl === devApiBaseUrl && reCompute
  let url = `${apiBaseUrl}/definitions/${coordinates}`
  if (reCompute) url += '?force=true'
  return await callFetch(url).then(r => r.json())
}
