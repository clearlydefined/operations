// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { callFetch, buildPostOpts } = require('./fetch')

//The versions correspond to the schema versions of the tools which are used in /harvest/{type}/{provider}/{namespace}/{name}/{revision}/{tool}/{toolVersion}
//See https://api.clearlydefined.io/api-docs/#/harvest/get_harvest__type___provider___namespace___name___revision___tool___toolVersion_
const defaultToolChecks = [
  ['licensee', '9.14.0'],
  ['scancode', '32.3.0'],
  ['reuse', '3.2.1']
]

class Harvester {
  constructor(apiBaseUrl, harvestToolChecks, fetch = callFetch) {
    this.apiBaseUrl = apiBaseUrl
    this.harvestToolChecks = harvestToolChecks || defaultToolChecks
    this._fetch = fetch
  }

  async harvest(components, reharvest = false) {
    return await this._fetch(`${this.apiBaseUrl}/harvest`, buildPostOpts(this._buildPostJson(components, reharvest)))
  }

  _buildPostJson(components, reharvest) {
    const tool = this.harvestToolChecks.length === 1 ? this.harvestToolChecks[0][0] : 'component'
    return components.map(coordinates => {
      const result = { tool, coordinates }
      if (reharvest) result.policy = 'always'
      return result
    })
  }

  async pollForCompletion(components, poller, startTime) {
    const status = new Map()
    for (const coordinates of components) {
      const completed = await this._pollForOneCompletion(coordinates, poller, startTime)
      status.set(coordinates, completed)
    }

    for (const coordinates of components) {
      const completed =
        status.get(coordinates) || (await this.isHarvestComplete(coordinates, startTime).catch(() => false))
      status.set(coordinates, completed)
    }
    return status
  }

  async _pollForOneCompletion(coordinates, poller, startTime) {
    try {
      const completed = await poller.poll(async () => this.isHarvestComplete(coordinates, startTime))
      console.log(`Completed ${coordinates}: ${completed}`)
      return completed
    } catch (error) {
      if (error.code === 'ECONNREFUSED') throw error
      console.log(`Error polling for ${coordinates}: ${error}`)
      return false
    }
  }

  async isHarvestComplete(coordinates, startTime) {
    const harvestChecks = this.harvestToolChecks.map(([tool, toolVersion]) =>
      this.isHarvestedbyTool(coordinates, tool, toolVersion, startTime)
    )

    return Promise.all(harvestChecks).then(results => results.every(r => r))
  }

  async isHarvestedbyTool(coordinates, tool, toolVersion, startTime = 0) {
    const harvested = await this.fetchHarvestResult(coordinates, tool, toolVersion)
    if (!harvested._metadata) return false
    const fetchedAt = new Date(harvested._metadata.fetchedAt)
    console.log(`${coordinates} ${tool}, ${toolVersion} fetched at ${fetchedAt}`)
    return fetchedAt.getTime() > startTime
  }

  async fetchHarvestResult(coordinates, tool, toolVersion) {
    return this._fetch(`${this.apiBaseUrl}/harvest/${coordinates}/${tool}/${toolVersion}?form=raw`).then(r =>
      r.headers.get('Content-Length') === '0' ? Promise.resolve({}) : r.json()
    )
  }
}

module.exports = Harvester
