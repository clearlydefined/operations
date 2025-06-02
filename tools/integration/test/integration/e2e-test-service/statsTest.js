// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { createFetcherWithRetry } = require('../../../lib/fetch')
const { devApiBaseUrl, definition, fetchRetry } = require('../testConfig')
const { ok } = require('assert')
const callFetch = createFetcherWithRetry(fetchRetry)

describe('Test for StatsService', function () {
  this.timeout(definition.timeout * 10)

  //Rest a bit to avoid overloading the servers
  afterEach(() => new Promise(resolve => setTimeout(resolve, definition.interval)))

  it('should retrieve the list of supported stats', async function () {
    const url = `${devApiBaseUrl}/stats`
    const result = await callFetch(url).then(r => r.json())
    const expected = [
      'total',
      'conda',
      'condasrc',
      'crate',
      'gem',
      'git',
      'maven',
      'npm',
      'nuget',
      'pod',
      'composer',
      'pypi',
      'deb',
      'debsrc'
    ]
    ok(result.length === expected.length)
    expected.forEach(e => ok(result.includes(e)))
  })

  it('should retrieve stats for total', async function () {
    const url = `${devApiBaseUrl}/stats/total`
    const result = await callFetch(url).then(r => r.json())
    ok(result.value.totalCount > 0)
    ok(result.value.declaredLicenseBreakdown)
  })

  it('should retrieve stats for composer', async function () {
    const url = `${devApiBaseUrl}/stats/composer`
    const result = await callFetch(url).then(r => r.json())
    ok(result.value.totalCount > 0)
    ok(result.value.declaredLicenseBreakdown)
  })
})
