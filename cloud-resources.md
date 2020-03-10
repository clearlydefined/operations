Note: There are a ton of individual resources, even down to the webhook level in Azure. The easiest place to start is probably the resource groups themselves, but Big Things are included here.

# Shared

| thing | dev | prod | description
| -- | -- | -- | --
| Search Service | [Link](https://portal.azure.com/#@clearlydefinedoutlook.onmicrosoft.com/resource/subscriptions/e05584a1-ed97-4676-aec9-d82ba4c36c93/resourceGroups/clearlydefined-dev/providers/Microsoft.Search/searchServices/clearlydefined-dev/overview) | | Used to index curations by facet
| Redis | [Link](https://portal.azure.com/#@clearlydefinedoutlook.onmicrosoft.com/resource/subscriptions/e05584a1-ed97-4676-aec9-d82ba4c36c93/resourceGroups/clearlydefined-dev/providers/Microsoft.Cache/Redis/clearlydefined-dev/overview) | | Used by most other applications to share data at the service instance level

# Website

# Service

| Resource | dev | prod | prod-eu | description
| -- | -- | -- | -- | --
| Application Insights | [Link](https://portal.azure.com/#@clearlydefinedoutlook.onmicrosoft.com/resource/subscriptions/e05584a1-ed97-4676-aec9-d82ba4c36c93/resourceGroups/clearlydefined-dev/providers/Microsoft.Search/searchServices/clearlydefined-dev/overview) | | | Contains all telemetry for the service instance
| App service | [Link](https://portal.azure.com/#@clearlydefinedoutlook.onmicrosoft.com/resource/subscriptions/e05584a1-ed97-4676-aec9-d82ba4c36c93/resourceGroups/clearlydefined-dev/providers/Microsoft.Cache/Redis/clearlydefined-dev/overview) | | | The "metal" hosting the application. Deployed to from Azure DevOps.

# Crawler


# Miscellaneous

| Resource |  | Description | 
| -- | -- | -- |
| KeyVault (shared across everything) | [Link](https://portal.azure.com/#@clearlydefinedoutlook.onmicrosoft.com/resource/subscriptions/e05584a1-ed97-4676-aec9-d82ba4c36c93/resourceGroups/clearlydefined-dev/providers/Microsoft.KeyVault/vaults/clearlydefined/secrets) | Used to store secrets used by operations to access resources external to Azure.
| @clearlydefinedoutlook Azure Active Directory (must sign in with @clearlydefined) | [Link](https://portal.azure.com/#blade/Microsoft_AAD_IAM/UsersManagementMenuBlade/AllUsers) | The identity provider that controls access to the Azure subscription. Not used for actual email.
| Clearly defined superuser | [Link](https://portal.azure.com/#blade/Microsoft_AAD_IAM/UserDetailsMenuBlade/Profile/userId/e520b2ff-7ae5-4a3f-9f7f-2183a8c068fa/adminUnitObjectId/) | The user that has god mode on Azure Portal, can be used to elevate access for other users or to perform operations requiring subscription admin.