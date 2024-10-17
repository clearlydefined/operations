// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT
const { callFetch } = require('./fetch')

const defaultTools = ['licensee', 'reuse', 'scancode']

class HarvestResultFetcher {
  constructor(apiBaseUrl, coordinates, fetch = callFetch) {
    this.apiBaseUrl = apiBaseUrl
    this._fetch = fetch
    this._coordinates = coordinates
  }

  async fetchToolVersions(tools = defaultTools) {
    const listHarvestResultApi = `${this.apiBaseUrl}/harvest/${this._coordinates}?form=list`
    const harvestResultUrls = await this._fetch(listHarvestResultApi).then(r => r.json())
    return tools.flatMap(tool => {
      const found = harvestResultUrls
        .filter(url => url.includes(`/${tool}/`))
        .map(url => url.match(/[^/]+$/)[0])
        .map(version => [tool, version])
      return found.length ? found : [[tool, '']]
    })
  }

  async _pollForCompletion(poller) {
    try {
      const completed = await poller.poll()
      console.log(`Completed ${this._coordinates}: ${completed}`)
      return completed
    } catch (error) {
      if (error.code === 'ECONNREFUSED') throw error
      console.log(`Error polling for ${this._coordinates}: ${error}`)
      return false
    }
  }

  async pollForToolVersionsComplete(poller, startTime, tools) {
    const statuses = new Map()
    poller.with(async () => {
      const toolVersions = await this.fetchToolVersions(tools)
      return this.isHarvestComplete(toolVersions, startTime, statuses)
    })
    const completed = await this._pollForCompletion(poller)
    if (!completed) throw new Error(`Schema versions not detected`)
    return [...statuses.entries()].map(([k, v]) => [k, v.toolVersion])
  }

  async pollForHarvestComplete(poller, toolVersions, startTime) {
    const statuses = new Map()
    poller.with(async () => this.isHarvestComplete(toolVersions, startTime, statuses))
    return this._pollForCompletion(poller)
  }

  async isHarvestComplete(toolVersions, startTime, statuses = new Map()) {
    const harvestChecks = (toolVersions || []).map(async ([tool, toolVersion]) => {
      const completed = statuses.get(tool)?.completed || (await this.isHarvestedbyTool(tool, toolVersion, startTime))
      if (completed && !statuses.get(tool)) statuses.set(tool, { toolVersion, completed })
      return tool
    })
    return Promise.all(harvestChecks).then(tools => tools.every(tool => statuses.get(tool)?.completed))
  }

  async isHarvestedbyTool(tool, toolVersion, startTime = 0) {
    if (!tool || !toolVersion) return false
    const harvested = await this.fetchHarvestResult(tool, toolVersion)
    if (!harvested._metadata) return false
    const fetchedAt = new Date(harvested._metadata.fetchedAt)
    console.log(`${this._coordinates} ${tool}, ${toolVersion} fetched at ${fetchedAt}`)
    return fetchedAt.getTime() > startTime
  }

  async fetchHarvestResult(tool, toolVersion) {
    return this._fetch(`${this.apiBaseUrl}/harvest/${this._coordinates}/${tool}/${toolVersion}?form=raw`).then(r =>
      r.headers.get('Content-Length') === '0' ? Promise.resolve({}) : r.json()
    )
  }
}

module.exports = HarvestResultFetcher
