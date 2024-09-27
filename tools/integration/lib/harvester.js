// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { callFetch, buildPostOpts } = require('./fetch')
const HarvestResultFetcher = require('./harvestResultFetcher')

class Harvester {
  constructor(apiBaseUrl, harvestToolChecks, fetch = callFetch) {
    this.apiBaseUrl = apiBaseUrl
    this._harvestToolChecks = harvestToolChecks
    this._fetch = fetch
  }

  async harvest(components, reharvest = false) {
    if (components.length === 0) return
    return await this._fetch(`${this.apiBaseUrl}/harvest`, buildPostOpts(this._buildPostJson(components, reharvest)))
  }

  _buildPostJson(components, reharvest) {
    const tool = this._harvestToolChecks?.length === 1 ? this._harvestToolChecks[0][0] : 'component'
    return components.map(coordinates => {
      const result = { tool, coordinates }
      if (reharvest) result.policy = 'reharvestAlways'
      return result
    })
  }

  async pollForCompletion(components, poller, startTime) {
    if (!this._harvestToolChecks) throw new Error('Harvest tool checks not set')
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
    return this.resultChecker(coordinates).pollForHarvestComplete(poller, this._harvestToolChecks, startTime)
  }

  async _isHarvestComplete(coordinates, startTime) {
    return this.resultChecker(coordinates)
      .isHarvestComplete(this._harvestToolChecks, startTime)
      .catch(error => {
        console.log(`Error polling for ${coordinates} completion: ${error}`)
        return false
      })
  }

  async detectSchemaVersions(component, poller, tools) {
    if (!component) throw new Error('Component not set')
    console.log('Start to detect schema versions for harvest tools')
    const startTime = Date.now()
    //trigger a reharvest to overwrite the old result, so we can verify the timestamp is new for completion
    await this.harvest([component], true)

    const detectedToolVersions = await this.resultChecker(component).pollForToolVersionsComplete(
      poller,
      startTime,
      tools
    )
    console.log(`Detected schema versions for harvest tools: ${detectedToolVersions}`)
    this._harvestToolChecks = detectedToolVersions
  }

  resultChecker(coordinates) {
    return new HarvestResultFetcher(this.apiBaseUrl, coordinates, this._fetch)
  }
}

module.exports = Harvester
