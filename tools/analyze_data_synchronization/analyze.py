import json
import os
import sys
import urllib.parse

import pymongo
import requests
from azure.cosmos import cosmos_client
from dotenv import load_dotenv

# All environment variables can be defined in tools/analyze_data_synchronization/.env
#
# Required environment variables:
# * MONGO_CONNECTION_STRING: The connection string to the MongoDB database
# * BASE_AZURE_BLOB_URL The base URL for the Azure Blob Storage
# * SERVICE_API_URL: The URL for the service API
# 
# Optional environment variables:
# * AZURE_CONTAINER_NAME: The name of the Azure Blob Storage container (default: "develop-definition")
# * OUTPUT_FILE: The file to write the output to (default: "invalid_data.json")
# * REPAIR: If set to "true", the script will attempt to repair the data (default: false)
# * PAGE_SIZE: The number of documents to process at a time (default: 1000)
# * INITIAL_SKIP: The number of documents to skip before starting the analysis (default: 0) - used with START_DATE and END_DATE
# * START_MONTH: The first month to include in the query (default: 2024-01)
# * END_MONTH: The last month to include in the query (default: 2024-06)
# * START_DATE: The first date to include in the query (default: "")
# * END_DATE: The last date to include in the query (default: "")
# * VERBOSE: If set to "true", the script will output more information (default: false)

# Commands to run this script on localhost from this directory after setting the environment variables:
#
#   cd tools/analyze_data_synchronization
#   python3 -m venv .venv  
#   source .venv/bin/activate
#   python3 -m pip install -r requirements.txt
#   python3 analyze.py

load_dotenv()

MONGO_CONNECTION_STRING = str(os.environ.get("MONGO_CONNECTION_STRING"))
DB_NAME = "clearlydefined"
COLLECTION_NAME = "definitions-trimmed"

BASE_AZURE_BLOB_URL = str(os.environ.get("BASE_AZURE_BLOB_URL"))
AZURE_CONTAINER_NAME = str(os.environ.get("AZURE_CONTAINER_NAME", "develop-definition"))

SERVICE_API_URL = str(os.environ.get("SERVICE_API_URL"))

START_MONTH = str(os.environ.get("START_MONTH", "2024-01"))
END_MONTH = str(os.environ.get("END_MONTH", "2024-06"))

START_DATE = str(os.environ.get("START_DATE", ""))
END_DATE = str(os.environ.get("END_DATE", ""))

REPAIR = str(os.environ.get("REPAIR", "false")).lower() == "true"
PAGE_SIZE = int(os.environ.get("PAGE_SIZE", 1000))
INITIAL_SKIP = int(os.environ.get("INITIAL_SKIP", 0))
OUTPUT_FILE = str(os.environ.get("OUTPUT_FILE", "invalid_data.json"))
VERBOSE = str(os.environ.get("VERBOSE", "false")).lower() == "true"

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


def fetch_blob(base_url, container_name, type, provider, namespace, name, revision):
    """Fetch the blob from the azure blob storage"""
    # need to encode the url for the %2f characters
    url = urllib.parse.quote(
        f"{type}/{provider}/{namespace}/{name}/revision/{revision}.json".lower()
    )
    url = f"{base_url}/{container_name}/{url}"
    # Fetch the data from the blob storage
    res = requests.get(url)
    if res.status_code != 200:
        return {}
    return res.json()

def repair_data(service_url, type, provider, namespace, name, revision):
    """Repair the data by requesting the definition from the service with the force parameter"""
    if VERBOSE:
        print(f"  Repairing data for {type}/{provider}/{namespace}/{name}/{revision}")
    url = f"{service_url}/definitions/{type}/{provider}/{namespace}/{name}/{revision}?force=true"
    res = requests.get(url)
    if res.status_code != 200:
        return {}
    return res.json()

def dump_data(data, filename):
    with open(filename, "w") as f:
        json.dump(data, f)

def initialize_stats(range_label, total_docs_count, invalid_data):
    # TODO: Add container name to summary stats.
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

def update_stats(invalid_data, invalid_count, range_label, sample_count, checkpoint=False):
    invalid_data[range_label]["stats"]["sample_total"] = sample_count
    invalid_data[range_label]["stats"]["sample_invalid"] = invalid_count

    percent_invalid = invalid_count / sample_count * 100
    invalid_data[range_label]["stats"]["percent_invalid"] = str(round(percent_invalid, 2)) + "%"

    total_count = invalid_data[range_label]["stats"]["total_documents"]
    invalid_data[range_label]["stats"]["total_estimated_invalid"] = round((total_count * percent_invalid) / 100)
    invalid_data[range_label]["stats"]["sample_percent_of_total"] = str(round((sample_count / total_count * 100), 2)) + "%"

    repaired = ""
    if REPAIR:
        repaired = " (repaired)"
    if checkpoint:
        print(
            f"Checkpoint: total invalid data: {invalid_count}{repaired}, total items {sample_count} ({percent_invalid}%)"
        )
    else:
        print(
            f"Total invalid data: {invalid_count}{repaired}, total items {sample_count} ({percent_invalid}%)"
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

def page_count(collection, query, range_label, invalid_data):
    all_docs_count = collection.count_documents(query, 
                                                max_time_ms=10000000)

    initialize_stats(range_label, all_docs_count, invalid_data)
    if all_docs_count == 0:
        print("No documents found missing licenses in {range_label}.")
        return 0

    if INITIAL_SKIP > 0:
        print(f"Skipping {INITIAL_SKIP} documents")
        all_docs_count -= INITIAL_SKIP

    pages = all_docs_count // PAGE_SIZE
    if all_docs_count % PAGE_SIZE:
        pages += 1
    return pages


def analyze_docs(collection, query, range_label, invalid_data):
    pages = page_count(collection, query, range_label, invalid_data)
    if pages == 0:
        return
    
    running_count_docs = 0
    running_count_invalid = 0
    page = 0
    skip = 0
    if INITIAL_SKIP > 0:
        skip = INITIAL_SKIP
    while True:
        print(f"Processing page {page+1} of {pages} in {range_label}")
        docs = collection.find(query).skip(skip).limit(PAGE_SIZE).max_time_ms(10000000)
        new_docs_count, new_invalid_count = analyze_page_of_docs(docs, running_count_docs, running_count_invalid, range_label, invalid_data)
        running_count_invalid += new_invalid_count
        running_count_docs += new_docs_count
        if new_docs_count == 0:
            break
        page += 1
        skip = page * PAGE_SIZE + INITIAL_SKIP

def analyze_page_of_docs(docs, running_count_docs, running_count_invalid, range_label, invalid_data):
    count_docs = 0
    count_invalid = 0
    for doc in docs:
        count_docs += 1
        blob = fetch_blob(
            BASE_AZURE_BLOB_URL,
            AZURE_CONTAINER_NAME,
            doc["coordinates"]["type"],
            doc["coordinates"]["provider"],
            doc["coordinates"].get("namespace", "-"),
            doc["coordinates"]["name"],
            doc["coordinates"]["revision"],
        )
        db_licensed = doc.get("licensed", {})
        blob_licensed = blob.get("licensed", {})

        if db_licensed.get("declared") != blob_licensed.get("declared"):
            count_invalid += 1
            if VERBOSE:
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
            if REPAIR:
                # request definition with the force parameter to update the licensed.declared field in the database
                collection.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {"licensed.declared": blob_licensed.get("declared")}},
                )
                blob = repair_data(
                    SERVICE_API_URL,
                    doc["coordinates"]["type"],
                    doc["coordinates"]["provider"],
                    doc["coordinates"].get("namespace", "-"),
                    doc["coordinates"]["name"],
                    doc["coordinates"]["revision"],
                )


        # Checkpoint in case mongo dies
        if count_docs % 100 == 0:
            total_invalid = running_count_invalid + count_invalid
            total_docs = running_count_docs + count_docs
            update_stats(invalid_data, total_invalid, range_label, total_docs, True)

    total_invalid = running_count_invalid + count_invalid
    total_docs = running_count_docs + count_docs
    update_stats(invalid_data, total_invalid, range_label, total_docs)
    return count_docs, count_invalid


### Main ###
print("Starting data synchronization analysis")
client = pymongo.MongoClient(MONGO_CONNECTION_STRING)

db = client[DB_NAME]
if DB_NAME not in client.list_database_names():
    print(f"  Database '{DB_NAME}' not found.")
else:
    print(f"  Using database: '{DB_NAME}'.")

collection = db[COLLECTION_NAME]
if COLLECTION_NAME not in db.list_collection_names():
    print(f"  Collection '{COLLECTION_NAME}' not found.")
else:
    print(f"  Using collection: '{COLLECTION_NAME}'.")

print(f"  Using blob container: '{AZURE_CONTAINER_NAME}'")

print(f"PAGE_SIZE: {PAGE_SIZE}")
print(f"INITIAL_SKIP: {INITIAL_SKIP}")
print(f"REPAIR: {REPAIR}")
print(f"OUTPUT_FILE: '{OUTPUT_FILE}'")

invalid_data = {}

if START_DATE and END_DATE:
    print("Processing custom date range")
    print(f"  START_DATE: {START_DATE}")
    print(f"  END_DATE:   {END_DATE}")
 
    analyze_docs(
        collection,
        {
            "_meta.updated": {"$gte": START_DATE, "$lte": END_DATE},
            "licensed.declared": {"$exists": False},
        },
        "custom_range",
        invalid_data,
    ) 

else:
    INITIAL_SKIP = 0
    print("Processing by months")
    print(f"  START_MONTH: {START_MONTH}")
    print(f"  END_MONTH: {END_MONTH}")
    months = create_months(START_MONTH, END_MONTH)
    print(f"  {months}")

    for month in months:
        print(f"Processing {month}")

        analyze_docs(
            collection,
            {
                "_meta.updated": {"$gte": START_DATE, "$lte": END_DATE},
                "licensed.declared": {"$exists": False},
            },
            month,
            invalid_data,
        ) 
        
dump_data(invalid_data, OUTPUT_FILE)
