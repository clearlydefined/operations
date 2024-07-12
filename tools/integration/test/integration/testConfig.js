// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const devApiBaseUrl = 'https://dev-api.clearlydefined.io'
const prodApiBaseUrl = 'https://api.clearlydefined.io'

const pollingInterval = 1000 * 60 * 5 // 5 minutes
const pollingMaxTime = 1000 * 60 * 60 // 60 minutes

//Havest tools to check for harvest completeness
const harvestTools = ['licensee', 'reuse', 'scancode']

//Components to test
const components = [
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

module.exports = {
  devApiBaseUrl,
  prodApiBaseUrl,
  components,
  harvest: {
    poll: { interval: pollingInterval, maxTime: pollingMaxTime }, // for each component
    tools: harvestTools,
    timeout: 1000 * 60 * 60 * 4 // 4 hours for harvesting all the components
  },
  definition: {
    timeout: 1000 * 10 // for each component
  }
}
