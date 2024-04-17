# Integration Test

## Resources

1. Integration tests are located at ./test to support the integration-test.yml GitHub Action.
1. Npm scripts triggered in the GitHub Action include:

   - e2e-test-harvest: re-triggers harvest for the components in testConfig.js
   - e2e-test-service: runs the tests in [./test/e2e-test-service](./test/e2e-test-service) folder.

1. The test configuration is located at [./test/testConfig.js](./test/testConfig.js).

   It contains:

   - Components to be harvested,
   - Base URLs to the development and production systems, polling interval, and timeout,
   - Mock responses when the production system does not have the response or needs an override,
   - Current harvest schema versions. This is for polling harvest results to check whether the harvest is complete. When scan tool versions are updated, this needs to be updated as well.

1. The classes used in the integration tests are located at ./lib. Tests for those tooling classes are located at ./test/lib. Run `npm test` to test the tooling classes.
1. Sample API test calls to the production deployment can be found at ./api-test. The [Insomnia collection](./api-test/clearlydefined_prod_api_test_insomnia_collection.json) is organized by endpoints (definitions, harvest, and notices). Refer to the [Swagger UI](https://api.clearlydefined.io/api-docs/#/) for detailed documentation. The `Ping/health check` can be used as the first check to see if the service is up and running.
