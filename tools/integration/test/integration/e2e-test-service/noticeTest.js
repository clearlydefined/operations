// (c) Copyright 2024, SAP SE and ClearlyDefined contributors. Licensed under the MIT license.
// SPDX-License-Identifier: MIT

const { deepStrictEqual } = require('assert')
const { callFetch, buildPostOpts } = require('../../../lib/fetch')
const { devApiBaseUrl, prodApiBaseUrl, components, definition } = require('../testConfig')
const nock = require('nock')
const fs = require('fs')

describe('Validate notice files between dev and prod', function () {
    this.timeout(definition.timeout)

    //Rest a bit to avoid overloading the servers
    afterEach(() => new Promise(resolve => setTimeout(resolve, definition.timeout / 2)))

    before(() => {
        loadFixtures().forEach(([coordinatesString, definition]) => {
            nock(prodApiBaseUrl, { allowUnmocked: true }).post('/notices', {"coordinates": [coordinatesString]}).reply(200, definition)
        })
    })

    components.forEach(coordinates => {
        it(`should return the same notice as prod for ${coordinates}`, () => fetchAndCompareNotices(coordinates))
    })
})

async function fetchAndCompareNotices(coordinates) {
    const [recomputedDef, expectedDef] = await Promise.all(
        [
            callFetch(`${devApiBaseUrl}/notices`, buildPostOpts({
                "coordinates": [
                    coordinates
                ]
            })),
            callFetch(`${prodApiBaseUrl}/notices`, buildPostOpts({
                "coordinates": [
                    coordinates
                ]
            }))
        ].map(p => p.then(r => r.json()))
    )
    deepStrictEqual(recomputedDef, expectedDef)
}

function loadFixtures() {
    const location = 'test/integration/fixtures/notices'
    return fs
        .readdirSync(location)
        .filter(f => f.endsWith('.json'))
        .map(jsonFile => {
            const definition = JSON.parse(fs.readFileSync(`${location}/${jsonFile}`))
            const coordinatesString = jsonFile.replaceAll('-', '/').replaceAll('//', '/-/').replace('.json', '')
            return [coordinatesString, definition]
        }
        )
}