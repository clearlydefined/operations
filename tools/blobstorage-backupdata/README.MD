# Publish changes job
This directory contains source code for program that regularly publishes the
ClearlyDefined database changes to Azure Blob Storage.

## Motivation
The process of publishing ClearlyDefined database changes exists mainly for the reason of
providing access to the complete set of definitions on scale. Going via REST API works well
for one off requests, but quickly runs into performance limitations when lots of definition 
must be fetched quickly.

To avoid these API performance limitations, ClearlyDefined regularly publishes updates to its
database as individual files in a publicly available Azure storage container. This allows interested
parties to maintain the complete mirror of ClearlyDefined definitions, and doing so efficiently.

## Published data structure

The changes published into a storage account named `clearlydefinedprod`, in a container named
`production-snapshots`. This container doesn't allow for listing of objects, because of costs
considerations. Instead, the following mechanism is used to notify users of new changes.

The files contained in the storage container can be split into two categories:
1. Definitions files,
2. Indexing files.

### Definition files
Definition files are named after ClearlyDefined coordinates with a `.json` extension, e.g.
`pypi/pypi/-/opentelemetry-api/1.21.0.json`. They are contained in the root directory of the
`production-snapshots` storage container. They can be read individually, but not listed.

Each definition file contain a JSON representation of a ClearlyDefined package definition,
excluding the `files` part.
<details>
  <summary>Click for a definiton example</summary>

```
{
  "_id": "pypi/pypi/-/opentelemetry-api/1.21.0",
  "described": {
    "hashes": {
      "sha1": "f64065a0a89e343943534766b89c849fe751bf19",
      "sha256": "d6185fd5043e000075d921822fd2d26b953eba8ca21b1e2fa360dd46a7686316"
    },
    "files": 71,
    "urls": {
      "registry": "https://pypi.org/project/opentelemetry-api",
      "version": "https://pypi.org/project/opentelemetry-api/1.21.0",
      "download": "https://files.pythonhosted.org/packages/4d/aa/1a10f310275fdd05a1062d4a8a641a5f041db2377956a80ff3c4dc325a6c/opentelemetry_api-1.21.0.tar.gz"
    },
    "tools": [
      "clearlydefined/1.3.1"
    ],
    "toolScore": {
      "total": 70,
      "date": 0,
      "source": 70
    },
    "sourceLocation": {
      "type": "pypi",
      "provider": "pypi",
      "name": "opentelemetry-api",
      "revision": "1.21.0",
      "url": "https://pypi.org/project/opentelemetry-api/1.21.0/"
    },
    "score": {
      "total": 70,
      "date": 0,
      "source": 70
    }
  },
  "licensed": {
    "declared": "Apache-2.0",
    "toolScore": {
      "total": 60,
      "declared": 30,
      "discovered": 0,
      "consistency": 15,
      "spdx": 15,
      "texts": 0
    },
    "facets": {
      "core": {
        "attribution": {
          "unknown": 71
        },
        "discovered": {
          "unknown": 71
        },
        "files": 71
      }
    },
    "score": {
      "total": 60,
      "declared": 30,
      "discovered": 0,
      "consistency": 15,
      "spdx": 15,
      "texts": 0
    }
  },
  "_meta": {
    "schemaVersion": "1.6.1",
    "updated": "2023-12-13T10:59:09.978Z"
  },
  "scores": {
    "effective": 65,
    "tool": 65
  }
}
```
</details>

### Indexing files
Indexing files are contained in the `changes` sub-directory of the `production-snapshots` container.
There are further two categories of these files:
1. Changeset files,
2. `index` file.

#### Changeset files
Changeset files are plain text files that contain newline-separated list of definition files. 
Changeset files are named after UTC date and hour when the definitions included in each of 
those files have been modified in the ClearlyDefined database.

Here's an example of a changeset file. It's named `changes/2023-12-13-10`, and contains the following text:
```
pypi/pypi/-/opentelemetry-util-http/0.42b0.json
pypi/pypi/-/airbyte-cdk/0.51.24.json
npm/npmjs/@multiplechain/solana/0.2.2.json
pypi/pypi/-/opentelemetry-api/1.21.0.json
```
This means that the definitions listed above have been modified (created or updated) by ClearlyDefined
on December, 23rd of 2023, from 10:00 till 11:00 UTC.

#### `Index` file
The file named `changes/index` contain list of all the published changesets. It is a text file, and
contains newline-separated list of changeset names, such as:
```
...
2023-12-13-07
2023-12-13-08
2023-12-13-09
2023-12-13-10
2023-12-13-11
2023-12-13-12
2023-12-13-13
...
```
### Storage summary

Here's how the storage sturcture looks in practice:
```
.
├── changes
│   └── index
│       ├── ...
│       ├── 2023-12-13-07
│       ├── 2023-12-13-08
│       ├── 2023-12-13-09
│       ├── 2023-12-13-10
│       ├── 2023-12-13-11
│       ├── 2023-12-13-12
│       ├── 2023-12-13-13
│       └── ...
├── composer
│   └── packagist
│       └── ...
├── crate
│   └── cratesio
│       └── ...
├── deb
│   └── debian
│       └── ...
├── debsrc
│   └── debian
│       └── ...
├── gem
│   └── rubygems
│       └── ...
├── git
│   ├── github
│   │   └── ...
│   └── gitlab
│       └── ...
├── go
│   └── golang
│       └── ...
├── maven
│   └── gradleplugin
│       └── ...
│   └── mavencentral
│       └── ...
│   └── mavengoogle
│       └── ...
├── npm
│   └── npmjs
│       └── ...
├── nuget
│   └── nuget
│        └── ...
├── pod
│   └── cocoapods
│       └── ...
├── pypi
│   └── pypi
│       └── ...
├── sourcearchive
│   └── mavencentral
│       └── ...
│   └── mavengoogle
│       └── ...
│   └── npmjs
│       └── ...
```

## Publish changes software
The software responsible for producing the data according to the definition above is called
`blobstorage-backupdata`. It's published as a Docker image to GitHub container registry and 
deployed to Azure Container Instances. It's scheduled to run hourly.

Every time it runs it inspects the `changes\index` file and calculates the time interval
where no changes have been published yet. It then requests the changes made in this calculated
interval from the main database, and publishes the resulting definitions and changesets. It also
updates the `changes\index` file by adding the published changeset entries.

### Operations
`blobstorage-backupdata` is built on every merge to main branch. It done using GitHub action defined in
`.github/workflows/backup-data-docker-image.yml` file. The produced Docker image is published to 
`ghcr.io``, and is public. The image is tagged with SHA of the commit.

After the image is published, it can be run either either manually, or by some external mechanism,
such as Azure Function. This process is to be defined.

It produces stdout log output, either as JSON if `USE_JSON_LOGGING=true` environment variable is specified,
or in plain text otherwise.

Access to database and blob storage are specified by `MONGO_CONNECTION_STRING`, `BLOB_SERVICE_CONNECTION_STRING`
and `BLOB_CONTAINER_NAME` environment variables, all of which are mandatory.

#### Running locally
It's possible to run `blobstorage-backupdata` locally, either via Docker or directly. You can build Docker image
using e.g. `docker build ./tools/blobstorage-backupdata -t pcj:latest` and then run via 
`docker run --env-file .env -i pcj:latest`. The `.env` file contains sensitive data and is not published in this 
repository, so you should create it yourself, e.g. from the `template.env` and specify the necessary information,
obtained separately.