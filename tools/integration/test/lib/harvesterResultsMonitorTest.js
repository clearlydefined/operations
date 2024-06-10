// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { strictEqual, ok, deepStrictEqual } = require('assert')
const HarvestResultMonitor = require('../../lib/harvestResultMonitor')
const sinon = require('sinon')
const Poller = require('../../lib/poller')

const apiBaseUrl = 'http://localhost:4000'
const defaultToolChecks = [
  ['licensee', '9.14.0'],
  ['scancode', '30.3.0'],
  ['reuse', '3.2.1']
]
describe('Tests for HarvestResultMonitor', function () {
  const coordinates = 'pypi/pypi/-/platformdirs/4.2.0'
  let resultMonitor

  describe('fetchHarvestResult', function () {
    let fetchStub
    beforeEach(function () {
      fetchStub = sinon.stub()
      resultMonitor = new HarvestResultMonitor(apiBaseUrl, coordinates, fetchStub)
    })

    it('should call the correct harvest api in fetchHarvestResult', async function () {
      fetchStub.resolves(new Response(JSON.stringify({ test: true })))
      await resultMonitor.fetchHarvestResult('licensee', '9.14.0')
      ok(fetchStub.calledOnce)
      strictEqual(fetchStub.getCall(0).args[0], `${apiBaseUrl}/harvest/${coordinates}/licensee/9.14.0?form=raw`)
    })

    it('should handle in fetchHarvestResult when harvest result is not ready', async function () {
      const response = new Response()
      response.headers.set('Content-Length', '0')
      fetchStub.resolves(response)
      const result = await resultMonitor.fetchHarvestResult('licensee', '9.14.0')
      deepStrictEqual(result, {})
    })
  })

  describe('isHarvested', function () {
    beforeEach(function () {
      resultMonitor = new HarvestResultMonitor(apiBaseUrl, coordinates)
    })
    it('should detect when a scan tool result for component is available', async function () {
      sinon.stub(resultMonitor, 'fetchHarvestResult').resolves(metadata())
      const result = await resultMonitor.isHarvestedbyTool('licensee', '9.14.0')
      strictEqual(result, true)
    })

    it('should detect when component is completely harvested', async function () {
      sinon.stub(resultMonitor, 'fetchHarvestResult').resolves(metadata())
      const result = await resultMonitor.isHarvestComplete(defaultToolChecks)
      strictEqual(result, true)
    })

    it('should detect whether component is harvested after a timestamp', async function () {
      const date = '2023-01-01T00:00:00.000Z'
      sinon.stub(resultMonitor, 'fetchHarvestResult').resolves(metadata(date))
      const result = await resultMonitor.isHarvestComplete(defaultToolChecks, Date.now())
      strictEqual(result, false)
    })

    it('should handle when harvest result is not ready', async function () {
      sinon.stub(resultMonitor, 'fetchHarvestResult').resolves({})
      const result = await resultMonitor.isHarvestComplete(defaultToolChecks)
      strictEqual(result, false)
    })

    it('should only call harvest if it is not completed', async function () {
      const stub = sinon.stub(resultMonitor, 'fetchHarvestResult').rejects(new Error('failed'))
      const status = new Map([['licensee', { toolVersion: '9.14.0', completed: true }]])
      const result = await resultMonitor.isHarvestComplete([['licensee', '9.14.0']], undefined, status)
      strictEqual(result, true)
      ok(!stub.calledOnce)
    })
  })

  describe('pollForHarvestComplete', function () {
    const interval = 10 * 1
    const maxTime = 10 * 2
    let poller

    beforeEach(function () {
      poller = new Poller(interval, maxTime)
      resultMonitor = new HarvestResultMonitor(apiBaseUrl, coordinates)
    })

    it('should poll for completion if results exist', async function () {
      sinon.stub(resultMonitor, 'fetchHarvestResult').resolves(metadata())
      const status = await resultMonitor.pollForHarvestComplete(poller, defaultToolChecks)
      strictEqual(status, true)
    })

    it('should poll for completion if results are stale', async function () {
      const date = '2023-01-01T00:00:00.000Z'
      sinon.stub(resultMonitor, 'fetchHarvestResult').resolves(metadata(date))
      const status = await resultMonitor.pollForHarvestComplete(poller, defaultToolChecks, Date.now())
      strictEqual(status, false)
    })

    it('should handle an error', async function () {
      sinon.stub(resultMonitor, 'fetchHarvestResult').rejects(new Error('failed'))
      const status = await resultMonitor.pollForHarvestComplete(poller, Date.now())
      strictEqual(status, false)
    })

    it('should only call harvest if it is not yet completed', async function () {
      let callCount = 0
      const stub = sinon.stub(resultMonitor, 'fetchHarvestResult').callsFake(() => (callCount++ > 0 ? metadata() : {}))
      const status = await resultMonitor.pollForHarvestComplete(poller, defaultToolChecks)
      strictEqual(status, true)
      strictEqual(stub.callCount, 4)
    })
  })

  describe('fetchToolVersions', function () {
    let fetchStub
    beforeEach(function () {
      fetchStub = sinon.stub()
      resultMonitor = new HarvestResultMonitor(apiBaseUrl, coordinates, fetchStub)
    })

    it('should call the correct harvest api', async function () {
      fetchStub.resolves(new Response(JSON.stringify([])))
      await resultMonitor.fetchToolVersions()
      ok(fetchStub.calledOnce)
      strictEqual(fetchStub.getCall(0).args[0], `${apiBaseUrl}/harvest/${coordinates}?form=list`)
    })

    it('should process the result correctly', async function () {
      const harvestResults = [
        'pypi/pypi/-/platformdirs/4.2.0/clearlydefined/1.3.1',
        'pypi/pypi/-/platformdirs/4.2.0/licensee/9.14.0',
        'pypi/pypi/-/platformdirs/4.2.0/reuse/3.2.1',
        'pypi/pypi/-/platformdirs/4.2.0/reuse/3.2.2',
        'pypi/pypi/-/platformdirs/4.2.0/scancode/30.3.0'
      ]
      fetchStub.resolves(new Response(JSON.stringify(harvestResults)))
      const toolVersions = await resultMonitor.fetchToolVersions()
      deepStrictEqual(toolVersions, [
        ['licensee', '9.14.0'],
        ['reuse', '3.2.1'],
        ['reuse', '3.2.2'],
        ['scancode', '30.3.0']
      ])
    })
  })

  describe('pollForToolVersionsComplete', function () {
    const interval = 10 * 1
    const maxTime = 10 * 2
    let poller

    beforeEach(function () {
      poller = new Poller(interval, maxTime)
      resultMonitor = new HarvestResultMonitor(apiBaseUrl, coordinates)
    })

    it('should process the result correctly', async function () {
      sinon.stub(resultMonitor, 'fetchToolVersions').resolves([
        ['licensee', '9.14.0'],
        ['reuse', '3.2.1'],
        ['reuse', '3.2.2'],
        ['scancode', '30.3.0']
      ])
      sinon
        .stub(resultMonitor, 'isHarvestedbyTool')
        .withArgs('licensee', '9.14.0')
        .resolves(true)
        .withArgs('reuse', '3.2.1')
        .resolves(true)
        .withArgs('scancode', '30.3.0')
        .resolves(true)
      const toolVersions = await resultMonitor.pollForToolVersionsComplete(poller, Date.now())
      deepStrictEqual(toolVersions, [
        ['licensee', '9.14.0'],
        ['reuse', '3.2.1'],
        ['scancode', '30.3.0']
      ])
    })
  })
})

const metadata = date => ({ _metadata: { fetchedAt: date || new Date().toISOString() } })
