// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { components, devApiBaseUrl, harvest } = require('./testConfig')
const Poller = require('../lib/poller')
const Harvester = require('../lib/harvester')
const { strictEqual } = require('assert')

describe('Tests for harvesting different components', function () {
  it('should verify all harvests are complete', async function () {
    this.timeout(harvest.timeout)
    console.time('Harvest Test')
    const status = await harvestTillCompletion(components)
    for (const [coordinates, isHarvested] of status) {
      strictEqual(isHarvested, true, `Harvest for ${coordinates} is not complete`)
    }
    console.timeEnd('Harvest Test')
  })
})

async function harvestTillCompletion(components) {
  const { harvestToolVersions, poll } = harvest
  const harvester = new Harvester(devApiBaseUrl, harvestToolVersions)

  //make sure that we have one entire set of harvest results (old or new)
  console.log('Ensure harvest results exist before starting tests')
  const previousHarvests = await harvester.pollForCompletion(components, new Poller(1, 1))
  const previousHarvestsComplete = Array.from(previousHarvests.values()).every(v => v)
  const poller = new Poller(poll.interval, poll.maxTime)
  if (!previousHarvestsComplete) {
    await harvester.harvest(components)
    await harvester.pollForCompletion(components, poller)
  }

  //trigger a reharvest to overwrite the old result
  console.log('Trigger reharvest to overwrite old results')
  await harvester.harvest(components, true)
  return harvester.pollForCompletion(components, poller, Date.now())
}
