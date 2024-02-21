// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { expect } = require('chai')
const { callFetch } = require('../../lib/fetch')
const Poller = require('../../lib/poller')
const Harvester = require('../../lib/harvester')
const { devApiBaseUrl } = require('../testConfig')
const sinon = require('sinon')

describe('Integration test against dev deployment', function () {
  it('should get harvest for a component', async function () {
    const coordinates = 'nuget/nuget/-/HotChocolate/13.8.1'
    const result = await callFetch(`${devApiBaseUrl}/harvest/${coordinates}?form=list`).then(r => r.json())
    expect(result.length).to.be.greaterThan(0)
  })

  it('should harvest a component', async function () {
    const coordinates = 'nuget/nuget/-/HotChocolate/13.8.1'
    const harvester = new Harvester(devApiBaseUrl)
    const result = await harvester.harvest([coordinates])
    expect(result.status).to.be.equal(201)
  })
})

describe('Tests for Harvester', function () {
  const coordinates = 'nuget/nuget/-/HotChocolate/13.8.1'
  let harvester
  beforeEach(function () {
    harvester = new Harvester(devApiBaseUrl)
  })

  it('should detect when a scan tool result for component is available', async function () {
    sinon.stub(harvester, 'fetchHarvestResult').resolves(metadata())
    const result = await harvester.isHarvestedbyTool(coordinates, 'licensee', '9.14.0')
    expect(result).to.be.equal(true)
  })

  it('should detect when component is completely harvested', async function () {
    sinon.stub(harvester, 'fetchHarvestResult').resolves(metadata())
    const result = await harvester.isHarvestComplete(coordinates)
    expect(result).to.be.equal(true)
  })

  it('should detect whether component is harvested after a timestamp', async function () {
    const date = '2023-01-01T00:00:00.000Z'
    sinon.stub(harvester, 'fetchHarvestResult').resolves(metadata(date))
    const result = await harvester.isHarvestComplete(coordinates, Date.now())
    expect(result).to.be.equal(false)
  })
})

describe('Integration tests for Harvester and Poller', function () {
  const coordinates = 'nuget/nuget/-/HotChocolate/13.8.1'
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
    expect(result).to.be.equal(false)
  })

  it('should poll for completion if results exist', async function () {
    sinon.stub(harvester, 'fetchHarvestResult').resolves(metadata())
    const status = await harvester.pollForCompletion([coordinates], poller)
    expect(status.get(coordinates)).to.be.equal(true)
  })

  it('should poll for completion if results are stale', async function () {
    const date = '2023-01-01T00:00:00.000Z'
    sinon.stub(harvester, 'fetchHarvestResult').resolves(metadata(date))
    const status = await harvester.pollForCompletion([coordinates], poller, Date.now())
    expect(status.get(coordinates)).to.be.equal(false)
  })

  it('should handle an error', async function () {
    sinon.stub(harvester, 'fetchHarvestResult').rejects(new Error('failed'))
    const status = await harvester.pollForCompletion([coordinates], poller, Date.now())
    expect(status.get(coordinates)).to.be.equal(false)
  })
})

const metadata = date => ({ _metadata: { fetchedAt: date || new Date().toISOString() } })
