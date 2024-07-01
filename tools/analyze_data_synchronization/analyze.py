import json
import os
import urllib.parse

import pymongo
import requests
from azure.cosmos import cosmos_client
from dotenv import load_dotenv

load_dotenv()

MONGO_CONNECTION_STRING = str(os.environ.get("MONGO_CONNECTION_STRING"))
DB_NAME = "clearlydefined"
COLLECTION_NAME = "definitions-trimmed"
BASE_AZURE_BLOB_URL = str(os.environ.get("BASE_AZURE_BLOB_URL"))


# Example coordinates: composer/packagist/00f100/fcphp-cache/revision/0.1.0.json

# Mongo document with unused fields removed
# {
#   "_id": "composer/packagist/00f100/fcphp-cache/0.1.0",
#   "_meta": {
#     "schemaVersion": "1.6.1",
#     "updated": "2019-08-29T02:06:54.498Z"
#   },
#   "coordinates": {#     "type": "composer",
#     "provider": "packagist",
#     "namespace": "00f100",
#     "name": "fcphp-cache",
#     "revision": "0.1.0"
#   },
#   "licensed": {
#     "declared": "MIT",#     "toolScore": {
#       "total": 17,
#       "declared": 0,
#       "discovered": 2,
#       "consistency": 0,
#       "spdx": 0,
#       "texts": 15
#     },
#     "score": {
#       "total": 17,
#       "declared": 0,
#       "discovered": 2,
#       "consistency": 0,
#       "spdx": 0,
#       "texts": 15
#     }
#   }
# }


def fetch_blob(base_url, type, provider, namespace, name, revision):
    """Fetch the blob from the azure blob storage"""
    # need to encode the url for the %2f characters
    url = urllib.parse.quote(
        f"{type}/{provider}/{namespace}/{name}/revision/{revision}.json".lower()
    )
    url = f"{base_url}/{url}"
    # Fetch the data from the blob storage
    res = requests.get(url)
    if res.status_code != 200:
        return {}
    return res.json()


def dump_data(data, filename):
    with open(filename, "w") as f:
        json.dump(data, f)


client = pymongo.MongoClient(MONGO_CONNECTION_STRING)

db = client[DB_NAME]
if DB_NAME not in client.list_database_names():
    print(f"Database '{DB_NAME}' not found.")
else:
    print(f"Using database: '{DB_NAME}'.")

collection = db[COLLECTION_NAME]
if COLLECTION_NAME not in db.list_collection_names():
    print(f"Collection '{COLLECTION_NAME}' not found.")
else:
    print(f"Using collection: '{COLLECTION_NAME}'.")


months = ["2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06"]

invalid_data = {}

for month in months:
    docs = collection.find(
        {
            "_meta.updated": {"$gte": f"{month}-01", "$lte": f"{month}-31"},
            "licensed.declared": {"$exists": False},
        },
        max_time_ms=10000000,
    ).limit(5000)

    doc_count = collection.count_documents(
        {
            "_meta.updated": {"$gte": f"{month}-01", "$lte": f"{month}-31"},
            "licensed.declared": {"$exists": False},
        },
        max_time_ms=10000000,
    )

    invalid_data[month] = {
        "stats": {
            "sample_total": 0,
            "sample_invalid": 0,
        }
    }
    count = 0

    for doc in docs:
        count += 1
        blob = fetch_blob(
            BASE_AZURE_BLOB_URL,
            doc["coordinates"]["type"],
            doc["coordinates"]["provider"],
            doc["coordinates"].get("namespace", "-"),
            doc["coordinates"]["name"],
            doc["coordinates"]["revision"],
        )
        db_licensed = doc.get("licensed", {})
        blob_licensed = blob.get("licensed", {})

        if db_licensed.get("declared") != blob_licensed.get("declared"):
            # only adding the licensed and meta fields to the invalid data
            invalid_data[month][doc["_id"]] = {
                "db": {
                    "licensed": (db_licensed.get("declared")),
                    "_meta": doc.get("_meta", {}),
                },
                "blob": {
                    "licensed": (blob_licensed.get("declared")),
                    "_meta": blob.get("_meta", {}),
                },
            }

        # Checkpoint in case mongo dies
        if count % 100 == 0:
            print(
                f"Checkpoint: total number of invalid data: {len(invalid_data[month])}, total items {count} ({len(invalid_data[month])/count * 100}%)"
            )
            invalid_data[month]["stats"]["sample_total"] = count
            invalid_data[month]["stats"]["sample_invalid"] = len(invalid_data[month])
            dump_data(invalid_data, f"2024-invalid_data.json")

    invalid_data[month]["stats"]["total_documents"] = doc_count
    invalid_data[month]["stats"]["total_estimated_invalid"] = doc_count * (
        len(invalid_data[month]) / count
    )
    invalid_data[month]["stats"]["sample_percent_of_total"] = doc_count * (
        count / doc_count
    )
    dump_data(invalid_data, f"2024-invalid_data.json")
    print("Done")
    print(
        f"Total number of invalid data: {len(invalid_data[month])}, total items {count} ({len(invalid_data[month])/count * 100}%)"
    )
    dump_data(invalid_data, f"2024-invalid_data.json")