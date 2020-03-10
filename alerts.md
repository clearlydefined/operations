This page should indicate what monitoring exists (and maybe more importantly, what doesn't and should). Issues should be created in the operations repo when gaps in monitoring are found.

# Availability tests 

A few availability tests exist hitting the prod api cluster, but I don't see any place where they are used to notify that something is broken.

# Other alerts

- Monitor Azure Search indexer for errors
- Monitor Redis for max capacity
- Monitor CosmosDB for any problems or errors
- Monitor crawlers for high usage of disk space and CPU

# Existing alerts

- Number of messages in the queues
- Failed curation PR checks
