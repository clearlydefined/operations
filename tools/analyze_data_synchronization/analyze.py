import json
import os
import sys
import urllib.parse

import pymongo
import requests
from azure.cosmos import cosmos_client
from dotenv import load_dotenv

# To run this script, you need to have the following environment variables set:
#
# * MONGO_CONNECTION_STRING: The connection string to the MongoDB database
# * START_MONTH: The first month to include in the query
# * END_MONTH: The last month to include in the query
# * OUTPUT_FILE: The file to write the output to
#
# Command to run this script on localhost from this directory after setting the environment variables:
#
# python3 -m venv .venv  
# source .venv/bin/activate
# python3 -m pip install -r requirements.txt
# python3 analyze.py

load_dotenv()

MONGO_CONNECTION_STRING = str(os.environ.get("MONGO_CONNECTION_STRING"))
DB_NAME = "clearlydefined"
COLLECTION_NAME = "definitions-trimmed"
BASE_AZURE_BLOB_URL = str(os.environ.get("BASE_AZURE_BLOB_URL"))

START_MONTH = str(os.environ.get("START_MONTH", "2024-01"))
END_MONTH = str(os.environ.get("END_MONTH", "2024-06"))

START_DATE = str(os.environ.get("START_DATE", ""))
END_DATE = str(os.environ.get("END_DATE", ""))

MAX_DOCS = int(os.environ.get("MAX_DOCS", 5000))
OUTPUT_FILE = str(os.environ.get("OUTPUT_FILE", "invalid_data.json"))

# Example coordinates: composer/packagist/00f100/fcphp-cache/revision/0.1.0.json

# Example Mongo document with unused fields removed
# {
#   "_id": "composer/packagist/00f100/fcphp-cache/0.1.0",
#   "_meta": {
#     "schemaVersion": "1.6.1",
#     "updated": "2019-08-29T02:06:54.498Z"
#   },
#   "coordinates": {
#     "type": "composer",
#     "provider": "packagist",
#     "namespace": "00f100",
#     "name": "fcphp-cache",
#     "revision": "0.1.0"
#   },
#   "licensed": {
#     "declared": "MIT",
#     "toolScore": {
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

# Example Output
# [
#   "2024-01": {
#     "stats": {
#       "sample_total": 5000,
#       "sample_invalid": 657,
#       "percent_invalid": 13.10%
#       "total_documents": 84167,
#       "total_estimated_invalid": 11059.5438,
#       "sample_percent_of_total": 5.94%
#     }
#   },
#   ...
# ]


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

def initialize_stats(range_label, total_docs_count):
    invalid_data[range_label] = {
        "stats": {
            "sample_total": 0,
            "sample_invalid": 0,
            "percent_invalid": "0%",
            "total_documents": total_docs_count,
            "total_estimated_invalid": 0,
            "sample_percent_of_total": "0%",
        }
    }
    return invalid_data   

def update_stats(invalid_data, range_label, sample_count, checkpoint=False):
    invalid_count = len(invalid_data[range_label]) - 1
    invalid_data[range_label]["stats"]["sample_total"] = sample_count
    invalid_data[range_label]["stats"]["sample_invalid"] = invalid_count

    percent_invalid = invalid_count / sample_count * 100
    invalid_data[range_label]["stats"]["percent_invalid"] = str(round(percent_invalid, 2)) + "%"

    total_count = invalid_data[range_label]["stats"]["total_documents"]
    invalid_data[range_label]["stats"]["total_estimated_invalid"] = round((total_count * percent_invalid) / 100)
    invalid_data[range_label]["stats"]["sample_percent_of_total"] = str(round((sample_count / total_count * 100), 2)) + "%"

    if checkpoint:
        print(
            f"Checkpoint: total number of invalid data: {invalid_count}, total items {sample_count} ({percent_invalid}%)"
        )
    else:
        print(
            f"Total number of invalid data: {invalid_count}, total items {sample_count} ({percent_invalid}%)"
        )
    dump_data(invalid_data, OUTPUT_FILE)

def create_months(start_month, end_month):
    start_year, start_month = start_month.split("-")
    end_year, end_month = end_month.split("-")
    months = []
    for year in range(int(start_year), int(end_year) + 1):
        for month in range(1, 13):
            if year == int(start_year) and month < int(start_month):
                continue
            if year == int(end_year) and month > int(end_month):
                continue
            months.append(f"{year}-{str(month).zfill(2)}")
    return months

def analyze_docs(docs, range_label, invalid_data):
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
            invalid_data[range_label][doc["_id"]] = {
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
            update_stats(invalid_data, range_label, count, True)

    update_stats(invalid_data, range_label, count)
    return count


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

print(f"OUTPUT_FILE: '{OUTPUT_FILE}'")
print(f"MAX_DOCS: {MAX_DOCS}")

invalid_data = {}

if START_DATE and END_DATE:
    print("Processing custom date range")
    print(f"  START_DATE: {START_DATE}")
    print(f"  END_DATE:   {END_DATE}")
    docs = collection.find(
        {
            "_meta.updated": {"$gte": START_DATE, "$lte": END_DATE},
            "licensed.declared": {"$exists": False},
        },
        max_time_ms=10000000,
    ).limit(MAX_DOCS)

    all_docs_count = collection.count_documents(
        {
            "_meta.updated": {"$gte": START_DATE, "$lte": END_DATE},
            "licensed.declared": {"$exists": False},
        },
        max_time_ms=10000000,
    )

    invalid_data = initialize_stats("custom_range", all_docs_count)
    analyze_docs(docs, "custom_range", invalid_data)

else:
    print("Processing by months")
    print(f"  START_MONTH: {START_MONTH}")
    print(f"  END_MONTH: {END_MONTH}")
    months = create_months(START_MONTH, END_MONTH)
    print(f"  {months}")

    for month in months:
        docs = collection.find(
            {
                "_meta.updated": {"$gte": f"{month}-01", "$lte": f"{month}-31"},
                "licensed.declared": {"$exists": False},
            },
            max_time_ms=10000000,
        ).limit(MAX_DOCS)

        all_docs_count = collection.count_documents(
            {
                "_meta.updated": {"$gte": f"{month}-01", "$lte": f"{month}-31"},
                "licensed.declared": {"$exists": False},
            },
            max_time_ms=10000000,
        )

        invalid_data = initialize_stats(month, all_docs_count)
        analyze_docs(docs, month, invalid_data)
        
dump_data(invalid_data, OUTPUT_FILE)
