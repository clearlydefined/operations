// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT
const fs = require('fs').promises
const path = require('path')

const devApiBaseUrl = 'https://dev-api.clearlydefined.io'
const prodApiBaseUrl = 'https://api.clearlydefined.io'

const pollingInterval = 1000 * 60 * 5 // 5 minutes
const pollingMaxTime = 1000 * 60 * 60 // 60 minutes

//Havest tools to check for harvest completeness
const harvestTools = ['licensee', 'reuse', 'scancode']

//Components to test
const componentsStatic = [
  'pypi/pypi/-/platformdirs/4.2.0', //Keep this as the first element to test, it is relatively small
  'maven/mavencentral/org.apache.httpcomponents/httpcore/4.4.16',
  'maven/mavengoogle/android.arch.lifecycle/common/1.0.1',
  'maven/gradleplugin/io.github.lognet/grpc-spring-boot-starter-gradle-plugin/4.6.0',
  'conda/conda-forge/linux-aarch64/numpy/1.16.6-py36hdc1b780_0',
  'crate/cratesio/-/ratatui/0.26.0',
  'npm/npmjs/-/redis/0.1.0',
  'git/github/ratatui-org/ratatui/bcf43688ec4a13825307aef88f3cdcd007b32641',
  'gem/rubygems/-/sorbet/0.5.11226',
  'pypi/pypi/-/sdbus/0.12.0',
  'go/golang/rsc.io/quote/v1.3.0',
  'nuget/nuget/-/NuGet.Protocol/6.7.1',
  'composer/packagist/symfony/polyfill-mbstring/v1.28.0',
  'pod/cocoapods/-/SoftButton/0.1.0', // Dev and prod have different file counts. See https://github.com/clearlydefined/crawler/issues/529
  'deb/debian/-/mini-httpd/1.30-0.2_arm64',
  'debsrc/debian/-/mini-httpd/1.30-0.2',
  'pod/cocoapods/-/xcbeautify/0.9.1'
  // 'sourcearchive/mavencentral/org.apache.httpcomponents/httpcore/4.1' // Dev and prod have different license and scores. See https://github.com/clearlydefined/crawler/issues/533
]

function shouldUseDynamicComponents() {
  // check for environment variable DYNAMIC_COORDINATES, if it is set to true, use dynamic components
  return process.env.DYNAMIC_COORDINATES === 'true'
}

async function getComponents() {
  if (shouldUseDynamicComponents()) {
    console.info('Using dynamic components')
    return componentsDynamic()
  } else {
    console.info('Using static components')
    return Promise.resolve(componentsStatic)
  }
}

const componentsDynamic = async () => {
  const filePath = path.join(__dirname, 'recentDefinitions.json')

  try {
    // Check if the file exists
    await fs.access(filePath)
    // Read the file contents
    const data = await fs.readFile(filePath, 'utf8')
    console.info('Read dynamic components from disk')
    return JSON.parse(data)
  } catch (err) {
    // If the file doesn't exist, fetch the data and save it to disk
    const response = await fetch(
      'https://cosmos-query-function-app.azurewebsites.net/api/getrecentdefinitions?days=1&limit=1'
    )
    const data = await response.json()
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
    console.info('Read dynamic components from remote')
    return data
  }
}

module.exports = {
  devApiBaseUrl,
  prodApiBaseUrl,
  getComponents,
  harvest: {
    poll: { interval: pollingInterval, maxTime: pollingMaxTime }, // for each component
    tools: harvestTools,
    timeout: 1000 * 60 * 60 * 4 // 4 hours for harvesting all the components
  },
  definition: {
    timeout: 1000 * 10 // for each component
  }
}
