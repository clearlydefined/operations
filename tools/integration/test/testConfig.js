// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const devApiBaseUrl = 'https://dev-api.clearlydefined.io'
const prodApiBaseUrl = 'https://api.clearlydefined.io'

const pollingInterval = 1000 * 60 * 5 // 5 minutes
const pollingMaxTime = 1000 * 60 * 30 // 30 minutes

//Havest results to check for harvest completeness
//The versions correspond to the schema versions of the tools which are used in /harvest/{type}/{provider}/{namespace}/{name}/{revision}/{tool}/{toolVersion}
//See https://api.clearlydefined.io/api-docs/#/harvest/get_harvest__type___provider___namespace___name___revision___tool___toolVersion_
const harvestSchemaVersions = [
  ['licensee', '9.14.0'],
  ['scancode', '30.3.0'],
  ['reuse', '3.2.1']
]

//Components to test
const components = [
  'maven/mavencentral/org.apache.httpcomponents/httpcore/4.4.16',
  'maven/mavengoogle/android.arch.lifecycle/common/1.0.1',
  'maven/gradleplugin/io.github.lognet/grpc-spring-boot-starter-gradle-plugin/4.6.0',
  'crate/cratesio/-/ratatui/0.26.0',
  'npm/npmjs/-/redis/0.1.0',
  'git/github/ratatui-org/ratatui/bcf43688ec4a13825307aef88f3cdcd007b32641',
  'gem/rubygems/-/sorbet/0.5.11226',
  'pypi/pypi/-/platformdirs/4.2.0',
  'go/golang/rsc.io/quote/v1.3.0',
  'nuget/nuget/-/NuGet.Protocol/6.7.1',
  'composer/packagist/symfony/polyfill-mbstring/v1.28.0',
  'pod/cocoapods/-/SoftButton/0.1.0', // Dev and prod have different file counts. See https://github.com/clearlydefined/crawler/issues/529
  'deb/debian/-/mini-httpd/1.30-0.2_arm64',
  'debsrc/debian/-/mini-httpd/1.30-0.2'
  // 'sourcearchive/mavencentral/org.apache.httpcomponents/httpcore/4.1' // Dev and prod have different license and scores. See https://github.com/clearlydefined/crawler/issues/533
]

//When production response is not available or needs to be corrected, stub response from production service for testing
const expectedResponses = [
  { url: '/definitions/pod/cocoapods/-/SoftButton/0.1.0', response: require('./fixtures/softbutton-0.1.0.json') }
]

module.exports = {
  devApiBaseUrl,
  prodApiBaseUrl,
  expectedResponses,
  components,
  harvest: {
    poll: { interval: pollingInterval, maxTime: pollingMaxTime },
    harvestSchemaVersions,
    timeout: 1000 * 60 * 60 * 2 // 2 hours for harvesting all the components
  },
  definition: {
    timeout: 1000 * 10 // for each component
  }
}
