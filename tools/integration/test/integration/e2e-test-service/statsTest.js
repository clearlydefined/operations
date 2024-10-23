// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { callFetch } = require('../../../lib/fetch')
const { getDevApiBaseUrl, definition } = require('../testConfig')
const { ok } = require('assert')

describe('Test for StatsService', function () {
  this.timeout(definition.timeout * 10)

  //Rest a bit to avoid overloading the servers
  afterEach(() => new Promise(resolve => setTimeout(resolve, definition.timeout)))

  it('should retrieve the list of supported stats', async function () {
    const url = `${getDevApiBaseUrl()}/stats`
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
    const url = `${getDevApiBaseUrl()}/stats/total`
    const result = await callFetch(url).then(r => r.json())
    ok(result.value.totalCount > 0)
    ok(result.value.declaredLicenseBreakdown)
  })

  it('should retrieve stats for composer', async function () {
    const url = `${getDevApiBaseUrl()}/stats/composer`
    const result = await callFetch(url).then(r => r.json())
    ok(result.value.totalCount > 0)
    ok(result.value.declaredLicenseBreakdown)
  })
})
