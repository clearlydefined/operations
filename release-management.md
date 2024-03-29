# Release Management

These notes cover how to release and deploy the three primary apps, i.e. [service](https://github.com/clearlydefined/service), [website](https://github.com/clearlydefined/website), and [crawler](https://github.com/clearlydefined/crawler).

_NOTE: All apps are transitioning to use Semantic Versioning, as described below, and to use GitHub actions for deploying.  This documentation will be changing as that effort proceeds, so check back here before every release and deploy._

## TLDR; Understanding Semantic Versioning

_If you are not familiar with Semantic Versioning, you are encouraged to read the [official documentation](https://semver.org/) for the full description._

Semantic Versioning track three levels of change in the version number (e.g. v2.3.4)

**MAJOR:** _from v2.3.4 to v3.0.0_

The first number increments if there is a breaking change meaning that the consumer cannot use this version without taking additional steps (Examples: new feature that is required, database schema changes, file format changes, changes to signatures/output of public methods, API changes, etc.)

_NOTE: To limit the number of MAJOR releases, consider using deprecation.  With deprecation, users can use either the old approach or the new one.  If the old code is used, a deprecation message is logged advising an update to the new approach.  When a MAJOR release is required, all deprecated code is removed._

**MINOR:** _from v2.3.4 to v2.4.0_

The second number increments if there is a minor change and no MAJOR changes (Examples: new feature that is optional, changes to signatures/output of private methods, new API endpoint, etc.)

**PATCH:** _from v2.3.4 to v2.3.5_

The third number increments if there are only trivial changes that do not impact processing  and there aren't any MAJOR or MINOR changes (Examples: bug fixes, documentation changes, fixing typos, etc.)

**Pre-release:**

Pre-releases append a confidence indicator. The initial confidence level (e.g. alpha, beta, rc for release candidate) is assigned without a number.  If an additional release is made at that same confidence level, a sequential number starting at 1 is added after a period.

* alpha (e.g. 3.0.0-alpha, 3.0.0-alpha.1) is the lowest confidence level, typically assigned before all functionality is complete
* beta (e.g. 3.0.0-beta, 3.0.0-beta-1) is the middle confidence level, typically assigned once all features are complete, but not fully tested
* rc (e.g. 3.0.0-rc, 3.0.0-rc.1) is a full feature release candidate.  This is used during the final stages of release testing.  It is expected to be feature complete and may become the next published release if testing is good.

## Common steps for releasing

1. Decide the appropriate version for the new release following Semantic Versioning
   * if no testing has been done, the recommendation is to set a beta release (e.g. v2.4.0-alpha.2, v2.4.0-beta.1)
   * if testing is looking good, but not fully complete, set a release candidate (e.g. v2.4.0-rc.3)
   * when testing is complete, set the release version (e.g. v2.4.0)
2. In all cases, update the version in the package system using `npm-version` (e.g. `npm-version v2.4.0-rc.3`)
3. In all cases, create a tag for the code using the version number as the tag (e.g. v2.4.0-rc.3).
4. This is a good time to write the release notes, even if this is a beta or release candidate.  See [How to create Release Notes](#how-to-create-release-notes) for information on the structure of the notes.  Writing the these early will help identify what needs to be tested. Save the notes outside of GitHub (e.g. Google Docs). 
5. Create the release
   * For beta or release candidates versions:
     * create a pre-release using the tag created previously (e.g. v2.4.0-rc.3)
     * for the notes, only include the link that does the diff (e.g. for the service app, it will be something like `Changes: [v2.3.4...v2.4.0-rc.3](https://github.com/clearlydefined/service/compare/v2.3.4...https://github.com/clearlydefined/service/compare/v2.4.0-rc.3)`)
     * BE SURE TO CHECK THE `Set as a pre-release`
     * BE SURE THAT `Set as the latest release` WAS UNCHECKED automatically
   * For the full release:
     * create a published release using the tag created previously (e.g. v2.4.0)
     * for the notes, use the full set of release notes
     * check or uncheck `Set as the latest release` as needed
6. The next step is to Deploy.  The Deploy process varies between the apps.  All apps are moving to use the same process, but do not at this writing.  See the Deploy process for each app below in the [Deploy](#deploy) section.
7. Test deploy.  For pre-releases, full testing to determine if they are ready to be published.  For published release, test to be sure the deploy was successful.

## How to create Release Notes

The release notes should follow this basic pattern...

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

* List of PRs that introduce breaking changes (committers' handles)
* If none, do not include this section

### Minor Changes

* List of PRs, not in a previous section, that introduce minor changes (committers' handles)
* If none, do not include this section

### Bug Fixes and Patches

* List of PRs, not in a previous section, that are bug fixes or patches (committers' handles)
* If none, do not include this section

```

## How to Deploy

The steps to deploy vary by application.  Follow the steps for the application you are deploying.

_NOTE: All apps are transitioning to use Semantic Versioning, as described above, and to use GitHub actions for deploying.  This notes will be changing, so check back here before every release and deploy._

### Service

The code for the Service app lives in the [clearlydefined/service](https://github.com/clearlydefined/service) repository.  The base name for the app in the Azure App Services is `clearlydefined-api`.

#### dev deploy

A GitHub action is triggered by merging into the `master` branch.  The action deploys that branch to `clearlydefined-api-dev` app.

You can also deploy manually.  This is commonly used to test a PR branch before merging.

* go to the [Build and Deploy to dev service app](https://github.com/clearlydefined/service/actions/workflows/build-and-deploy-dev.yml) action
* click `Run workflow` drop down
* click the `Branch: master` drop down
* select the branch or tag you want to deploy
* click `Run workflow` button.

#### prod deploy

A GitHub action is triggered when a release is `published`.  The action deploys [prod](https://github.com/clearlydefined/service/tree/prod) branch to `clearlydefined-api-prod` app.

You can also deploy manually.  This is uncommon.  Production is setup to run the latest release.  This might be used if something goes wrong after a new release is deployed to revert to the previous production release.

* go to the [Build and Deploy to prod service app](https://github.com/clearlydefined/service/actions/workflows/build_and_deploy_prod.yml) action
* click `Run workflow` drop down
* click the `Branch: master` drop down
* select the previous known good release's tag
* click `Run workflow` button.

### Website

[Azure DevOps builds](https://dev.azure.com/clearlydefined/ClearlyDefined/_build)

### Crawler

[Azure DevOps builds](https://dev.azure.com/clearlydefined/ClearlyDefined/_build)
