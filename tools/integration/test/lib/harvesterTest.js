// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { strictEqual, ok, deepStrictEqual } = require('assert')
const Poller = require('../../lib/poller')
const Harvester = require('../../lib/harvester')
const sinon = require('sinon')

const apiBaseUrl = 'http://localhost:4000'
const defaultToolChecks = [
  ['licensee', '9.14.0'],
  ['scancode', '30.3.0'],
  ['reuse', '3.2.1']
]
describe('Tests for Harvester', function () {
  const coordinates = 'nuget/nuget/-/NuGet.Protocol/6.7.1'

  let harvester
  let fetchStub

  describe('Verify api calls in harvest', function () {
    beforeEach(function () {
      fetchStub = sinon.stub()
      harvester = new Harvester(apiBaseUrl, defaultToolChecks, fetchStub)
    })

    it('should call correct api with the correct payload in harvest', async function () {
      await harvester.harvest([coordinates], false)
      const expectedPayload = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ tool: 'component', coordinates }])
      }
      ok(fetchStub.calledOnce)
      strictEqual(fetchStub.getCall(0).args[0], `${apiBaseUrl}/harvest`, 'Incorrect URL')
      deepStrictEqual(fetchStub.getCall(0).args[1], expectedPayload, 'Incorrect payload')
    })
  })

  describe('pollForCompletion', function () {
    const coordinates = 'nuget/nuget/-/NuGet.Protocol/6.7.1'
    const interval = 10 * 1
    const maxTime = 10 * 2
    let poller

    beforeEach(function () {
      poller = new Poller(interval, maxTime)
      harvester = new Harvester(apiBaseUrl, defaultToolChecks, () => fetchStub())
    })

    it('should poll for completion if results exist', async function () {
      fetchStub = () => Promise.resolve(new Response(createBody()))
      const status = await harvester.pollForCompletion([coordinates], poller)
      strictEqual(status.get(coordinates), true)
    })

    it('should poll for completion if results are stale', async function () {
      const date = '2023-01-01T00:00:00.000Z'
      fetchStub = () => Promise.resolve(new Response(createBody(date)))
      const status = await harvester.pollForCompletion([coordinates], poller, Date.now())
      strictEqual(status.get(coordinates), false)
    })

    it('should handle an error', async function () {
      fetchStub = () => Promise.rejects(new Error('failed'))
      const status = await harvester.pollForCompletion([coordinates], poller, Date.now())
      strictEqual(status.get(coordinates), false)
    })
  })
})

const createBody = date => JSON.stringify({ _metadata: { fetchedAt: date || new Date().toISOString() } })
