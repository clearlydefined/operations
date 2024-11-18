// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { getComponents, devApiBaseUrl, harvest } = require('./testConfig')
const Poller = require('../../lib/poller')
const Harvester = require('../../lib/harvester')
const { strictEqual } = require('assert')

describe('Tests for harvesting different components', function () {
  it('should verify all harvests are complete', async function () {
    this.timeout(harvest.timeout)
    console.time('Harvest Test')
    const recentDefinitions = await getComponents()
    console.info(`Recent definitions: ${recentDefinitions}`)
    const status = await harvestTillCompletion(recentDefinitions)
    for (const [coordinates, isHarvested] of status) {
      strictEqual(isHarvested, true, `Harvest for ${coordinates} is not complete`)
    }
    console.timeEnd('Harvest Test')
  })
})

async function harvestTillCompletion(components) {
  if (components.length === 0) return new Map()

  const { poll, tools } = harvest
  const harvester = new Harvester(devApiBaseUrl)

  const oneComponent = components.shift()
  const versionPoller = new Poller(poll.interval / 5, poll.maxTime)
  await harvester.detectSchemaVersions(oneComponent, versionPoller, tools)

  //trigger a reharvest to overwrite the old result
  console.log('Trigger reharvest to overwrite old results')
  await harvester.harvest(components, true)
  const poller = new Poller(poll.interval, poll.maxTime)
  return harvester.pollForCompletion(components, poller, Date.now())
}
