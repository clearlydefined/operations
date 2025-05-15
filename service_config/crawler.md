- [Crawler](#crawler)
  - [Configuration](#configuration)
    - [CRAWLER\_AZBLOB\_CONNECTION\_STRING](#crawler_azblob_connection_string)
    - [Azure Storage Account](#azure-storage-account)
    - [CRAWLER\_AZBLOB\_CONTAINER\_NAME](#crawler_azblob_container_name)
    - [CRAWLER\_GITHUB\_TOKEN](#crawler_github_token)
    - [CRAWLER\_HOST](#crawler_host)
    - [CRAWLER\_INSIGHTS\_KEY](#crawler_insights_key)
    - [CRAWLER\_NAME](#crawler_name)
    - [CRAWLER\_QUEUE\_PREFIX](#crawler_queue_prefix)
    - [CRAWLER\_QUEUE\_PROVIDER](#crawler_queue_provider)
    - [CRAWLER\_SCANCODE\_PARALLELISM](#crawler_scancode_parallelism)
    - [CRAWLER\_SERVICE\_AUTH\_TOKEN](#crawler_service_auth_token)
    - [CRAWLER\_SERVICE\_URL](#crawler_service_url)
    - [CRAWLER\_STORE\_PROVIDER](#crawler_store_provider)
    - [CRAWLER\_WEBHOOK](#crawler_webhook)
    - [CRAWLER\_HARVESTS\_QUEUE\_VISIBILITY\_TIMEOUT\_SECONDS](#crawler_harvest_queue_visibility_timeout_seconds)
  - [Docker environmental variables](#docker-environmental-variables)
    - [DOCKER\_ENABLE\_CI](#docker_enable_ci)
    - [HARVEST\_AZBLOB](#harvest_azblob)
    - [WEBSITE\_HTTPLOGGING\_RETENTION\_DAYS](#website_httplogging_retention_days)
    - [WEBSITES\_ENABLE\_APP\_SERVICE\_STORAGE](#websites_enable_app_service_storage)

# Crawler

Clearly Defined's crawler

## Configuration

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
* CRAWLER_SCANCODE_PARALLELISM
* CRAWLER_SERVICE_AUTH_TOKEN
* CRAWLER_SERVICE_URL
* CRAWLER_STORE_PROVIDER
* CRAWLER_WEBHOOK_TOKEN
* CRAWLER_WEBHOOK_URL
* CRAWLER_HARVESTS_QUEUE_VISIBILITY_TIMEOUT_SECONDS
* DOCKER_CUSTOM_IMAGE_NAME
* DOCKER_ENABLE_CI
* DOCKER_REGISTRY_SERVER_PASSWORD
* HARVEST_AZBLOB_CONNECTION_STRING
* HARVEST_AZBLOB_CONTAINER_NAME
* WEBSITE_HTTPLOGGING_RETENTION_DAYS
* WEBSITES_ENABLE_APP_SERVICE_STORAGE

That's a lot! Let's break these down, several of them are how the crawler connects to other Azure services.

### CRAWLER_AZBLOB_CONNECTION_STRING

These environmental variables refer to an [Azure Storage Blob](https://docs.microsoft.com/en-us/azure/storage/blobs/). Blobs are good places to store unstructured data.


Azure Blobs are part of Azure Storage Accounts. An Azure Storage Account has many blobs (and also queues and tables).

### Azure Storage Account

The Azure Storage account where we keep this (and other) blobs is clearlydefineddev.

### CRAWLER_AZBLOB_CONTAINER_NAME

When the crawler tries to process some request more than N times (possibly 5) and fails, it puts it in the deadletter box. Most often its a request for a component that no longer (or never did) exists.

In this case, the CRAWLER_DEADLETTER_PROVIDER value is **cd(azblob)**.

Deadletter documents are also stored in the same blob as CRAWLER_AZBLOB. There is a "deadletter" folder within the blob.

### CRAWLER_GITHUB_TOKEN

The crawler makes extensive use of the GitHub API. This is an API token that allows it to do this.

### CRAWLER_HOST

This is used to identify a group of crawler deployments.

Note that we only use this in the development environment, not in the production environment.

### CRAWLER_INSIGHTS_KEY

We use [Azure Application Insights](https://docs.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview) to monitor the crawler application. This requires a key and this is where it is kept.

### CRAWLER_NAME

This is a name to refer to the crawler with. Note that we set it in the App Service in the development environment and in [the Docker file](https://github.com/clearlydefined/crawler/blob/32a0d6b59edfda5d3226c50680e4a8338af395cd/Dockerfile) for the Prod environment.

### CRAWLER_QUEUE_PREFIX

The crawler does not harvest repos or package repositories immediately when they are found. It queues them up to be harvested, then takes items off that queue and harvests them in a timely fashion. This is to avoid overloading our infrastructure with too many harvests at once.

We use an [Azure Storage Queue](https://docs.microsoft.com/en-us/azure/storage/queues/storage-queues-introduction) (which is kept within the same Azure Storage Account as the blobs used by this environment)

### CRAWLER_QUEUE_PROVIDER

This is an optional variable that's used if you want to have your queues in a different Azure account from the results azblobs. Intended to be used if you are hosting the crawler yourself and submitting results to CD's Azure blobs.
So that your queue data is segregated from the CD Azure account. For security and compliance regulations.

### CRAWLER_SCANCODE_PARALLELISM

This environment variable is a number of `scancode-toolkit` processes to run in parallel. `scancode-toolkit` is one of the main
tools that collect the licensing data that goes into the final definition, and increasing parallelism, if the CPU allows,
speeds up processing of individual definitions. The default value is `2`, and a good ballpark value is ~80% of total CPUs
available for crawler.

### CRAWLER_SERVICE_AUTH_TOKEN

This token is used by the ClearlyDefined service to send requests to the ClearlyDefined crawler.

### CRAWLER_SERVICE_URL

This is the url of the App Service running the crawler.

It's unclear where this environmental variable is used within the crawler.

#### CRAWLER_STORE_PROVIDER

We use multiple services to store the crawler's harvests of license information.

If you look at the value of this environmental variable, you will see that it is **"cdDispatch+cd(azblob)+webhook"**. In the production crawler Dockerfile,  it is configured as **"cdDispatch+cd(azblob)+azqueue"**.

These are used by [the crawler configuration code](https://github.com/clearlydefined/crawler/blob/32a0d6b59edfda5d3226c50680e4a8338af395cd/config/cdConfig.js).

Let's break this down

**cd(azblob)**

This indicates that we are storing the content of the harvests (the license information about the component) in an Azure Storage Blob. In this case, we are using the the same blob as we use for the CRAWLER_AZBLOB environmental variables.

**webhook**

This refers to a webhook on the ClearlyDefined service (the backend API). This is what the crawler calls when it completes a harvest. The ClearlyDefined service will then take action on the information in the harvest.

**cdDispatch**

We use a few different "dispatchers" - which are used to fetch GitHub repos or Package Repositories to harvest the license data from. We use one for GitHub repos, one for npm packages, one for crates, etc.

cdDispatch refers to the generic base file that handles calls to the various dispatchers.

**azqueue**

This refers to an Azure Storage Queue used by the crawler to notify a service upon the completion of a tool’s processing. The default queue name is `harvests`. More details on the configuration can be found in the [cdConfig.js file](https://github.com/clearlydefined/crawler/blob/32a0d6b59edfda5d3226c50680e4a8338af395cd/config/cdConfig.js#L95).

### CRAWLER_WEBHOOK

These environmental variables are used to define the url for the ClearlyDefined service's webhook URL (This is what the crawler calls after it completes a harvest).

In Dev the webhook url is "https://dev-api.clearlydefined.io/webhook".

The token is what we use to authenticate to the API (so that only the crawler can call that part of the ClearlyDefined Service api)

### CRAWLER_HARVESTS_QUEUE_VISIBILITY_TIMEOUT_SECONDS

This environment variable is optional and specifically applies to the `azqueue` crawler store provider. It sets the visibility timeout, which determines how long messages remain hidden after being pushed onto the queue.  

The default value is `0`. For production crawlers, this value is explicitly set to `300 seconds` (5 minutes).

## Docker environmental variables

The Docker environmental variables define what container image is used for the Crawler, as well as what registry that image is kept in, and authentication info for the registry.

### DOCKER_ENABLE_CI

Used by Azure App Service to deploy based on image registry webhook.

### HARVEST_AZBLOB

These values are identical to the ones stored for the CRAWLER_AZBLOB environmental variables. It's not clear why these are separate, the do not appear to be used anywhere in the crawler. They may be able to be removed.

### WEBSITE_HTTPLOGGING_RETENTION_DAYS

This does not appear to be used anywhere in the Crawler. It may be able to be removed.

### WEBSITES_ENABLE_APP_SERVICE_STORAGE

This also does not appear to be used anywhere in the Crawler. It may be able to be removed.

And that concludes our discussion of **cdcrawler-dev**.

Now let's move onto the most complex App Service - **clearlydefined-api-dev**
