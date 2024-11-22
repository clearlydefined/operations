// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { callFetchWithRetry: callFetch } = require('../../../lib/fetch')
const { devApiBaseUrl, definition } = require('../testConfig')
const { ok } = require('assert')

describe('Test for StatusService', function () {
  this.timeout(definition.timeout * 10)

  //Rest a bit to avoid overloading the servers
  afterEach(() => new Promise(resolve => setTimeout(resolve, definition.timeout)))

  it('should retrieve the list of supported status queries', async function () {
    const url = `${devApiBaseUrl}/status`
    const result = await callFetch(url).then(r => r.json())
    const expected = [
      'requestcount',
      'definitionavailability',
      'processedperday',
      'recentlycrawled',
      'crawlbreakdown',
      'toolsranperday'
    ]
    ok(result.length === expected.length)
    expected.forEach(e => ok(result.includes(e)))
  })

  it('should retrieve toolsranperday status via crawler query', async function () {
    const url = `${devApiBaseUrl}/status/toolsranperday`
    const result = await callFetch(url).then(r => r.json())
    ok(result.length > 0)
    ok(result[0].clearlydefined > 0 || result[0].licensee > 0 || result[0].reuse > 0 || result[0].scancode > 0)
  })

  it('should retrieve requestCount status (including today) via service query', async function () {
    const url = `${devApiBaseUrl}/status/requestCount`
    const result = await callFetch(url).then(r => r.json())
    const sortedDates = Object.keys(result).sort((a, b) => b.localeCompare(a))
    ok(sortedDates.length > 0)
    const mostRecentDate = sortedDates[0]
    const today = new Date().toISOString().split('T')[0]
    ok(mostRecentDate.includes(today))
  })
})
