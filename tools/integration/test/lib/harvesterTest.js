// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { strictEqual, ok, deepStrictEqual } = require('assert')
const Poller = require('../../lib/poller')
const Harvester = require('../../lib/harvester')
const { devApiBaseUrl, harvestToolVersions } = require('../testConfig')
const sinon = require('sinon')

describe('Tests for Harvester', function () {
  const coordinates = 'nuget/nuget/-/NuGet.Protocol/6.7.1'

  let harvester
  let fetchStub
  beforeEach(function () {
    fetchStub = sinon.stub()
    harvester = new Harvester(devApiBaseUrl, harvestToolVersions, fetchStub)
  })

  describe('Verify api calls in harvest and fetchHarvestResult', function () {
    it('should call correct api with the correct payload in harvest', async function () {
      await harvester.harvest([coordinates], false)
      const expectedPayload = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ tool: 'component', coordinates }])
      }
      ok(fetchStub.calledOnce)
      strictEqual(fetchStub.getCall(0).args[0], `${devApiBaseUrl}/harvest`)
      deepStrictEqual(fetchStub.getCall(0).args[1], expectedPayload)
    })

    it('should call the correct harvest api in fetchHarvestResult', async function () {
      fetchStub.resolves(new Response(JSON.stringify({ test: true })))
      await harvester.fetchHarvestResult(coordinates, 'licensee', '9.14.0')
      ok(fetchStub.calledOnce)
      strictEqual(fetchStub.getCall(0).args[0], `${devApiBaseUrl}/harvest/${coordinates}/licensee/9.14.0?form=raw`)
    })

    it('should handle in fetchHarvestResult when harvest result is not ready', async function () {
      const response = new Response()
      response.headers.set('Content-Length', '0')
      fetchStub.resolves(response)
      const result = await harvester.fetchHarvestResult(coordinates, 'licensee', '9.14.0')
      deepStrictEqual(result, {})
    })
  })

  describe('isHarvested', function () {
    beforeEach(function () {
      harvester = new Harvester(devApiBaseUrl)
    })
    it('should detect when a scan tool result for component is available', async function () {
      sinon.stub(harvester, 'fetchHarvestResult').resolves(metadata())
      const result = await harvester.isHarvestedbyTool(coordinates, 'licensee', '9.14.0')
      strictEqual(result, true)
    })

    it('should detect when component is completely harvested', async function () {
      sinon.stub(harvester, 'fetchHarvestResult').resolves(metadata())
      const result = await harvester.isHarvestComplete(coordinates)
      strictEqual(result, true)
    })

    it('should detect whether component is harvested after a timestamp', async function () {
      const date = '2023-01-01T00:00:00.000Z'
      sinon.stub(harvester, 'fetchHarvestResult').resolves(metadata(date))
      const result = await harvester.isHarvestComplete(coordinates, Date.now())
      strictEqual(result, false)
    })

    it('should handle when harvest result is not ready', async function () {
      sinon.stub(harvester, 'fetchHarvestResult').resolves({})
      const result = await harvester.isHarvestComplete(coordinates)
      strictEqual(result, false)
    })
  })
})

describe('Integration tests for Harvester and Poller', function () {
  const coordinates = 'nuget/nuget/-/NuGet.Protocol/6.7.1'
  const interval = 10 * 1
  const maxTime = 10 * 2
  let poller
  let harvester

  beforeEach(function () {
    harvester = new Harvester(devApiBaseUrl)
    poller = new Poller(interval, maxTime)
  })

  it('should poll until max time is reached', async function () {
    sinon.stub(harvester, 'fetchHarvestResult').resolves({})
    const result = await poller.poll(async () => await harvester.isHarvestComplete(coordinates, Date.now()))
    strictEqual(result, false)
  })

  it('should poll for completion if results exist', async function () {
    sinon.stub(harvester, 'fetchHarvestResult').resolves(metadata())
    const status = await harvester.pollForCompletion([coordinates], poller)
    strictEqual(status.get(coordinates), true)
  })

  it('should poll for completion if results are stale', async function () {
    const date = '2023-01-01T00:00:00.000Z'
    sinon.stub(harvester, 'fetchHarvestResult').resolves(metadata(date))
    const status = await harvester.pollForCompletion([coordinates], poller, Date.now())
    strictEqual(status.get(coordinates), false)
  })

  it('should handle an error', async function () {
    sinon.stub(harvester, 'fetchHarvestResult').rejects(new Error('failed'))
    const status = await harvester.pollForCompletion([coordinates], poller, Date.now())
    strictEqual(status.get(coordinates), false)
  })
})

const metadata = date => ({ _metadata: { fetchedAt: date || new Date().toISOString() } })
