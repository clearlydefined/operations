# Release Management

These notes cover how to release and deploy the three primary apps, i.e. [service](https://github.com/clearlydefined/service), [website](https://github.com/clearlydefined/website), and [crawler](https://github.com/clearlydefined/crawler).

_NOTE: All apps are transitioning to use GitHub actions for deploying.  This documentation will be changing as that effort proceeds, so check back here before every release and deploy._

## Acceptance Test

Before Release and Deploy, follow the acceptance testing recommendations in this section.

End-to-end integration tests have been implemented to ensure that the functionalities of the [service API](https://api.clearlydefined.io/api-docs/#) work as expected. Further effort is required to enhance the test suite and cover more cases and error handling.

To manually trigger the integration tests, you can use [GitHub Actions in the operations repository](https://github.com/clearlydefined/operations/actions/workflows/integration-test.yml). If you run the tests on the main branch, all the tests committed to that branch will be executed. By default, the integration tests compare the results from the development deployment with the production deployment. You can configure the development and production deployments in testConfig.js.

The current tests include:

- Harvesting components that are supported by ClearlyDefined.
- Retrieving information from the harvest store through the /harvest API.
- Computing and retrieving definitions for coordinates through the /definitions API.
- Searching for definitions for coordinates through the GET /definitions API.
- Curating components through the PATCH /curations API.
- Retrieving curation information through the /curations API.
- Previewing definitions with curation through the /definitions API.
- Retrieving attachments through the /attachments API.
- Generating notices for all component types supported by ClearlyDefined through the POST /notices API (in progress)

## Release

This process is for production only.  Skip to [Deploy](#deploy) for dev apps.

1. Write release notes.  This will help you determine the version to use for the new release. See [How to create Release Notes](#how-to-create-release-notes) for information on the structure of the notes.  Writing these early will help identify what needs to be tested. Save the notes outside of GitHub (e.g. Google Docs).
2. Decide the appropriate version for the new release following Semantic Versioning. See [TLDR; Understanding Semantic Versioning](#tldr-understanding-semantic-versioning) for guidance on selecting the new version.)
3. Update the version
     * in `master` branch, run `npm version <NEW_VERSION> --no-git-tag-version` (e.g. `npm version v2.4.0 --no-git-tag-version`)
     * commit updated version to `master` branch
     * push commit directly to `master` branch (**_This is the only time you should directly push to master_**)
4. Update code being published
     * DO NOT CREATE A PR as this causes the histories to be out of sync
     * rebase `prod` on revision... `master` (`git checkout prod && git merge master --ff-only && git push origin prod`) TODO: double check the git commands work, as I do this in Tower.
     * Check that the update was successful by comparing [prod to master](https://github.com/clearlydefined/crawler/compare/prod...master) and [master to prod](https://github.com/clearlydefined/crawler/compare/master...prod).  Both should show "There isn’t anything to compare." and "prod and master are identical." or "master and prod are identical." (_Links are for the crawler.  Use a similar process for the service and website.)
5. Create the release
     * click Draft a new release
     * change Target to `prod`
     * click Choose a tag and type the tag (e.g. `v2.4.0`) and click + Create new tag: (should show the new tag)
     * set the Release title to the version (e.g. `v2.4.0`)
     * for the notes, use the full set of release notes created previously (_good for complex releases requiring explanation_) or use the Generate release notes button (_good for short releases that are straight forward_)
     * verify `Set as the latest release` is checked
     * click Publish release

## Deploy

### Repositories, Workflows, and Azure Apps

service
- code: [clearlydefined/service](https://github.com/clearlydefined/service) repository
- dev workflow: [build-and-deploy-dev.yml](https://github.com/clearlydefined/service/blob/master/.github/workflows/build-and-deploy-dev.yml)
- prod workflow: [build-and-deploy-dev.yml](https://github.com/clearlydefined/service/blob/master/.github/workflows/build-and-deploy-prod.yml)
- basename: `<Azure App basename>` is `clearlydefined-api`

website
- code: [clearlydefined/website](https://github.com/clearlydefined/website) repository
- dev workflow: [build-and-deploy-dev.yml](https://github.com/clearlydefined/website/blob/master/.github/workflows/build-and-deploy-dev.yml)
- prod workflow: [build-and-deploy-dev.yml](https://github.com/clearlydefined/website/blob/master/.github/workflows/build-and-deploy-prod.yml)
- basename: `<Azure App basename>` is `clearlydefined`

crawler:
- code: [clearlydefined/crawler](https://github.com/clearlydefined/crawler) repository
- dev workflow: [build-and-deploy-dev.yml](https://github.com/clearlydefined/crawler/blob/master/.github/workflows/build-and-deploy-dev.yml)
- prod workflow: [build-and-deploy-dev.yml](https://github.com/clearlydefined/crawler/blob/master/.github/workflows/build-and-deploy-prod.yml)
- basename: `<Azure App basename>` is `cdcrawler`

### dev Deploy

All three apps use the common deployment workflows defined in [operations/.github/workflows](https://github.com/clearlydefined/operations/tree/main/.github/workflows) for dev deploy.

A deploy workflow is triggered by merging into the `master` branch which will be deployed to `<Azure App basename>-dev`.

You can also deploy manually.  This is commonly used to test a PR branch before merging.

- under the Actions tab, select `Build and Deploy -- DEV` workflow
- click `Run workflow` drop down
- click the `Branch: master` drop down
- select the branch or tag you want to deploy
- click `Run workflow` button.

Confirm the ghcr package was created.

- [service-dev package](https://github.com/clearlydefined/service/pkgs/container/service-dev)
- [website-dev package](https://github.com/clearlydefined/website/pkgs/container/website-dev)
- [crawler-dev package](https://github.com/clearlydefined/crawler/pkgs/container/crawler-dev)

Confirm that the dev health endpoint has the correct version and sha.

- [service-dev health endpoint](https://dev-api.clearlydefined.io/)
- [website-dev health endpoint](https://clearlydefined-dev.azurewebsites.net/health/)
- [crawler-dev health endpoint](https://cdcrawler-dev.azurewebsites.net/)

### prod Deploy

All three apps use the common deployment workflows defined in [operations/.github/workflows](https://github.com/clearlydefined/operations/tree/main/.github/workflows) for prod deploy. The Crawler requires an additional step described in [Crawler Production Deploy - Extra Steps](#crawler-production-deploy-extra-steps).

A deploy workflow is triggered when a release is `published`. The `prod` branch will be deployed to `<Azure App basename>-prod` and `<Azure App basename>-prod-europe`.

You can also deploy manually.  **THIS IS UNCOMMON.**  Production is setup to run the latest release.  This might be used if something goes wrong after a new release is deployed to revert to the previous production release.

- under the Actions tab, select `Build and Deploy -- PROD` workflow
- click `Run workflow` drop down
- click the `Branch: master` drop down
- select the previous known good release's tag
- click `Run workflow` button.

Confirm the ghcr package was created.

- [service-prod package](https://github.com/clearlydefined/service/pkgs/container/service)
- [website-prod package](https://github.com/clearlydefined/website/pkgs/container/website)
- [crawler-prod package](https://github.com/clearlydefined/crawler/pkgs/container/crawler)

Additionally, the crawler publishes to Docker Hub.  Verify a tag for the new release was added there.

- [crawler-prod Docker Hub](https://hub.docker.com/r/clearlydefined/crawler/tags) - You should see a TAG named for newly released version.  The latest TAG and the new version's TAG should have the same Digest sha and compressed size.

Confirm that the dev health endpoint has the correct version and sha.

- [service-prod health endpoint](https://api.clearlydefined.io/)
- [service-prod-europe health endpoint](https://clearlydefined-api-prod-europe.azurewebsites.net/) (_May take a while before you see the update. Try checking back later._)

The website production release does not include the healthcheck.  It will take you to the home page.
- [website-prod health endpoint](https://clearlydefined.io/health/)
- [website-prod-europe health endpoint](https://clearlydefined-prod-europe.azurewebsites.net/health/?sort=releaseDate&sortDesc=true) (_May take a while before you see the update.  Try checking back later._)

#### Crawler Production Deploy - Extra Steps

Right now, the last step is to ask staff at MSFT to restart the production crawler. TODO: Working on a better process.

Once the final step completes, confirm that the production health endpoint has the correct version and sha.

- [crawler-prod health endpoint](https://clearlydefined-crawler-prod.azurewebsites.net/)

## Verification After Deployment

After the deployment, API calls can be made to the service for verification purposes. The collection of sample API calls can be found at [tools/integration/api-test](./tools/integration/api-test).

Here are some steps to get started:

1. To ensure that the service is up and running, perform a [ping/health](https://api.clearlydefined.io) and confirm the build SHA and version match that of the release tag.
2. Use the [POST call to /harvest](https://api.clearlydefined.io/api-docs/#/harvest/post_harvest) to add a new component for harvesting. You can find an example of this API call in the `harvest` folder of the sample collection. Replace the request body with the details of the new component. Please note that components that have already been harvested are usually skipped during the harvest process.
3. To confirm that the component has been successfully harvested, you can either inspect the harvest store (such as Blob Storage) or make a [GET call to /harvest](https://api.clearlydefined.io/api-docs/#/harvest/get_harvest__type___provider___namespace___name___revision_). You can find examples of the API call in the `harvest` folder of the sample collection. Keep in mind that depending on the number of items in the queue, it may take some time for the harvest to be completed.
4. Verify the definition of the component by making a [GET call to /definitions](https://api.clearlydefined.io/api-docs/#/definitions/get_definitions__type___provider___namespace___name___revision_). Examples of this call can be found in the `definitions` folder of the sample collection.  Alternatively, you can also verify the definition through the ClearlyDefined website, e.g. https://clearlydefined.io/definitions/npm/npmjs/@types/aws-lambda/8.10.137, along with the corresponding coordinates.
5. Verify the notice generation by making a [POST call to /notices](https://api.clearlydefined.io/api-docs/#/notices/post_notices). You can find an example of this call in the `notices` folder of the sample api-test collection.
6. Check the [website](https://clearlydefined.io/) to ensure that the recently harvested list is populated. You can click on the components listed there to verify their definitions.

## Appendix

### Create Release Notes

The release notes should follow this basic pattern...

_NOTE: Anywhere there is a list of PRs, the format follows that returned by getPRs.  See section [Get the list of PRs since the last release](#get-the-list-of-prs-since-the-last-release). Copy and paste the PRs from the list into the release notes._

```md
## Release Highlights

Release tag: [v1.0.0](https://github.com/clearlydefined/service/tree/v1.0.0)

Brief overview of the major impact of the release.

## Upgrade Notes

Describe any actions required to be able to use this version.  For example, instructions for running a database migration, how to process changes in file formats, etc.

## What’s changed

_The next line shows an example using the service app of how to create a link to a diff of all changes._

Changes: [v1.0.0...v1.0.1](https://github.com/clearlydefined/service/compare/v1.0.0...https://github.com/clearlydefined/service/compare/v1.0.1)

### Breaking Changes

* List of PRs that introduce breaking changes
* If none, do not include this section

### Minor Changes

* List of PRs, not in a previous section, that introduce minor changes
* If none, do not include this section

### Bug Fixes and Patches

* List of PRs, not in a previous section, that are bug fixes or patches
* If none, do not include this section

```

### Understanding Semantic Versioning

_If you are not familiar with Semantic Versioning, you are encouraged to read the [official documentation](https://semver.org/) for the full description._

Semantic Versioning tracks three levels of change in the version number (e.g. v2.3.4)

**MAJOR:** _from v2.3.4 to v3.0.0_

The first number increments if there is a breaking change meaning that the consumer cannot use this version without taking additional steps (Examples: new feature that is required, database schema changes, file format changes, changes to signatures/output of public methods, API changes, etc.)

_NOTE: To limit the number of MAJOR releases, consider using deprecation.  With deprecation, users can use either the old approach or the new one.  If the old code is used, a deprecation message is logged advising an update to the new approach.  When a MAJOR release is required, all deprecated code is removed._

**MINOR:** _from v2.3.4 to v2.4.0_

The second number increments if there is a minor change and no MAJOR changes (Examples: new feature that is optional, changes to signatures/output of private methods, new API endpoint, etc.)

**PATCH:** _from v2.3.4 to v2.3.5_

The third number increments if there are only trivial changes that do not impact processing  and there aren't any MAJOR or MINOR changes (Examples: bug fixes, documentation changes, fixing typos, etc.)
