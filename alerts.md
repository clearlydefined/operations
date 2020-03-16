This page should indicate what monitoring exists (and maybe more importantly, what doesn't and should). Issues should be created in the operations repo when gaps in monitoring are found.

# Availability tests 

| Alert | Primary resource 
| -- | -- 
| [Outbound Redis was slower than expected](https://portal.azure.com/#blade/Microsoft_Azure_Monitoring/UpdateVNextAlertRuleBlade/ruleInputs/%7B%22alertId%22%3A%22%2Fsubscriptions%2Fe05584a1-ed97-4676-aec9-d82ba4c36c93%2FresourceGroups%2Fclearlydefined-prod%2Fproviders%2Fmicrosoft.insights%2Fscheduledqueryrules%2FOutbound%20Redis%20was%20slower%20than%20expected%22%7D) | Redis access, but from the WestUS Prod API's perspective
| [SLA Drop below .99 for the past 24 hours (by count of 500)](https://portal.azure.com/#blade/Microsoft_Azure_Monitoring/UpdateVNextAlertRuleBlade/ruleInputs/%7B%22alertId%22%3A%22%2Fsubscriptions%2Fe05584a1-ed97-4676-aec9-d82ba4c36c93%2FresourceGroups%2Fclearlydefined-prod%2Fproviders%2Fmicrosoft.insights%2Fscheduledqueryrules%2FSLA%20Drop%20below%20.99%20for%20the%20past%2024%20hours%20(by%20count%20of%20500)%22%7D) | Prod API's 500 responses
| [SLA Drop below .99 for the past 24 hours (requests greater than 20s)](https://portal.azure.com/#blade/Microsoft_Azure_Monitoring/UpdateVNextAlertRuleBlade/ruleInputs/%7B%22alertId%22%3A%22%2Fsubscriptions%2Fe05584a1-ed97-4676-aec9-d82ba4c36c93%2FresourceGroups%2Fclearlydefined-prod%2Fproviders%2Fmicrosoft.insights%2Fscheduledqueryrules%2FSLA%20Drop%20below%20.99%20for%20the%20past%2024%20hours%20(requests%20greater%20than%2020s)%22%7D) | Prod API's response speed


# Other alerts

- Monitor Azure Search indexer for errors
- Monitor Redis for max capacity
- Monitor CosmosDB for any problems or errors
- Monitor crawlers for high usage of disk space and CPU

# Existing alerts

- Number of messages in the queues
- Failed curation PR checks
