# Integration Test

## Resources

1. Integration tests are at ./test to support the integration-test.yml GitHub Action
1. Test configuration is at ./test/testConfig. The test cases to be run are documented there.
1. Sample api test calls to production deployment can be found at ./api-test.  The [insomnia collection](./api-test/clearlydefined_prod_api_test_insomnia_collection.json) is organized by end points (definitions, harvest, and notices).  See [swagger ui](https://api.clearlydefined.io/api-docs/#/) for detailed documentation.  The `Ping/health check` can be used as the first check to see if the service is up and running.
