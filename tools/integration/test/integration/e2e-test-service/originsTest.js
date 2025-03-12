// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const assert = require('assert')
const { callFetchWithRetry: callFetch } = require('../../../lib/fetch')
const { devApiBaseUrl, getComponents, origins } = require('../testConfig')

const ORIGIN_EXCLUSION_LIST = ['go/golang', 'debsrc/debian', 'maven/mavengoogle']
const ORIGIN_REVISIONS_EXCLUSION_LIST = ['debsrc/debian']

const MAVEN_COMPONENT_GROUP_ID = 'maven/mavencentral/org.apache.httpcomponents//'
const MAVEN_COMPONENT_PARTIAL_GROUP_ID = 'maven/org.apache.httpcompone'
const GRADLE_COMPONENT_ENDPOINT = 'gradleplugin/io.github.lognet.grpc-spring-boot'

;(async function validateOriginsApi() {
  const components = await getComponents()

  describe('Validate Origins API Between Dev and Prod', function () {
    this.timeout(origins.timeout)

    afterEach(() => new Promise(resolve => setTimeout(resolve, origins.timeout / 2)))

    components.filter(isComponentIncluded).forEach(component => {
      it(`Validates Origins API response for ${component}`, () => validateOriginResponses(component))
    })

    components.filter(isComponentIncludedWithRevisions).forEach(component => {
      it(`Validates Origins API response with revisions for ${component}`, () =>
        validateOriginResponsesWithRevisions(component))
    })

    it('Validates Origins API response for a Maven component with only a group ID', () =>
      validateOriginResponses(MAVEN_COMPONENT_GROUP_ID))

    it('Validates Origins API response for a Maven component with a partial group ID for suggestion checks', () =>
      validateEndpointWithRevisions(MAVEN_COMPONENT_PARTIAL_GROUP_ID, 'httpcore'))

    it('Validates Origins API response for a Gradle plugin component', () =>
      validateEndpointResponses(GRADLE_COMPONENT_ENDPOINT, 'io.github.lognet.grpc-spring-boot'))

    it('Validates Origins API with revisions response for a Gradle plugin component', () =>
      validateEndpointWithRevisions(GRADLE_COMPONENT_ENDPOINT, '4.6.0'))
  })
})()

function isValueInResponse(response, value) {
  return response.some(item => item?.id?.includes(value))
}

function isRevisionInResponse(response, value) {
  return response.some(item => item?.sha?.includes(value)) || response.some(item => item.includes(value))
}

function assertPackageResponse(actual, value) {
  assert.ok(actual.length > 0, `No matching package returned`)
  assert.ok(isValueInResponse(actual, value), `Response does not contain expected package`)
}

function assertRevisionResponse(actual, value) {
  assert.ok(actual.length > 0, `No matching version returned`)
  assert.ok(isRevisionInResponse(actual, value), `Response does not contain expected version`)
}

function exclusionFilter(item, exclusionList) {
  return !exclusionList.some(excluded => item.includes(excluded))
}

function isComponentIncluded(coordinate) {
  return exclusionFilter(coordinate, ORIGIN_EXCLUSION_LIST)
}

function isComponentIncludedWithRevisions(coordinate) {
  return exclusionFilter(coordinate, ORIGIN_REVISIONS_EXCLUSION_LIST)
}

function resolveProviderType(type, provider) {
  switch (type) {
    case 'git':
    case 'gem':
      return provider
    case 'conda':
      return `conda/${provider}`
    case 'maven':
      return provider === 'mavengoogle' ? provider : type
    default:
      return type
  }
}

function parseCoordinates(coordinates) {
  const [type, provider, namespaceOrEmpty, name, version] = coordinates.split('/')
  return {
    type,
    provider,
    namespace: namespaceOrEmpty === '-' ? '' : namespaceOrEmpty,
    name,
    version
  }
}

function buildCondaUrl(coordinates) {
  const { type, provider, name } = parseCoordinates(coordinates)
  return `${type}/${provider}/${name}`
}

function buildOriginUrl(coordinates) {
  const { type, provider, namespace, name } = parseCoordinates(coordinates)
  const resolvedType = resolveProviderType(type, provider)
  return `${resolvedType}${namespace ? `/${namespace}` : ''}${name ? `/${name}` : ''}`
}

async function validateEndpointResponses(endpoint, expectedValue) {
  const devResponse = await callFetch(`${devApiBaseUrl}/origins/${endpoint}`).then(res => res.json())
  assertPackageResponse(devResponse, expectedValue)
}

async function validateEndpointWithRevisions(endpoint, expectedValue) {
  const devResponse = await callFetch(`${devApiBaseUrl}/origins/${endpoint}/revisions`).then(res => res.json())
  assertRevisionResponse(devResponse, expectedValue)
}

async function validateOriginResponsesWithRevisions(coordinates) {
  const originUrl = buildOriginUrl(coordinates)
  const version = normalizeVersion(coordinates.split('/').at(-1))
  await validateEndpointWithRevisions(originUrl, version)
}

async function validateOriginResponses(coordinates) {
  const originUrl = coordinates.startsWith('conda/') ? buildCondaUrl(coordinates) : buildOriginUrl(coordinates)
  const componentName = coordinates.split('/').at(-2)
  await validateEndpointResponses(originUrl, componentName)
}

function normalizeVersion(version) {
  return version.replace(/_[\w]+$/, '').replace(/^v/, '')
}
