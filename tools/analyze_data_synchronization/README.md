# analyze_data_synchronization tool

This script is used to quantify the level of out-of-sync data between the Cosmos DB and the production-definitions data (source of truth).
It is a diagnostic tool intended to be run on localhost if a problem is suspected.  It is not run on a regular basis, at least at this
time.

## Usage

### Prerequisites

Set up environment variables that drive how the tool runs. This can be set as system env vars.  They can also be set in a `.env`  You can
rename `.env-example` to `.env` and modify as desired.

- MONGO_CONNECTION_STRING (required) - the connection string to the MongoDB database
- BASE_AZURE_BLOB_URL (required) - the base path including the container
- START_DATE (optional) - the first date to include in the query (default: `""`)
- END_DATE (optional) - the last date to include in the query (default: `""`)
- START_MONTH (optional) - the first month to include in the query (default: `"2024-01"`)
- END_MONTH (optional) - the last month to include in the query (default: `"2024-06"`)
- MAX_DOCS (optional) - the max number of documents that will be processed for each month or during the custom date range (default: 5000)
- OUTPUT_FILE (optional) - the file to write the output to (default: `"invalid_data.json"`)

_NOTE:  Limiting MAX_DOCS to no more than 5000 allows the script to complete in a reasonable length of time and is a
sample of sufficient size to provide an understanding of the scope of the problem._

### Set up virtual environment

This is best run in a Python virtual environment.  Set up the .venv and install the required dependencies.

```bash
python3 -m venv .venv  
source .venv/bin/activate
python3 -m pip install -r requirements.txt
```

### Run the script

```bash
python3 analyze.py
```

## Example

### Example coordinates

```text
composer/packagist/00f100/fcphp-cache/revision/0.1.0.json
```

### Example Mongo document with unused fields removed

```json
{
  "_id": "composer/packagist/00f100/fcphp-cache/0.1.0",
  "_meta": {
    "schemaVersion": "1.6.1",
    "updated": "2019-08-29T02:06:54.498Z"
  },
  "coordinates": {
    "type": "composer",
    "provider": "packagist",
    "namespace": "00f100",
    "name": "fcphp-cache",
    "revision": "0.1.0"
  },
  "licensed": {
    "declared": "MIT",
    "toolScore": {
      "total": 17,
      "declared": 0,
      "discovered": 2,
      "consistency": 0,
      "spdx": 0,
      "texts": 15
    },
    "score": {
      "total": 17,
      "declared": 0,
      "discovered": 2,
      "consistency": 0,
      "spdx": 0,
      "texts": 15
    }
  }
}
```

### Example Output

The following shows the summary stats and an example of one of the invalid samples.  The actual results will contain
all the invalid samples.

```json
{
    "2024-06": {
        "stats": {
            "sample_total": 500,
            "sample_invalid": 6,
            "percent_invalid": "1.2%",
            "total_documents": 86576,
            "total_estimated_invalid": 1039,
            "sample_percent_of_total": "0.58%"
        },
        "sourcearchive/mavencentral/org.apache.kerby/kerby-util/1.0.1": {
            "db": {
                "licensed": null,
                "_meta": {
                    "schemaVersion": "1.6.1",
                    "updated": "2024-06-13T12:59:21.981Z"
                }
            },
            "blob": {
                "licensed": "Apache-2.0",
                "_meta": {
                    "schemaVersion": "1.6.1",
                    "updated": "2024-06-13T12:59:31.368Z"
                }
            }
        },
        ...
    }
    ...
}
```
