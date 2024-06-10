// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { callFetch, buildPostOpts } = require('./fetch')
const HarvestResultMonitor = require('./harvestResultMonitor')

class Harvester {
  constructor(apiBaseUrl, harvestToolChecks, fetch = callFetch) {
    this.apiBaseUrl = apiBaseUrl
    this.harvestToolChecks = harvestToolChecks
    this._fetch = fetch
  }

  async harvest(components, reharvest = false) {
    return await this._fetch(`${this.apiBaseUrl}/harvest`, buildPostOpts(this._buildPostJson(components, reharvest)))
  }

  _buildPostJson(components, reharvest) {
    const tool = this.harvestToolChecks?.length === 1 ? this.harvestToolChecks[0][0] : 'component'
    return components.map(coordinates => {
      const result = { tool, coordinates }
      if (reharvest) result.policy = 'always'
      return result
    })
  }

  async pollForCompletion(components, poller, startTime) {
    if (!this.harvestToolChecks) throw new Error('Harvest tool checks not set')
    const status = new Map()
    for (const coordinates of components) {
      const completed = await this._pollForOneCompletion(coordinates, poller, startTime)
      status.set(coordinates, completed)
    }

    for (const coordinates of components) {
      const completed = status.get(coordinates) || (await this._isHarvestComplete(coordinates, startTime))
      status.set(coordinates, completed)
    }
    return status
  }

  async _pollForOneCompletion(coordinates, poller, startTime) {
    return new HarvestResultMonitor(this.apiBaseUrl, coordinates, this._fetch).pollForHarvestComplete(
      poller,
      this.harvestToolChecks,
      startTime
    )
  }

  async _isHarvestComplete(coordinates, startTime) {
    return new HarvestResultMonitor(this.apiBaseUrl, coordinates, this._fetch)
      .isHarvestComplete(this.harvestToolChecks, startTime)
      .catch(error => {
        console.log(`Error polling for ${coordinates} completion: ${error}`)
        return false
      })
  }

  async detectSchemaVersions(component, poller, tools) {
    const startTime = Date.now()
    //make sure that we have one entire set of harvest results (old or new)
    await this.harvest([component])
    //trigger a reharvest to overwrite the old result, so we can verify the timestamp is new for completion
    await this.harvest([component], true)

    const detectedVersions = await new HarvestResultMonitor(this.apiBaseUrl, component).pollForToolVersionsComplete(
      poller,
      startTime,
      tools
    )
    console.log(`Detected schema versions: ${detectedVersions}`)
    this.harvestToolChecks = detectedVersions
  }
}

module.exports = Harvester
