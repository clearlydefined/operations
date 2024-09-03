# Infrastructure Overview

This is accurate as of March 2021.

This is intended to serve as an overview of the ClearlyDefined infrastructure. This is being composed both as a reference and also as an aid when we capture our infrastructure in a provisioning management tool.

ClearlyDefined runs in Microsoft Azure. Here is a breakdown of the resources and how they connect.

## Subscription

[An Azure subscription is a grouping of Azure Services](https://docs.microsoft.com/en-us/azure/guides/developer/azure-developer-guide#manage-your-subscriptions).

The Azure subscription we use is called, expectedly, **ClearlyDefined**.

A subscription has many resource groups.

## Resource Groups

[A resource group is a group of individual Azure services (also known as resources)](https://docs.microsoft.com/en-us/azure/guides/developer/azure-developer-guide#resource-groups).

There are multiple resource groups within the ClearlyDefined Subscription, but the main ones are:

* clearlydefined-dev
* clearlydefined-prod
* clearlydefined-prod-europe

### clearlydefined-dev

This resource group groups the resources used for the [ClearlyDefined dev environment](https://dev.clearlydefined.io/).

### clearlydefined-prod

This resource group groups the resources used for the [main ClearlyDefined prod environment](https://clearlydefined.io/).

### clearlydefined-prod-europe

This resource group groups the resources for Clearly Defined infrastructure that runs in Europe.

Let's start off by taking a closer look at the **clearlydefined-dev** resource group.

## ClearlyDefined Dev Resource Group

### Overview

ClearlyDefined is constructed as three services - the website, the service, and the crawler.

**Website**
* [Repo](https://github.com/clearlydefined/website)
* The website is the front end of ClearlyDefined. It is a React application and mainly serves as a UI to interact with the ClearlyDefined service API.

**Service**
* [Repo](https://github.com/clearlydefined/service)
* The service is the back end API for ClearlyDefined. It is written in Node JS.

**Crawler**
* [Repo](https://github.com/clearlydefined/crawler)
* The crawler is what "crawls" over package managers, github repos, etc., queues up harvests of that data, and runs tools on the component or repo to gather licensing information.
* The tools we run include clearlydefined itself, [scancode](https://github.com/nexB/scancode-toolkit), and [licensee](https://github.com/licensee/licensee).

### App Service Plan

[An app service plan defines a set of compute resources for a web app to run on](https://docs.microsoft.com/en-us/azure/app-service/overview-hosting-plans)

An App Service Plan has many App Services.

The App Services within the App Service plan run on compute resources as defined by the plan. 

The App Service plan for the ClearlyDefined dev environment is called **clearlydefined-dev**.

### App Services

An [App Service](https://docs.microsoft.com/en-us/azure/app-service/overview) is a way of hosting web applications, REST APIs, and mobile back ends in Azure.

Each ClearlyDefined service (website, service, crawler) is run as an app service.

App Services in clearlydefined-dev:
* cdcrawler-dev (the crawler)
* clearlydefined-api-dev (the service/backend api)
* clearlydefined-dev (the website/front end UI)

Let's take a closer look at **clearlydefined-dev** - which runs the ClearlyDefined website/front end UI

### clearlydefined-dev App Service

An app service has a URL associated with it. The url associated with this one is https://clearlydefined-dev.azurewebsites.net

**DNS**

The DNS record for dev.clearlydefined.io is kept in Cloudflare. It directs any requests to dev.clearlydefine.io to https://clearlydefined-dev.azurewebsites.net.

Often, you can find out a lot of information about the App Service by looking at the Configuration in the Azure portal.

App Services allow you to run the app from a custom Docker image.

**Docker Image**

The Docker image used for the ClearlyDefined website is **clearlydefined/website**. This Docker image is kept in an Azure container registry.

**Azure Container Registry**

The Azure Container registry we use in the ClearlyDefined dev environment) is called **clearlydefineddev2**.

**Configuration**

A good way to learn more about an app service is to look at the configuration (if you are looking at the app service in Azure portal, it's under the "Settings" heading in the left hand menu). These are exposed as environmental variables for access by the application at runtime.

For the clearlydefined-dev App Service, these environmental variables include:

* DOCKER_CUSTOM_IMAGE_NAME
* DOCKER_ENABLE_CI
* DOCKER_REGISTRY_SERVER_PASSWORD
* DOCKER_REGISTRY_SERVER_URL
* DOCKER_REGISTRY_SERVER_USERNAME
* REACT_APP_SERVER
* WEBSITE_HTTPLOGGING_RETENTION_DAYS
* WEBSITES_ENABLE_APP_SERVICE_STORAGE

As you can see, most of them are related to the container image and registry.

**DOCKER_ENABLE_CI**:

This environmental variable is used by the App Service. When this is set to "true", anytime a new new version of the Docker image is pushed to the registry, the app service will automatically re-deploy.

When this setting is enabled, the App Service adds a **Container registry webhook** to your Azure resource group. In the case of the ClearlyDefined website, this is the **webappclearlydefineddev** container registry webhook.  When a new version of the **clearlydefined/website** Docker image is pushed to the **clearlydefineddev2** Azure Container registry, the **webappclearlydefineddev** webhook will POST to a /docker/hook on the **clearlydefined-dev** App Service, which will trigger a re-deploy of the service.

[More information about enabling Docker CI in an Azure App Service](https://docs.microsoft.com/en-us/azure/app-service/deploy-ci-cd-custom-container?tabs=acr&pivots=container-linux#4-enable-cicd)


The clearlydefined-dev App Service is pretty straightforward. Now let's look at a slighty more complicated one - **cdcrawler-dev**.

### cdcrawler-dev App Service

This App Service is where the Clearly Defined crawler lives for the Clearly Defined dev environment (note - the production crawler lives in a few more places than an Azure app, we'll discuss that later).

The URL associated with this App Service is https://cdcrawler-dev.azurewebsites.net.

This App Service also runs from a custom Docker image.

**Docker Image**

The Docker image used for the ClearlyDefined crawler is **clearlydefined/crawler**

**Azure Container Registry**

This Docker image also lives in the **clearlydefineddev2** Azure Container Registry.

**Configuration**

The environmental variables for the cdcrawler-dev App Service include:

* CRAWLER_AZBLOB_CONNECTION_STRING
* CRAWLER_AZBLOB_CONTAINER_NAME
* CRAWLER_DEADLETTER_PROVIDER
* CRAWLER_GITHUB_TOKEN
* CRAWLER_HOST
* CRAWLER_INSIGHTS_KEY
* CRAWLER_NAME
* CRAWLER_QUEUE_AZURE_CONNECTION_STRING
* CRAWLER_QUEUE_PREFIX
* CRAWLER_QUEUE_PROVIDER
* CRAWLER_SERVICE_AUTH_TOKEN
* CRAWLER_SERVICE_URL
* CRAWLER_STORE_PROVIDER
* CRAWLER_WEBHOOK_TOKEN
* CRAWLER_WEBHOOK_URL
* DOCKER_CUSTOM_IMAGE_NAME
* DOCKER_ENABLE_CI
* DOCKER_REGISTRY_SERVER_PASSWORD
* HARVEST_AZBLOB_CONNECTION_STRING
* HARVEST_AZBLOB_CONTAINER_NAME
* WEBSITE_HTTPLOGGING_RETENTION_DAYS
* WEBSITES_ENABLE_APP_SERVICE_STORAGE

That's a lot! Let's break these down, several of them are how the crawler connects to other Azure services.

**CRAWLER_AZBLOB**

These environmental variables refer to an [Azure Storage Blob](https://docs.microsoft.com/en-us/azure/storage/blobs/). Blobs are good places to store unstructured data.

The Azure Storage Blob used in this context is called **develop**. This is where the results of the crawler are stored.

Azure Blobs are part of Azure Storage Accounts. An Azure Storage Account has many blobs (and also queues and tables).

**Azure Storage Account**

The Azure Storage account where we keep this (and other) blobs is clearlydefineddev. 

**CRAWLER_DEADLETTER_PROVIDER**

When the crawler tries to process some request more than N times (possibly 5) and fails, it puts it in the deadletter box. Most often its a request for a component that no longer (or never did) exists. 

In this case, the CRAWLER_DEADLETTER_PROVIDER value is **cd(azblob)**. 

Deadletter documents are also stored in the same blob as CRAWLER_AZBLOB. There is a "deadletter" folder within the **develop** blob.

**CRAWLER_GITHUB_TOKEN**

The crawler makes extensive use of the GitHub API. This is an API token that allows it to do this. 

**CRAWLER_HOST**

This is used to identify a group of crawler deployments. 

Note that we only use this in the development environment, not in the production environment.

**CRAWLER_INSIGHTS_KEY**

We use [Azure Application Insights](https://docs.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview) to monitor the crawler application. This requires a key and this is where it is kept.

**CRAWLER_NAME**

This is a name to refer to the crawler with. Note that we set it in the App Service in the development environment and in [the Docker file](https://github.com/clearlydefined/crawler/blob/32a0d6b59edfda5d3226c50680e4a8338af395cd/Dockerfile) for the Prod environment.

**CRAWLER_QUEUE**

The crawler does not harvest repos or package repositories immediately when they are found. It queues them up to be harvested, then takes items off that queue and harvests them in a timely fashion. This is to avoid overloading our infrastructure with too many harvests at once.

We use an [Azure Storage Queue](https://docs.microsoft.com/en-us/azure/storage/queues/storage-queues-introduction) (which is kept within the same Azure Storage Account as the blobs used by this environment)

**CRAWLER_QUEUE_AZURE_CONNECTION_STRING**

This is an optional variable that's used if you want to have your queues in a different Azure account from the results azblobs. Intended to be used if you are hosting the crawler yourself and submitting results to CD's Azure blobs.
So that your queue data is segregated from the CD Azure account. For security and compliance regulations.

**CRAWLER_SERVICE_AUTH_TOKEN**

This token is used by the ClearlyDefined service to send requests to the ClearlyDefined crawler.

**CRAWLER_SERVICE_URL**

This is the url of the App Service running the crawler.

It's unclear where this environmental variable is used within the crawler.

**CRAWLER_STORE_PROVIDER**

We use multiple services to store the crawler's harvests of license information.

If you look at the value of this environmental variable, you will see that it is **"cdDispatch+cd(azblob)+webhook"**

These are used by [the crawler configuration code](https://github.com/clearlydefined/crawler/blob/32a0d6b59edfda5d3226c50680e4a8338af395cd/config/cdConfig.js).

Let's break this down

**cd(azblob)**

This indicates that we are storing the content of the harvests (the license information about the component) in an Azure Storage Blob. In this case, we are using the the same blob as we use for the CRAWLER_AZBLOB environmental variables.

**webhook**

This refers to a webhook on the ClearlyDefined service (the backend API). This is what the crawler calls when it completes a harvest. The ClearlyDefined service will then take action on the information in the harvest.

**cdDispatch**

We use a few different "dispatchers" - which are used to fetch GitHub repos or Package Repositories to harvest the license data from. We use one for GitHub repos, one for npm packages, one for crates, etc. 

cdDispatch refers to the generic base file that handles calls to the various dispatchers.

**CRAWLER_WEBHOOK**

These environmental variables are used to define the url for the ClearlyDefined service's webhook URL (This is what the crawler calls after it completes a harvest).

In this case, the webhook url is "https://dev-api.clearlydefined.io/webhook".

The token is what we use to authenticate to the API (so that only the crawler can call that part of the ClearlyDefined Service api)

**DOCKER**

The Docker environmental variables define what container image is used for the Crawler, as well as what registry that image is kept in, and authentication info for the registry.

**DOCKER_ENABLE_CI**:

This environmental variable is used by the App Service. When this is set to "true", anytime a new new version of the Docker image is pushed to the registry, the app service will automatically re-deploy.

When this setting is enabled, the App Service adds a **Container registry webhook** to your Azure resource group. In the case of the crawler, this is the **webappcdcrawlerdev** container registry webhook.  When a new version of the **clearlydefined/crawler** Docker image is pushed to the **clearlydefineddev2** Azure Container registry, the **webappcrawlerdev** webhook will POST to a /docker/hook on the **cdcrawler-dev** App Service, which will trigger a re-deploy of the service.

[More information about enabling Docker CI in an Azure App Service](https://docs.microsoft.com/en-us/azure/app-service/deploy-ci-cd-custom-container?tabs=acr&pivots=container-linux#4-enable-cicd)

**HARVEST_AZBLOB**

These values are identical to the ones stored for the CRAWLER_AZBLOB environmental variables. It's not clear why these are separate, the do not appear to be used anywhere in the crawler. They may be able to be removed.

**WEBSITE_HTTPLOGGING_RETENTION_DAYS**

This does not appear to be used anywhere in the Crawler. It may be able to be removed.

**WEBSITES_ENABLE_APP_SERVICE_STORAGE**

This also does not appear to be used anywhere in the Crawler. It may be able to be removed.

And that concludes our discussion of **cdcrawler-dev**.

Now let's move onto the most complex App Service - **clearlydefined-api-dev**

### clearlydefined-api-dev

This App Service is where the ClearlyDefined Service (the backend API) lives.

The URL associated with this App Service is https://clearlydefined-api-dev.azurewebsites.net.

This App Service also runs from a custom Docker image.

**Docker Image**

The Docker image used for the ClearlyDefined crawler is **clearlydefined/service**

**Azure Container Registry**

This Docker image also lives in the **clearlydefineddev2** Azure Container Registry.

**Configuration**

The environmental variables for the clearlydefined-api-dev App Service include:

* APPINSIGHTS_CRAWLER_APIKEY
* APPINSIGHTS_CRAWLER_APPLICATIONID
* APPINSIGHTS_INSTRUMENTATIONKEY
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
* DOCKER_CUSTOM_IMAGE_NAME
* DOCKER_ENABLE_CI
* DOCKER_REGISTRY_SERVER_PASSWORD
* DOCKER_REGISTRY_SERVER_URL
* DOCKER_REGISTRY_SERVER_USNERMAE
* HARVEST_AZBLOB_CONNECTION_STRING
* HARVEST_AZBLOB_CONTAINER_NAME
* HARVEST_QUEUE_PREFIX
* HARVEST_QUEUE_PROVIDER
* HARVESTER_PROVIDER
* NODE_ENV
* RATE_LIMIT_MAX
* RATE_LIMIT_WINDOW
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

**APPINSIGHTS_CRAWLER**

These are used to get information from the Crawler's App Insights setup when the Service's /status API call is used (it's used by the website to display a status page). The App Insight's instance is called cdcrawler-dev

**APPINSIGHTS_INSTRUMENTATIONKEY**

This is used by a dependency called Winston. [Winston](https://github.com/winstonjs/winston) is a Node JS logging library. We use an additional dependency, [winston-azure-application-insights](https://www.npmjs.com/package/winston-azure-application-insights) to broadcast the logs to Azure Application Insights. This requires an instrumentation key for our Azure Application Insights set up.

**APPINSIGHTS_SERVICE**

These environmental variables are used to by the Service to query the **clearlydefined-api-dev** Azure Application Insights instance. This is queried when the Service's /status API call is used.

**ATTACHMENT_STORE_PROVIDER**

The value for this variable is "azure". This indicates that attachment data is stored in Azure, in this case in the "develop" blob container in the **clearlydefineddev** Azure Storage account.

**Harvested data** is the data output from our the various scanning tools (scancode, licensee, ClearlyDefined). **Attachments** are the "interesting files" we find and want to archive (either for durability or for quick access for example in producing a notices file). 

**AUTH_CURATION_TEAM**

This is a team in the ClearlyDefined GitHub Organization. https://github.com/orgs/clearlydefined/teams/curation-dev. This is the team that has permission to merge curations in the curations GitHub repo (which is defined in the CURATION_GITHUB_REPO environment variable) and sync them with the ClearlyDefined service.

**AUTH_GITHUB_CLIENT**

ClearlyDefined uses a [GitHub OAuth App](https://docs.github.com/en/developers/apps/authorizing-oauth-apps) to authenticate users to the Service. 

These define the client id and client secret for the OAuth App.

**AUTH_HARVEST_TEAM**

Although this does correlate to a [team in the ClearlyDefined GitHub organization](https://github.com/orgs/clearlydefined/teams/harvest-dev), it is not clear what it is used for in the Service.

**CACHING_PROVIDER**

The Service caches definitions in a Redis cache. The cached definitions are replaced whenever a definition is updated.

This cache is an [Azure Cache for Redis](https://docs.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview) called **clearlydefined-dev**.

**CACHING_REDIS_API_KEY**

This is the key for the **clearlydefined-dev** Azure Cache for Redis.

**CACHING_REDIS_SERVICE**

This is the URL for the **clearlydefined-dev** Azure Cache for Redis.

**CRAWLER_API_AUTH_TOKEN**

This is a token used to authenticate the Service to send requests to the ClearlyDefined Crawler. It is the same as the **CRAWLER_SERVICE_AUTH_TOKEN** in the **cdcrawler-dev** App Service configuration.

**CRAWLER_API_URL**

This is the URL for the **cdcrawler-dev** App Service.

**CURATION_GITHUB_REPO**

This is the GitHub repo we use to store curations, in this case [clearlydefined/curated-data-dev](https://github.com/clearlydefined/curated-data-dev).

**CURATION_GITHUB_OWNER**

This is the owner of the GitHub repo used to store curations, in this case the [clearlydefined GitHub org](https://github.com/clearlydefined).

**CURATION_GITHUB_BRANCH**

This is the branch ClearlyDefined pulls curation information from, in this case the branch called master.

**CURATION_GITHUB_TOKEN**

When it comes to curations, the ClearlyDefined service makes extensive use of the GitHub API. This is an API token that allows it to do this. 

**CURATION_STORE_PROVIDER**

This is what service we use to store information about curations, in this case **mongo**.

**CURATION_MONGO_COLLECTION_NAME**

While we store the curations in GitHub, we store information about the Curations in a MongoDB collection, called **curations-20190227**. 

The **curations-20190227** lives in the **clearlydefined** Mongo Database, which lives in the **clearlydefined-dev** Azure Cosmos DB account.

[Azure Cosmos DB](https://docs.microsoft.com/en-us/azure/cosmos-db/introduction) is a managed NoSQL database service in Azure.

**CURATION_MONGO_CONNECTION_STRING**

This is the string we use to connect to the **clearlydefined** Mongo Database in the **clearlydefined-dev** Azure Cosmos DB account.

**CURATION_PROVIDER**

This is the provider we use to store curations. In this case, it is **github**

**CURATION_QUEUE_PROVIDER**

The **Curation Queue** is where we queue up curations for ClearlyDefined to process. In this case, we use an **Azure Storage Queue** called **curations**, which is kept in the same **clearlydefineddev** **Azure Storage Account**.

**DEFINITION_STORE_PROVIDER**

We use multiple services to store definition information.

If you look at the value of this environmental variable, you will see that it is **"dispatch+azure+mongoTrimmed"**

**dispatch** indicates that we use multiple memory stores - we need to dispatch requests to both of them.

**azure** indicates that we store definitions in **Azure Blob Storage** in the **clearlydefineddev** **Azure Storage Account**.

**mongoTrimmed** indicates that we store definitions in a Mongo collection as well, in this case in the **definitions-trimmed** collection in the **clearlydefined** database in the **clearlydefined-dev** Azure Cosmos DB account.

I once was making a change to the definition in the mongo definition store, but not in the azure store. The change didn't seem to be taking affect, so I asked Jeff McAffer (original ClearlyDefined engineer) about it. This was his response:

"the definitions come from blob storage. You could completely delete the cosmos db and ClearlyDefined would continue to work (though search would be affected).

The key takeaway here is that blob is the golden store. Everything else should be derived from that."

**DEFINITION_MONGO_TRIMMED_COLLECTION_NAME**

This is the Mongo collection which stores definition without file information, in this case the **definitions-trimmed** collection in the **clearlydefined** database in the **clearlydefined-dev** Azure Cosmos DB account.

**DEFINITION_MONGO_COLLECTION_NAME**

This was the Mongo collection which stores the entire definition information in paged format, in this case the **definitions-paged** collection in the **clearlydefined** database in the **clearlydefined-dev** Azure Cosmos DB account.  To store definition information in its entirety, use **mongo** in DEFINITION_STORE_PROVIDER (e.g. **"dispatch+azure+mongo"**) and use this variable to specify the collection for storage.

**DEFINITION_MONGO_CONNECTION_STRING**

This is the string we use to connect to the **clearlydefined** Mongo DB in the **clearlydefined-dev** Azure Cosmos DB account.

**DOCKER**

The Docker environmental variables define what container image is used for the Crawler, as well as what registry that image is kept in, and authentication info for the registry.

**DOCKER_ENABLE_CI**:

This environmental variable is used by the App Service. When this is set to "true", anytime a new new version of the Docker image is pushed to the registry, the app service will automatically re-deploy.

When this setting is enabled, the App Service adds a **Container registry webhook** to your Azure resource group. In the case of the ClearlyDefined website, this is the **webappclearlydefineddev** container registry webhook.  When a new version of the **clearlydefined/service** Docker image is pushed to the **clearlydefineddev2** Azure Container registry, the **webappclearlydefinedapidev** webhook will POST to a /docker/hook on the **clearlydefined-api-dev** App Service, which will trigger a re-deploy of the service.

[More information about enabling Docker CI in an Azure App Service](https://docs.microsoft.com/en-us/azure/app-service/deploy-ci-cd-custom-container?tabs=acr&pivots=container-linux#4-enable-cicd)

**HARVEST_AZBLOB_CONTAINER_NAME**

This is the blob container where we store information that we harvest about components. In this case, it is the **develop** blob in the **clearlydefineddev** Azure Storage Account.

**HARVEST_AZBLOB_CONNECTION_STRING**

This is the string we use to connect to the **clearlydefineddev** Azure Storage Account.

**HARVEST_STORE_PROVIDER**

This indicates where we store our Harvest data, which in this environment is in Azure (in the **develop** blob in the **clearlydefineddev** Azure Storage Account.

**HARVEST_QUEUE_PROVIDER**

This indicates what we use to queue up components to be harvested, in this case an Azure Storage Queue in the **clearlydefinedev** Azure Storage Account.

**HARVEST_QUEUE_PREFIX**

This is the prefix we use for queues that we use for harvesting. In this case, it is **cdcrawlerdev** and matches these queues:

* cdcrawlerdev-later
* cdcrawlerdev-normal
* cdcrawlerdev-soon

**HARVESTER_PROVIDER**

This indicates what type of service we use for harvesting, in this case it's **crawlerQueue**, which corresponds with the [crawlerQueue harvest provider](https://github.com/clearlydefined/service/blob/master/providers/harvest/crawlerQueue.js)

**MULTIVERSION_CURATION_FF**

This is a feature flag that indicates whether the [Multi-version curation feature](https://github.com/clearlydefined/service/pull/810) is active.

**NODE_ENV**

This environmental variable is [used by the Express framework to indicate what environment the Express application is running in](https://stackoverflow.com/questions/16978256/what-is-node-env-and-how-to-use-it-in-express#:~:text=NODE_ENV%20is%20an%20environment%20variable%20made%20popular%20by,environment%20is%20a%20production%20or%20a%20development%20environment.)

**RATE_LIMIT_MAX**

The ClearlyDefined Service uses the [Express Rate Limit](https://www.npmjs.com/package/express-rate-limit) npm library to limit repeated requests to its public API.

In this case, we limit requests to the API from one IP to **500** per **RATE_LIMIT_WINDOW**

**RATE_LIMIT_WINDOW**

This is the time window we apply the **RATE_LIMIT_MAX** to. This is set to **300** milliseconds (or 0.3 seconds).

When we [use this value in the code](https://github.com/clearlydefined/service/blob/67c2c4b16e6313584b7678b9a77d28331ec0c5ba/app.js#L123), we multiply it by 1000, making it 300,000 milliseconds (or 300 seconds).

So, one IP address can only call the ClearlyDefined API 500 times every 300 seconds.

**SEARCH_PROVIDER**

We use [Azure Cognitive Search](https://docs.microsoft.com/en-us/azure/search/search-what-is-azure-search) to power ClearlyDefined's Search functionality, in this case this is indicated with the string "azure".

**SEARCH_AZURE_SERVICE**

The name of this environment's Azure Cognitive Search service is **clearlydefined-dev**.

**SEARCH_AZURE_API_KEY**

This is the API key we use to connect to the **clearlydefined-dev** Azure Cognitive Search.

**SERVICE_ENDPOINT**

This is the URL used to access the ClearlyDefined Service, in this case it is https://dev-api.clearlydefined.io.

The DNS for dev-api.clearlydefined.io lives in our Cloudflare account.

**TEMPDIR**

This is the location where temporary files are stored in the crawler.  In deployment, it is the crawlerdev-file-share in the **clearlydefineddev** Azure Storage Account.  The mount path is configured in the cdcrawler-dev App Service.

**WEBHOOK_CRAWLER_SECRET**

This is what the Crawler uses to authenticate to the ClearlyDefined Service API.

**WEBHOOK_GITHUB_SECRET**

This is the token the [webhook routes](https://github.com/clearlydefined/service/blob/master/routes/webhook.js) use to authenticate to the GitHub API.

**WEBSITE_ENDPOINT**

This is the url for the front end UI of ClearlyDefined, also known as the ClearlyDefined website, which in this case is "https://dev.clearlydefined.io". The DNS for this url lives in our Cloudflare account.

**WEBSITE_HTTPLOGGING_RETENTION_DAYS**

This does not appear to be used anywhere in the Service. It may be able to be removed.

**WEBSITES_ENABLE_APP_SERVICE_STORAGE**

This does not appear to be used anywhere in the Service. It may be able to be removed.

And that concludes our discussion of the **clearlydefined-api-dev** App Service.

### Additional Azure Services

**Key Vault**

We store secrets related to several of ClearlyDefined's accounts outside of Azure in the **clearlydefined-dev** key vault.

[More info on Azure Key Vaults](https://docs.microsoft.com/en-us/azure/key-vault/)

**Logic Apps**

[More info on Azure Logic Apps](https://docs.microsoft.com/en-us/azure/logic-apps/)

We use the **curation-dev-webhook** Logic App to put messages on the **curations** Azure Storage Queue in the **clearlydefineddev** Azure Storage Account.

Here's the workflow:

* An new pull request is opened in the [curated-data-dev repo](https://github.com/clearlydefined/curated-data-dev)
* When the pull request is opened, a GitHub webhook is called
* That webhook sends a POST to the **curation-dev-webhook** Logic App
* The Logic App places the body of that request on the **curations** queue
* Then the Logic App returns a 200 response

### Unaccounted for infra

**API connection**

We have an API connection called **azurequeues**.

API connections are used to connect Logic apps to SaaS services.

When I look at **azurequeues** in the Azure Portal and click on "Edit API connection", it appears to be connected to (or set up to be connected to) the **clearlydefineddev** Storage Account. However, there is no Shared Storage Key.

I cannot confirm whether **azurequeues** is currently connected to anything. It's possible it was set up as an experiment, but is not currently connected to any Logic Apps.

**Service Bus Namespace**

We have a service bus namespace called **cdcrawlerdev**.

An [Azure Service Bus Namespace](https://docs.microsoft.com/en-us/azure/service-bus-messaging/service-bus-create-namespace-portal) contains many Service Bus queues.

[Service Bus queues are different from Storage queues](https://docs.microsoft.com/en-us/azure/service-bus-messaging/service-bus-azure-and-service-bus-queues-compared-contrasted)

[More information about Service Bus queues, topics, and subscriptions](https://docs.microsoft.com/en-us/azure/service-bus-messaging/service-bus-queues-topics-subscriptions)

When you look at the overview page for **cdcrawlerdev** service bus, it looks like it's getting some traffic.
However, it's not clear what services are associated with this Service Bus namespace. It doesn't appear to have queues associated with it. However, I don't know how it appears to be getting some traffic without having queues associated with it.

**ClearlyContained Infra**

We have several Azure resources with names that include "clearlycontained". These include:

* clearlycontained-dev (a Virtual Machine)
* clearlycontained-dev-ip (A Public IP address)
* clearlycontained-dev-nsg (A Network Security Group)
* clearlycontained-dev497 (A Network Interface)
* clearlycontained-dev_OSDisk (A Disk)
* clearlydefined-dev-vnet (A virtual network that is associatedc with the clearlycontained-dev497 network interface)

My best guess is they were set up to test something and were never spun down. They can likely be removed, but I'd like to check with a few more people before I do so.
 
**Additional Container registry webhooks**

These are likely webhooks someone was using for testing some time ago. They can likely be removed.

* cdcrawlertest1184231
* cdcrawlertesting194720
* webappcrawlertest

## ClearlyDefined Prod Resource Group

The **clearlydefined-prod** resource group is very similar to the **clearlydefined-dev** resource group. For more information about the Azure Services and more context for how they are used (and how they relate to each other), please see the corresponding sections in the [ClearlyDefined Dev Resource Group documentation](clearlydefined-dev-resource-group).

### App Service Plan

The App Service plan for the ClearlyDefined prod environment is **clearlydefined-prod**.

### App Services

The App Services in clearlydefined-prod include:
* cdcrawler-prod (the crawler)
* clearlydefined-api-prod (the service/backend api)
* clearlydefined-prod (the website/front end UI)

**cdcrawler-prod**

This App Service is currently stopped. We don't run the production crawler instances in the ClearlyDefined Azure Subscription.

We run production instances of the crawler in three different clouds:

* Azure
* Google Cloud
* AWS

See [Crawler Contacts](./crawler-contacts.md) for more information.

### Application Insights

We have to instances of Application insights set up - one for the api (backend) and one for the crawler

* cdcrawler-prod
* clearlydefined-api-prod

### Availability tests

These are [URL ping tests](https://docs.microsoft.com/en-us/azure/azure-monitor/app/monitor-web-app-availability#create-a-url-ping-test) associated with the **clearlydefined-api-prod** Application Insights instance.

These include:
* homepage loads-clearlydefined-api-prod
* service availability-clearlydefined-api-prod
* service get definition-clearlydefined-api-prod

### Azure Cache for Redis

This is where the ClearlyDefined Service (backend/api) caches definitions.

### Azure Cosmos DB account

This is where we keep the **clearlydefined** Mongo DB for our production environment.

**Actively used collections**

* curations-20190227 - this is where we keep information about curations (this is used in the by the **clearlydefined-api-prod** App Service through the 'CURATIONS_MONGO_COLLECTION_NAME environmental variable)
* definitions-trimmed - this is where we keep information about definitions (this is also used by the **clearlydefined-api-prod** App Service through the 'DEFINITION_MONGO_TRIMMED_COLLECTION_NAME' environmental variable)

**Non-actively used collections**

* curations (this is a legacy collection that is no longer used)

### Container Registry

This is where keep container images used by these two app services:

* clearlydefined-api-prod (the service/backend api)
* clearlydefined-prod (the website/front end UI)

The image used by the production crawlers lives in [Docker Hub](https://hub.docker.com/r/clearlydefined/crawler), not Azure.

### Container Registry Webhooks

These are used by the corresponding App services to redeploy them when an updated image is pushed to the **clearlydefined-prod** container registry.

* **webappclearlydefinedapiprod** is used by the **clearlydefined-api-prod** App Service.
* **webappclearlydefinedprod** is used by the **clearlydefined-prod** App Service.

### Logic Apps

These include:
* curation-prod-webhook
* curation-sync

**curation-prod-webhook**

This is used to put messages on the **curations** Azure Storage Queue in the **clearlydefinedprod** Storage account. This is equivalent to the **curation-dev-webhook** in the ClearlyDefined Dev Resource Group.

**curation-sync**

Every hour, this Logic App makes a POST to https://api.clearlydefined.io/curations/sync, presumably to sync curations. 

TODO: This currently appears to have failed the last several times and should be investigated. ([Issue opened](https://github.com/clearlydefined/service/issues/820))

### Search Service

**clearlydefinedprod** is an instance of Azure Cognitive Search that powers ClearlyDefine's Search Service.

### Shared DashBoards

These Dashboard display metrics about ClearlyDefined services, including:
* clearlydefined-api-prod
* cdcrawler-prod

Note that the cdcrawler-prod dashboard does show some failures, exceptions, and server response times.

### Storage Account

The **clearlyydefinedprod** storage account includes both Azure blobs and Azure Storage Queues, it is set up similarly to the **clearlydefineddev** storage account in the ClearlyDefined Dev resource group.

### Traffic Manager Profiles

An [Azure Traffic Manager](https://docs.microsoft.com/en-us/azure/traffic-manager/traffic-manager-overview) is a DNS-based load balancer.

**clearlydefined-api-prod**

This traffic manager load balances activity to the **clearlydefined-api-prod** App Service (ClearlyDefined backend/api) AND the **clearlydefined-api-prod-europe** App Service. The DNS for this traffic manager is http://clearlydefined-api-prod.trafficmanager.net.

In our Cloudflare account, we direct requests to api.clearlydefined.io to http://clearlydefined-api-prod.trafficmanager.net.

**clearlydefined-prod**

This traffic manager load balances activity to the **clearlydefined-prod** App Service (Front End/UI) AND the **clearlydefined-prod-europe** App Service (which will be discussed more when we cover the ClearlyDefined Prod Europe Resource Group).

### Unaccounted for infra

**API connection**

We have an API connection called **azurequeues**.

API connections are used to connect Logic apps to SaaS services.

When I look at **azurequeues** in the Azure Portal and click on "Edit API connection", it appears to be connected to (or set up to be connected to) the **clearlydefinedprod** Storage Account. However, there is no Shared Storage Key.

I cannot confirm whether **azurequeues** is currently connected to anything. It's possible it was set up as an experiment, but is not currently connected to any Logic Apps.

**Log Analytics Workspaces**

[More information about Azure Log Analytics Workspaces](https://docs.microsoft.com/en-us/azure/azure-monitor/logs/quick-create-workspace#:~:text=%20Create%20a%20Log%20Analytics%20workspace%20in%20the,and%20region%20as%20in%20the%20deleted...%20More)

**RedisLogs**

This is connected to the clearlycontained-dev infrastructure in the **clearlydefined-dev** resource group. This can likely be removed.

**SearchIndexerLogs**

This is connected to the clearlycontained-dev infrastructure in the **clearlydefined-dev** resource group. This can likely be removed.

**Service Bus Namepace**

We have a Service Bus Namespace instance called **cdcrawlerprod** - it's not clear what it is used for, though it has received activity in the last 30 days.

## ClearlyDefined Prod Europe Resource Group

### App Service Plan

The App Service plan for the ClearlyDefined Prod Europe environment is **clearlydefined-prod-europe**.

### App Services

The App Services in **clearlydefined-prod-europe** include
* clearlydefined-api-prod-europe (the service/backend api)
* clearlydefined-prod-europe (the website/front end UI)

## Auxiliary Jobs Resource Group

These resources are all related to [Azure Functions](https://docs.microsoft.com/en-us/azure/azure-functions/functions-overview).

When you upload an Azure Function to Azure, it creates the following resources:
* Resource group - logical container for related resources - in this case, the **auxiliaryjobs** resource group
* Azure Storage Account - maintains state and other information
* Consumption Plan - defines the underlying host for the serverless function app
* Function app - provides the environment for executing the function code
* Applications Insights instance - connected to the function app, tracks usage of the serverless function

### App Service Plan

**EastUS2Plan** is an Azure Service Plan for the **auxiliary-jobs** function app

### Function App

**auxiliary-jobs** is a function app that runs the **QueuesMessageCountChecker**. The **QueuesMessageCountChecker** logs Azure Storage Queues' message counts to Application Insights so that alerts can be set up.

The code for this function lives [in this GitHub repository](https://github.com/clearlydefined/auxiliary-jobs).

### Storage Account

The **auxiliaryjobs** storage account holds two blob containers:

* azure-webjobs-hosts
* azure-webjobs-secrets

### Application Insights

The **auxiliaryjobs** Application insights instance tracks usage of the **auxiliaryjobs** function app.

## Backup Resource Group

These resources are used for taking backups of ClearlyDefined's resources.

### Data Factory

[More about Azure Data Factory](https://docs.microsoft.com/en-us/azure/data-factory/introduction)

This sets up backups for BOTH the dev and prod environments.

Click on "Author and Monitor" to see details.

When you are brought to the Azure Data Factory UI, click on "Author" (the pencil icon in the left menu).

**Pipelines**

This Data factory includes the following pipelines:

* backup-dev-definitions
* backup-dev-harvest
* backup-prod-definition
* backup-prod-harvest

**backup-dev-definitions**

Source: Azure Blob Storage - clearlydefineddev/develop-definition
Sink (Destination):  Azure Blob Storage - clearlydefineddevbackup/develop-definition

The source lives in the **clearlydefineddev** Storage Account in the **clearlydefined-dev** Resource Group.

The sink lives in the **clearlydefineddevbackup** Storage Account in the **backup** resource group.

**backup-dev-harvest**

Source: AzureBlobStorage - clearlydefineddev/develop
Sink (Destination): Azure Blob Storage - clearlydefineddevbackup/develop

The source lives in the **clearlydefineddev** Storage Account in the **clearlydefined-dev** Resource Group.

The sink lives in the **clearlydefineddevbackup** Storage Account in the **backup** resource group.

**backup-prod-definition**

Source: Azure Blob Storage - clearlydefinedprod/production-definition
Sink (Destination): Azure Blob Storage - clearlydefinedprodbackup/production-definition 

The source lives in the **clearlydefinedprod** Storage Account in the **clearlydefinedprod** Resource Group.

The sink lives in the **clearlydefinedprodbackup** Storage account in the **backup** resource group.

**backup-prod-harvest**

Source: Azure Blob Storage - clearlydefinedprod/production
Sink (Destination): Azure Blob Storage - clearlydefinedprodbackup/production

The source lives in the **clearlydefinedprod** Storage Account in the **clearlydefinedprod** Resource Group.

The sink lives in the **clearlydefinedprodbackup** Storage account in the **backup** resource group.

### Storage Accounts

**clearlydefineddevbackup**

This stores the backup Azure Blobs for the development environment.

**clearlydefinedprodbackup**

This stores the backup Azure Blobs for the production environment.

## Cloud Shell Storage West US Resource Group

This contains two Azure Storage Accounts:
* cs4100320005f7789e0
* cs4e05584a1ed97x4676xaec

TODO: Investigate what these are used for.

**cs4100320005f7789e0**

Contains one file share - **cs-jeffmendoza-clearlydefinedoutlook-onmicroso-100320005f7789e0** - it's unclear what this is used for.

**cs4e05584a1ed97x4676xaec**

Contains four file shares - it's unclear what they are used for.
* cs-clearlydefined-outlook-com-10030000a724de63
* cs-jeffmcaffer-clearlydefinedoutlook-onmicroso-1003bffda6ff8525
* cs-jeffmcaffer-outlook-com-1003bffd89b315ad
* cs-wdb-willbar-com-10033fffa701040f

## Dashboards Resource Group

This resource group just contains the API Prod Dashboard.

## Default Activity Log Alerts Resource Group

This resource group contains no resources, it can likely be removed.

## Network Watcher Resource Group

### Network Watcher

[More about Azure Network Watcher](https://docs.microsoft.com/en-us/azure/network-watcher/network-watcher-monitoring-overview)

There is one Network Watcher in this resource group, **NetworkWatcher_eastus2**. It's not clear whether this is connected to any other Azure resource, it may be able to be removed.
