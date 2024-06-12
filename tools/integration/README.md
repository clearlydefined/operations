# Integration Test

## Resources

1. To execute integration tests, you can use the integration-test.yml GitHub Action. When running on the main branch, all tests committed to that branch will be executed. By default, the integration test suite compares the results from development with the production deployment. You can find the integration test suite at [./test/integration](./test/integration), and you can configure the development and production deployment in [./test/integration/testConfig.js](./test/integration/testConfig.js).
1. npm scripts triggered in the GitHub Action include:

   - e2e-test-harvest: re-triggers and verifies the completion of the harvest for the components specified in [./test/integration/testConfig.js](./test/integration/testConfig.js)
   - e2e-test-service: runs the suite of tests in [./test/integration/e2e-test-service](./test/integration/e2e-test-service) folder. These tests are organized based on the endpoints documented in [Swagger UI](https://api.clearlydefined.io/api-docs/#/).

1. The test configuration is located at [./test/integration/testConfig.js](./test/integration/testConfig.js).

   It contains:

   - Components to be harvested,
   - Base URLs for the development and production systems, along with polling interval and timeout settings,
   - Current harvest schema versions. This is for polling harvest results to check whether the harvest is complete. When scan tool versions are updated, these need to be updated as well.

1. Test fixtures are grouped by endpoints at [./test/integration/fixtures](./test/integration/fixtures). You can use these fixtures to override responses from the production system when necessary.
1. The classes used in the integration tests are located at [./lib](./lib). Tests for those tooling classes are located at ./test/lib. Run `npm test` to test the tooling classes.
1. Sample API test calls to the production deployment can be found at [./api-test](./api-test). The [Insomnia collection](./api-test/clearlydefined_prod_api_test_insomnia_collection.json) is organized by endpoints (definitions, harvest, and notices). Refer to the [Swagger UI](https://api.clearlydefined.io/api-docs/#/) for detailed documentation. The `Ping/health check` can be used as the first check to see if the service is up and running.
