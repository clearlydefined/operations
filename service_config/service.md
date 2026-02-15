- [Service AKA API](#service-aka-api)
  - [Configuration](#configuration)
    - [APPINSIGHTS\_CRAWLER](#appinsights_crawler)
    - [APPINSIGHTS\_INSTRUMENTATIONKEY](#appinsights_instrumentationkey)
    - [APPINSIGHTS\_SERVICE](#appinsights_service)
    - [APPLICATIONINSIGHTS\_CONNECTION\_STRING](#applicationinsights_connection_string)
    - [ATTACHMENT\_STORE\_PROVIDER](#attachment_store_provider)
    - [AUTH\_CURATION\_TEAM](#auth_curation_team)
    - [AUTH\_GITHUB\_CLIENT](#auth_github_client)
    - [AUTH\_HARVEST\_TEAM](#auth_harvest_team)
    - [BATCH_RATE_LIMIT_MAX](#batch_rate_limit_max)
    - [BATCH_RATE_LIMIT_WINDOW](#batch_rate_limit_window)
    - [CACHING\_PROVIDER](#caching_provider)
    - [CACHING\_REDIS\_SERVICE](#caching_redis_service)
    - [CRAWLER\_API\_AUTH\_TOKEN\*\*](#crawler_api_auth_token)
    - [CRAWLER\_API\_URL](#crawler_api_url)
    - [CURATION\_GITHUB\_REPO](#curation_github_repo)
    - [CURATION\_GITHUB\_OWNER](#curation_github_owner)
    - [CURATION\_GITHUB\_BRANCH](#curation_github_branch)
    - [CURATION\_GITHUB\_TOKEN](#curation_github_token)
    - [CURATION\_STORE\_PROVIDER](#curation_store_provider)
    - [CURATION\_MONGO\_COLLECTION\_NAME](#curation_mongo_collection_name)
    - [CURATION\_MONGO\_CONNECTION\_STRING](#curation_mongo_connection_string)
    - [CURATION\_PROVIDER](#curation_provider)
    - [CURATION\_QUEUE\_PROVIDER](#curation_queue_provider)
    - [DEFINITION\_STORE\_PROVIDER](#definition_store_provider)
    - [DEFINITION\_MONGO\_TRIMMED\_COLLECTION\_NAME](#definition_mongo_trimmed_collection_name)
    - [DEFINITION\_MONGO\_COLLECTION\_NAME](#definition_mongo_collection_name)
    - [DEFINITION\_MONGO\_CONNECTION\_STRING](#definition_mongo_connection_string)
    - [DOCKER](#docker)
    - [DOCKER\_ENABLE\_CI](#docker_enable_ci)
    - [HARVEST\_AZBLOB\_CONTAINER\_NAME](#harvest_azblob_container_name)
    - [HARVEST\_AZBLOB\_CONNECTION\_STRING](#harvest_azblob_connection_string)
    - [HARVEST\_CACHE\_TTL\_IN\_SECONDS](#harvest_cache_ttl_in_seconds)
    - [HARVEST\_STORE\_PROVIDER](#harvest_store_provider)
    - [HARVEST\_QUEUE\_PROVIDER](#harvest_queue_provider)
    - [HARVEST\_QUEUE\_PREFIX\*\*](#harvest_queue_prefix)
    - [HARVEST\_THROTTLER\_PROVIDER](#harvest_throttler_provider)
    - [HARVEST\_THROTTLER\_BLACKLIST](#harvest_throttler_blacklist)
    - [HARVESTER\_PROVIDER](#harvester_provider)
    - [LOG\_NODE\_HEAPSTATS](#log_node_heapstats)
    - [LOG\_NODE\_HEAPSTATS\_INTERVAL\_MS](#log_node_heapstats_interval_ms)
    - [MULTIVERSION\_CURATION\_FF](#multiversion_curation_ff)
    - [NODE\_ENV](#node_env)
    - [RATE\_LIMIT\_MAX](#rate_limit_max)
    - [RATE\_LIMIT\_WINDOW](#rate_limit_window)
    - [SEARCH\_PROVIDER](#search_provider)
    - [SEARCH\_AZURE\_SERVICE](#search_azure_service)
    - [SEARCH\_AZURE\_API\_KEY](#search_azure_api_key)
    - [SERVICE\_ENDPOINT](#service_endpoint)
    - [TEMPDIR](#tempdir)
    - [WEBHOOK\_CRAWLER\_SECRET](#webhook_crawler_secret)
    - [WEBHOOK\_GITHUB\_SECRET](#webhook_github_secret)
    - [WEBSITE\_ENDPOINT](#website_endpoint)
    - [WEBSITE\_HTTPLOGGING\_RETENTION\_DAYS](#website_httplogging_retention_days)
    - [WEBSITES\_ENABLE\_APP\_SERVICE\_STORAGE](#websites_enable_app_service_storage)

# Service AKA API

## Configuration

The environmental variables for the clearlydefined-api-dev App Service include:

* APPINSIGHTS_CRAWLER_APIKEY
* APPINSIGHTS_CRAWLER_APPLICATIONID
* APPINSIGHTS_INSTRUMENTATIONKEY
* APPLICATIONINSIGHTS_CONNECTION_STRING
* APPINSIGHTS_SERVICE_APIKEY
* APPINSIGHTS_SERVICE_APPLICATIONID
* ATTACHMENT_STORE_PROVIDER
* AUTH_CURATION_TEAM
* AUTH_GITHUB_CLIENT_ID
* AUTH_GITHUB_CLIENT_SECRET
* AUTH_HARVEST_TEAM
* CACHING_PROVIDER
* CACHING_REDIS_API_KEY
* CASHING_REDIS_SERVICE
* CRAWLER_API_AUTH_TOKEN
* CRAWLER_API_URL
* CURATION_GITHUB_BRANCH
* CURATION_GITHUB_REPO
* CURATION_MONGO_COLLECTION_NAME
* CURATION_MONGO_CONNECTION_STRING
* CURATION_PROVIDER
* CURATION_QUEUE_PROVIDER
* CURATION_STORE_PROVIDER
* DEFINITION_MONGO_COLLECTION_NAME
* DEFINITION_MONGO_TRIMMED_COLLECTION_NAME
* DEFINITION_MONGO_CONNECTION_STRING
* DEFINITION_STORE_PROVIDER
* DEFINITION_UPGRADE_DEQUEUE_BATCH_SIZE
* DEFINITION_UPGRADE_PROVIDER
* DEFINITION_UPGRADE_QUEUE_PROVIDER
* DEFINITION_UPGRADE_QUEUE_CONNECTION_STRING
* DEFINITION_UPGRADE_QUEUE_NAME
* DOCKER_CUSTOM_IMAGE_NAME
* DOCKER_ENABLE_CI
* DOCKER_REGISTRY_SERVER_PASSWORD
* DOCKER_REGISTRY_SERVER_URL
* DOCKER_REGISTRY_SERVER_USNERMAE
* HARVEST_AZBLOB_CONNECTION_STRING
* HARVEST_AZBLOB_CONTAINER_NAME
* HARVEST_CACHE_TTL_IN_SECONDS
* HARVEST_QUEUE_PREFIX
* HARVEST_QUEUE_PROVIDER
* HARVEST_THROTTLER_PROVIDER
* HARVEST_THROTTLER_BLACKLIST
* HARVESTER_PROVIDER
* LOG_NODE_HEAPSTATS
* LOG_NODE_HEAPSTATS_INTERVAL_MS
* NODE_ENV
* RATE_LIMIT_MAX
* RATE_LIMIT_WINDOW
* BATCH_RATE_LIMIT_MAX
* BATCH_RATE_LIMIT_WINDOW
* SEARCH_AZURE_API_KEY
* SEARCH_AZURE_SERVICE
* SEARCH_PROVIDER
* SERVICE_ENDPOINT
* WEBHOOK_CRAWLER_SECRET
* WEBHOOK_GITHUB_SECRET
* WEBSITE_ENDPOINT
* WEBSITE_HTTPLOGGING_RETENTION_DAYS
* WEBSITES_ENABLE_APP_SERVICE_STORAGE

That is a lot! Let's break it down.

### APPINSIGHTS_CRAWLER

These are used to get information from the Crawler's App Insights setup when the Service's /status API call is used (it's used by the website to display a status page). The App Insight's instance is called cdcrawler-dev

### APPINSIGHTS_INSTRUMENTATIONKEY

This is used by a dependency called Winston. [Winston](https://github.com/winstonjs/winston) is a Node JS logging library. We use an additional dependency, [winston-azure-application-insights](https://www.npmjs.com/package/winston-azure-application-insights) to broadcast the logs to Azure Application Insights. This requires an instrumentation key for our Azure Application Insights set up.

Note: Deprecated for Application Insights 3.x SDK; use `APPLICATIONINSIGHTS_CONNECTION_STRING`.

### APPLICATIONINSIGHTS_CONNECTION_STRING

This is the Application Insights connection string required by the Application Insights 3.x SDK. It replaces `APPINSIGHTS_INSTRUMENTATIONKEY`; if this is not set, telemetry initialization fails.

### APPINSIGHTS_SERVICE

These environmental variables are used to by the Service to query the apis Azure Application Insights instance. This is queried when the Service's /status API call is used.

### ATTACHMENT_STORE_PROVIDER

The value for this variable is "azure". This indicates that attachment data is stored in Azure, in this case in the "develop" blob container in the environments Azure Storage account.

**Harvested data** is the data output from our the various scanning tools (scancode, licensee, ClearlyDefined). **Attachments** are the "interesting files" we find and want to archive (either for durability or for quick access for example in producing a notices file).

### AUTH_CURATION_TEAM


This is a team in the ClearlyDefined GitHub Organization. This is the team that has permission to merge curations in the curations GitHub repo (which is defined in the CURATION_GITHUB_REPO environment variable) and sync them with the ClearlyDefined service.

Dev envioment team: https://github.com/orgs/clearlydefined/teams/curation-dev
Production envionment team: https://github.com/orgs/clearlydefined/teams/curation-prod

### AUTH_GITHUB_CLIENT

ClearlyDefined uses a [GitHub OAuth App](https://docs.github.com/en/developers/apps/authorizing-oauth-apps) to authenticate users to the Service.

These define the client id and client secret for the OAuth App.

### AUTH_HARVEST_TEAM

Although this does correlate to a team in the ClearlyDefined GitHub organization, it is not clear what it is used for in the Service.

Dev envronment team: https://github.com/orgs/clearlydefined/teams/harvest-dev
prod environment team: https://github.com/orgs/clearlydefined/teams/harvest-prod

### CACHING_PROVIDER

The Service caches definitions in a Redis cache. The cached definitions are replaced whenever a definition is updated.

This cache is an [Azure Cache for Redis](https://docs.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview)


This is the key for the Azure Cache for Redis.

### CACHING_REDIS_SERVICE

The URL for the Azure Cache for Redis.

### CRAWLER_API_AUTH_TOKEN**

This is a token used to authenticate the Service to send requests to the ClearlyDefined Crawler. It is the same as the **CRAWLER_SERVICE_AUTH_TOKEN** in the App Service configuration.

### CRAWLER_API_URL

This is the URL for the App Service.

### CURATION_GITHUB_REPO

This is the GitHub repo we use to store curations,

Dev: https://github.com/clearlydefined/curated-data-dev
Production: https://github.com/clearlydefined/curated-data

### CURATION_GITHUB_OWNER

This is the owner of the GitHub repo used to store curations, in this case the [clearlydefined GitHub org](https://github.com/clearlydefined).

### CURATION_GITHUB_BRANCH

This is the branch ClearlyDefined pulls curation information from, in this case the branch called master.

### CURATION_GITHUB_TOKEN

When it comes to curations, the ClearlyDefined service makes extensive use of the GitHub API. This is an API token that allows it to do this.

### CURATION_STORE_PROVIDER

This is what service we use to store information about curations, in this case **mongo**.

### CURATION_MONGO_COLLECTION_NAME

While we store the curations in GitHub, we store information about the Curations in a MongoDB collection, called **curations-20190227**.

The **curations-20190227** lives in the **clearlydefined** Mongo Database, which lives in the enviroments Azure Cosmos DB account.

[Azure Cosmos DB](https://docs.microsoft.com/en-us/azure/cosmos-db/introduction) is a managed NoSQL database service in Azure.

### CURATION_MONGO_CONNECTION_STRING

This is the string we use to connect to the **clearlydefined** Mongo Database in the enviroments Azure Cosmos DB account.

### CURATION_PROVIDER

This is the provider we use to store curations. In this case, it is **github**

### CURATION_QUEUE_PROVIDER

The **Curation Queue** is where we queue up curations for ClearlyDefined to process. In this case, we use an **Azure Storage Queue** called **curations**, which is kept in the same **Azure Storage Account**.

### DEFINITION_STORE_PROVIDER

We use multiple services to store definition information.

If you look at the value of this environmental variable, you will see that it is **"dispatch+azure+mongoTrimmed"**

**dispatch** indicates that we use multiple memory stores - we need to dispatch requests to both of them.

**azure** indicates that we store definitions in **Azure Blob Storage** in the enviroments **Azure Storage Account**.

**mongoTrimmed** indicates that we store definitions in a Mongo collection as well, in this case in the **definitions-trimmed** collection in the **clearlydefined** database in the environments Azure Cosmos DB account.

Mongo store is mainly used for search. Azure blob storage is our primary store for definitions.

### DEFINITION_MONGO_TRIMMED_COLLECTION_NAME

This is the Mongo collection which stores definition without file information, in this case the **definitions-trimmed** collection in the **clearlydefined** database in the environments Azure Cosmos DB account.

### DEFINITION_MONGO_COLLECTION_NAME

This was the Mongo collection which stores the entire definition information in paged format, in this case the **definitions-paged** collection in the **clearlydefined** database in the Azure Cosmos DB account.  To store definition information in its entirety, use **mongo** in DEFINITION_STORE_PROVIDER (e.g. **"dispatch+azure+mongo"**) and use this variable to specify the collection for storage.

### DEFINITION_MONGO_CONNECTION_STRING

This is the string we use to connect to the **clearlydefined** Mongo DB in the enviroments Azure Cosmos DB account.

### DEFINITION_UPGRADE_PROVIDER
This is a string value that specifies how the service handles the definition when its schema version becomes stale.

**Valid values**: `versionCheck`, `upgradeQueue`
**Default**: `versionCheck`

- `versionCheck`: If this option is selected then the service will check the schema version and recompute the definition on-the-fly if it becomes stale.
- `upgradeQueue`: If this option is selected then service will return the existing definition, and if the schema has changed, the service will queue a recompute operation. The updated definition will be returned in subsequent requests once the recomputation is completed.

### DEFINITION_UPGRADE_QUEUE_PROVIDER
This string value determines which queuing implementation will be used to queue upgrades (recomputes).

**Valid values**: `memory`, `azure`
**Default**: `memory`

### DEFINITION_UPGRADE_QUEUE_CONNECTION_STRING
This is a field for the connection string to the Azure Storage Queue. If no value is provided, the connection information from `HARVEST_AZBLOB_CONNECTION_STRING` will be used.

### DEFINITION_UPGRADE_QUEUE_NAME
This string value specifies the name of the upgrade (recompute) queue. **Default**: `definitions-upgrade`

###  DEFINITION_UPGRADE_DEQUEUE_BATCH_SIZE
This string value defines the number of messages that will be dequeued at once from the upgrade (recompute) queue. **Default**: `16`

### DOCKER

The Docker environmental variables define what container image is used for the Crawler, as well as what registry that image is kept in, and authentication info for the registry.

### DOCKER_ENABLE_CI

This environmental variable is used by the App Service. When this is set to "true", anytime a new new version of the Docker image is pushed to the registry, the app service will automatically re-deploy.

When this setting is enabled, the App Service adds a **Container registry webhook** to your Azure resource group.
In the case of the ClearlyDefined website, this is the **webappclearlydefineddev** container registry webhook.
When a new version of the **clearlydefined/service** Docker image is pushed to the **clearlydefineddev2** Azure Container registry, the **webappclearlydefinedapidev** webhook will POST to a /docker/hook on the **clearlydefined-api-dev** App Service, which will trigger a re-deploy of the service.

[More information about enabling Docker CI in an Azure App Service](https://docs.microsoft.com/en-us/azure/app-service/deploy-ci-cd-custom-container?tabs=acr&pivots=container-linux#4-enable-cicd)

### HARVEST_AZBLOB_CONTAINER_NAME

This is the blob container where we store information that we harvest about components.
development **develop** blob in the **clearlydefineddev** Azure Storage Account.
production **production** blob in the **clearlydefinedprod** Azure Storage Account.

### HARVEST_AZBLOB_CONNECTION_STRING

This is the string we use to connect to the Azure Storage Account.

### HARVEST_CACHE_TTL_IN_SECONDS

This is the TTL (in seconds) for harvest-tracking cache entries. It prevents duplicate harvests for coordinates that are already queued or currently being processed.
Default **86400** (24 hours). If unset or invalid (non-numeric, zero, or negative), the default is applied.
Use a smaller value in dev or local environments to allow quicker retries for failed components.

### HARVEST_STORE_PROVIDER

This indicates where we store our Harvest data, which in this environment is in Azure

development **develop** blob in the **clearlydefineddev** Azure Storage Account.
production **production** blob in the **clearlydefinedprod** Azure Storage Account.

### HARVEST_QUEUE_PROVIDER

This indicates what we use to queue up components to be harvested, in dev Azure Storage Queue in the Azure Storage Account.

### HARVEST_QUEUE_PREFIX**

This is the prefix we use for queues that we use for harvesting.

For example, in the dev api we use `cdcrawlerdev` as the prefix for the queues we use for harvesting. This means that the queues we use for harvesting in the dev environment are:
* cdcrawlerdev-later
* cdcrawlerdev-normal
* cdcrawlerdev-soon
* cdcrawlerdev-immediate

Important to ensure that any other instances of production crawlers that use the same storage account use a different prefix for their queues.

### HARVEST_THROTTLER_PROVIDER

This indicates the provider used to throttle harvest requests (extensible).

**Valid values**: `filter` (additional providers may be added in the future)
**Default**: `filter` (uses ListBasedFilter)

### HARVEST_THROTTLER_BLACKLIST

Defines a blacklist of coordinates that must not be harvested in the `filter` (ListBasedFilter).

**Format**: JSON array string of coordinate paths (for example: `["git/github/org/name", "npm/npmjs/-/lodash"]`)
**Default**: `""` (empty string results in an empty blacklist; invalid JSON or non-array values are ignored)

### HARVESTER_PROVIDER

This indicates what type of service we use for harvesting, in this case it's **crawlerQueue**, which corresponds with the [crawlerQueue harvest provider](https://github.com/clearlydefined/service/blob/master/providers/harvest/crawlerQueue.js)

### LOG_NODE_HEAPSTATS

This is an optional flag to `enable` logging of Node's `v8` module's memory usage data using the `getHeapSpaceStatistics` and `getHeapStatistics()` functions.

Value is either `true` or `false`
> Note: if this env var is not present, it equates to `false`
> example:
> `LOG_NODE_HEAPSTATS` = `true`

- [Node.js v8 engine docs - getHeapSpaceStatistics()](https://nodejs.org/docs/v22.12.0/api/v8.html#v8getheapspacestatistics)

- [Node.js v8 engine docs - getHeapStatistics()](https://nodejs.org/docs/v22.12.0/api/v8.html#v8getheapstatistics)

### LOG_NODE_HEAPSTATS_INTERVAL_MS

This is an optional environment variable that sets the interval to log heap statistics (When enabled).

Value is a number in `ms` (`milliseconds`).
> NOTE: The default value is `30000` ms (`30` seconds)
> example:
> `LOG_NODE_HEAPSTATS_INTERVAL_MS` = `10000`

### MULTIVERSION_CURATION_FF

This is a feature flag that indicates whether the [Multi-version curation feature](https://github.com/clearlydefined/service/pull/810) is active.

### NODE_ENV

This environmental variable is [used by the Express framework to indicate what environment the Express application is running in](https://stackoverflow.com/questions/16978256/what-is-node-env-and-how-to-use-it-in-express#:~:text=NODE_ENV%20is%20an%20environment%20variable%20made%20popular%20by,environment%20is%20a%20production%20or%20a%20development%20environment.)

### RATE_LIMIT_MAX

The ClearlyDefined Service uses the [Express Rate Limit](https://www.npmjs.com/package/express-rate-limit) npm library to limit repeated requests to its public API.

In this case, we limit requests to the API from one IP to **500** per **RATE_LIMIT_WINDOW**

### RATE_LIMIT_WINDOW

This is the time window we apply the **RATE_LIMIT_MAX** to. This is set to **300** milliseconds (or 0.3 seconds).

When we [use this value in the code](https://github.com/clearlydefined/service/blob/67c2c4b16e6313584b7678b9a77d28331ec0c5ba/app.js#L123), we multiply it by 1000, making it 300,000 milliseconds (or 300 seconds).

So, one IP address can only call the ClearlyDefined API 500 times every 300 seconds.

### BATCH_RATE_LIMIT_MAX

Defines the maximum number of requests allowed from a single IP to the batch endpoints within the batch rate limit window.

### BATCH_RATE_LIMIT_WINDOW

Defines the time window (in seconds) used to apply `BATCH_RATE_LIMIT_MAX` for batch endpoints. This value is multiplied by 1000 internally to convert to milliseconds (same as `RATE_LIMIT_WINDOW`)

### SEARCH_PROVIDER

We use [Azure Cognitive Search](https://docs.microsoft.com/en-us/azure/search/search-what-is-azure-search) to power ClearlyDefined's Search functionality, in this case this is indicated with the string "azure".

### SEARCH_AZURE_SERVICE

The name of this environment's Azure Cognitive Search service.

### SEARCH_AZURE_API_KEY

This is the API key we use to connect to the Azure Cognitive Search.

### SERVICE_ENDPOINT

This is the URL used to access the ClearlyDefined Service,
dev: https://dev-api.clearlydefined.io.
prod: https://dev-api.clearlydefined.io.

The DNS for dev-api.clearlydefined.io lives in our Cloudflare account.

### TEMPDIR

This is the location where temporary files are stored in the crawler.
In deployment, it is the crawlerdev-file-share in the Azure Storage Account.
The mount path is configured in the cdcrawler-dev App Service.

### WEBHOOK_CRAWLER_SECRET

This is what the Crawler uses to authenticate to the ClearlyDefined Service API.

### WEBHOOK_GITHUB_SECRET

This is the token the [webhook routes](https://github.com/clearlydefined/service/blob/master/routes/webhook.js) use to authenticate to the GitHub API.

### WEBSITE_ENDPOINT

This is the url for the front end UI of ClearlyDefined, also known as the ClearlyDefined website,
dev: `https://dev.clearlydefined.io`
production `https://clearlydefined.io`

### WEBSITE_HTTPLOGGING_RETENTION_DAYS

This does not appear to be used anywhere in the Service. It may be able to be removed.

### WEBSITES_ENABLE_APP_SERVICE_STORAGE

This does not appear to be used anywhere in the Service. It may be able to be removed.
