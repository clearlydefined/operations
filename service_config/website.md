- [Website](#website)
  - [Configuration](#configuration)
    - [DOCKER\_ENABLE\_CI](#docker_enable_ci)


# Website

The cleary defined website https://clearlydefined.io/

## Configuration

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

### DOCKER_ENABLE_CI

Legacy env var.
Was used when Azure devops was deploying the service, to react to a container registry webhook. Now GitHub actions explicity deploys the service

When this is set to "true", anytime a new new version of the Docker image is pushed to the registry, the app service will automatically re-deploy.

When this setting is enabled, the App Service adds a **Container registry webhook** to your Azure resource group. In the case of the ClearlyDefined website, this is the **webappclearlydefineddev** container registry webhook.  When a new version of the **clearlydefined/website** Docker image is pushed to the **clearlydefineddev2** Azure Container registry, the **webappclearlydefineddev** webhook will POST to a /docker/hook on the **clearlydefined-dev** App Service, which will trigger a re-deploy of the service.

[More information about enabling Docker CI in an Azure App Service](https://docs.microsoft.com/en-us/azure/app-service/deploy-ci-cd-custom-container?tabs=acr&pivots=container-linux#4-enable-cicd)
