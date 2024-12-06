# Integration Test

## Resources

1. Integration tests are located at ./test to support the integration-test.yml GitHub Action.
1. The test configuration is located at [./test/testConfig.js](./test/testConfig.js). The test cases to be run are documented there.
1. The classes used in the integration tests are located at ./lib. Tests for those tooling classes are located at ./test/lib. Run `npm test` to test the tooling classes.
1. Sample API test calls to the production deployment can be found at ./api-test. The [Insomnia collection](./api-test/clearlydefined_prod_api_test_insomnia_collection.json) is organized by endpoints (definitions, harvest, and notices). Refer to the [Swagger UI](https://api.clearlydefined.io/api-docs/#/) for detailed documentation. The `Ping/health check` can be used as the first check to see if the service is up and running.
