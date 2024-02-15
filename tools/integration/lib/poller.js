// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

class Poller {
  constructor(interval, maxTime) {
    this.interval = interval
    this.maxTime = maxTime
  }

  async poll(activity) {
    let counter = 0
    while (counter * this.interval < this.maxTime) {
      console.log(`Polling ${counter}`)
      const isDone = await activity()
      if (isDone) return true
      await new Promise(resolve => setTimeout(resolve, this.interval))
      counter++
    }
    return false
  }
}

module.exports = Poller
