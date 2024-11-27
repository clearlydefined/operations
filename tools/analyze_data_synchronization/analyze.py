import json
import os
import sys
import urllib.parse

import pymongo
import requests
from azure.cosmos import cosmos_client
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Commands to run this script on localhost from this directory after setting the environment variables (see initialize() below):
#
#   cd tools/analyze_data_synchronization
#   python3 -m venv .venv  
#   source .venv/bin/activate
#   python3 -m pip install -r requirements.txt
#   python3 analyze.py

# This script analyzes the data synchronization between the CosmosDB and the Azure Blob Storage.
# It compares the licensed.declared field in the CosmosDB with the licensed.declared field in the 
# Azure Blob Storage. If the fields do not match, the document is considered invalid.  The script 
# outputs a JSON file with summary statistics.
#
# The script can also repair the data by updating the licensed.declared field in the CosmosDB with 
# the value from the Azure Blob Storage and makes a request to the service API to force the 
# definitions to be re-processed.  This insures that any other data in the DB document is also
# in sync with the source of truth in the blob store.
#
# The script can be run for a  date range or for a range of months.  The repair option is only
# supported for the date range option.  The range of months is used to estimate the total number
# of invalid documents in the database by evaluating a sample of the data for each month in the
# range.

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


# All environment variables can be defined in `tools/analyze_data_synchronization/.env`
# See `tools/analyze_data_synchronization/.env.example` for an example.
#
# Required environment variables:
# * MONGO_CONNECTION_STRING: The connection string to the CosmosDB database
# * BASE_AZURE_BLOB_URL The base URL for the Azure Blob Storage
# * SERVICE_API_URL: The URL for the service API
# 
# Optional environment variables:
# * AZURE_CONTAINER_NAME: The name of the Azure Blob Storage container (default: "develop-definition")
# * OUTPUT_FILE: The file to write the output to (default: "invalid_data.json")
# * REPAIR: If set to "true", the script will attempt to repair the data (default: false)
# * PAGE_SIZE: The number of documents to process at a time (default: 1000)
# * INITIAL_SKIP: The number of documents to skip before starting the analysis (default: 0) - used with START_DATE and END_DATE
# * START_DATE: The first date to include in the query (default: "")
# * END_DATE: The last date to include in the query (default: "")
# * START_MONTH: The first month to include in the query (default: 2024-01) - ignored if START_DATE is set
# * END_MONTH: The last month to include in the query (default: 2024-06) - ignored if START_DATE is set
# * VERBOSE: If set to "true", the script will output more information (default: false)
def initialize():
    """Set up global variables based on the environment variables"""
    global MONGO_CONNECTION_STRING, DB_NAME, COLLECTION_NAME, BASE_AZURE_BLOB_URL
    global AZURE_CONTAINER_NAME, SERVICE_API_URL, START_DATE, END_DATE, START_MONTH, END_MONTH
    global INITIAL_SKIP, PAGE_SIZE, OUTPUT_FILE, REPAIR, VERBOSE, DRYRUN

    load_dotenv()

    MONGO_CONNECTION_STRING = str(os.environ.get("MONGO_CONNECTION_STRING"))
    DB_NAME = "clearlydefined"
    COLLECTION_NAME = "definitions-trimmed"

    BASE_AZURE_BLOB_URL = str(os.environ.get("BASE_AZURE_BLOB_URL"))
    AZURE_CONTAINER_NAME = str(os.environ.get("AZURE_CONTAINER_NAME", "develop-definition"))

    SERVICE_API_URL = str(os.environ.get("SERVICE_API_URL"))

    START_DATE = str(os.environ.get("START_DATE", "")) # used to repair the data
    END_DATE = str(os.environ.get("END_DATE", ""))
    END_DATE = START_DATE if END_DATE < START_DATE else END_DATE

    START_MONTH = str(os.environ.get("START_MONTH", "2024-01")) # used to spot check the data for out-of-sync licenses
    END_MONTH = str(os.environ.get("END_MONTH", "2024-06"))
    if START_DATE and END_DATE: # if the date range is set, ignore the month range
        START_MONTH = ""
        END_MONTH = ""

    MAX_PAGE_SIZE = 500 # The service API can only process 500 definitions at a time, so it is limiting the max page size
    PAGE_SIZE = int(os.environ.get("PAGE_SIZE", MAX_PAGE_SIZE))
    PAGE_SIZE = PAGE_SIZE if 0 < PAGE_SIZE < MAX_PAGE_SIZE else MAX_PAGE_SIZE

    INITIAL_SKIP = int(os.environ.get("INITIAL_SKIP", 0)) # used if processing fails part way through
    INITIAL_SKIP = 0 if INITIAL_SKIP < 0 or START_MONTH else INITIAL_SKIP

    base_filename = str(os.environ.get("BASE_OUTPUT_FILENAME", "invalid-data"))
    OUTPUT_FILE = filename(base_filename, START_DATE, END_DATE, START_MONTH, END_MONTH, INITIAL_SKIP)

    REPAIR = str(os.environ.get("REPAIR", "false")).lower() == "true"
    REPAIR = False if START_MONTH else REPAIR # repair is not supported for spot checking multiple months

    VERBOSE = str(os.environ.get("VERBOSE", "false")).lower() == "true"
    DRYRUN = str(os.environ.get("DRYRUN", "false")).lower() == "true"

def filename(base_filename, start_date, end_date, start_month, end_month, initial_skip):
    """Generate output filename based on the parameters passed in (e.g. 2024-01-01_thru_2024-01-31_invalid-data_offset-1200.json)"""
    start_dt = start_date if start_date else start_month
    end_dt = end_date if end_date else end_month
    offset = ''
    if initial_skip > 0:
        offset = f"_offset-{initial_skip}"
        
    return start_dt + '_thru_' + end_dt + '_' + base_filename + offset + ".json"

def custom_range_label():
    """Generate a range label for the custom date range"""
    return f"{START_DATE}_thru_{END_DATE}_offset-{INITIAL_SKIP}"
    

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

def repair_all(service_url, coordinates):
    """Repair the data by requesting the definitions from the service with the force parameter"""
    if VERBOSE:
        print(f"  Repairing data for {len(coordinates)} coordinates")
    url = f"{service_url}/definitions?force=true"
    res = requests.post(url, '\n'.join(coordinates))
    if res.status_code != 200:
        return {}
    return res.json()

def dump_data(data, filename):
    """Write the data to a file"""
    with open(filename, "w") as f:
        json.dump(data, f)

def initialize_stats(range_label, total_docs_count, invalid_data):
    """Initialize stats for the range"""
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
    """Update the stats for the range at each checkpoint or at the end of a page of data"""
    invalid_data[range_label]["stats"]["sample_total"] = sample_count
    invalid_data[range_label]["stats"]["sample_invalid"] = invalid_count

    percent_invalid = round(invalid_count / sample_count * 100, 2)
    invalid_data[range_label]["stats"]["percent_invalid"] = str(percent_invalid) + "%"

    total_count = invalid_data[range_label]["stats"]["total_documents"]
    invalid_data[range_label]["stats"]["total_estimated_invalid"] = round((total_count * percent_invalid) / 100)
    invalid_data[range_label]["stats"]["sample_percent_of_total"] = str(round((sample_count / total_count * 100), 2)) + "%"

    repaired = ""
    if checkpoint and VERBOSE:
        print(
            f"  Checkpoint: total invalid data: {invalid_count}, total items {sample_count} ({percent_invalid}%) - {datetime.now()}"
        )
    else:
        if REPAIR:
            repaired = " (repaired)"
        print(
            f"  Total invalid data: {invalid_count}{repaired}, total items {sample_count} ({percent_invalid}%) - {datetime.now()}"
        )
    dump_data(invalid_data, OUTPUT_FILE)

def create_months(start_month, end_month):
    """Create a list of months between the start and end months"""
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

def page_count_and_setup(collection, all_query, missing_query, range_label, invalid_data):
    """Get the count of pages and set up the stats for the range"""
    all_docs_count = collection.count_documents(
        all_query, 
        max_time_ms=10000000
    )

    docs_with_missing_count = collection.count_documents(
        missing_query,
        max_time_ms=10000000
    )
    initialize_stats(range_label, docs_with_missing_count, invalid_data)
    if docs_with_missing_count == 0:
        if DRYRUN:
            print(f"{range_label}, {all_docs_count}, 0%, 0, 0, 0")
        else:
            print(f"No documents found with missing licenses out of {all_docs_count} total in {range_label}.")
        return 0

    if INITIAL_SKIP > 0:
        print(f"Skipping {INITIAL_SKIP} documents")
        docs_with_missing_count -= INITIAL_SKIP

    page_count = docs_with_missing_count // PAGE_SIZE
    if docs_with_missing_count % PAGE_SIZE:
        page_count += 1

    est_hours_to_complete = round(page_count * 2.5 / 60)
    est_completion_time = datetime.now() + timedelta(hours=est_hours_to_complete)

    if DRYRUN:
        print(f"{range_label}, {all_docs_count}, {docs_with_missing_count}, {round(docs_with_missing_count/all_docs_count, 4)*100}%, {est_hours_to_complete}, {round(est_hours_to_complete / 24, 2)}")
    else:
        print(f"Found {docs_with_missing_count} documents missing licenses out of {all_docs_count} total in {range_label}.  Estimated time to complete is {est_hours_to_complete} hours ending at {est_completion_time}.")

    return page_count

def analyze_docs(collection, query, range_label, invalid_data, one_pass=False):
    """Analyze the documents in the collection for the given query"""
    missing_query = {**query, "licensed.declared": {"$exists": False}}
    page_count = page_count_and_setup(collection, query, missing_query, range_label, invalid_data)
    if page_count == 0 or DRYRUN:
        return
    
    running_count_docs = 0
    running_count_invalid = 0
    page = 0
    skip = 0
    if INITIAL_SKIP > 0:
        skip = INITIAL_SKIP
    while True:
        print(f"Processing page {page+1} of {page_count} in {range_label} starting at offset {skip} - {datetime.now()}")
        docs = collection.find(missing_query).skip(skip).limit(PAGE_SIZE).max_time_ms(10000000)
        new_docs_count, new_invalid_count = analyze_page_of_docs(docs, running_count_docs, running_count_invalid, range_label, invalid_data)
        running_count_invalid += new_invalid_count
        running_count_docs += new_docs_count
        if new_docs_count == 0 or one_pass:
            break
        page += 1
        skip = page * PAGE_SIZE + INITIAL_SKIP

def analyze_page_of_docs(docs, running_count_docs, running_count_invalid, range_label, invalid_data):
    """Analyze a page of documents"""
    count_docs = 0
    count_invalid = 0

    repair_list = []
    bulk_operations = []

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
                # add the coordinates to the repair list
                coordinates = urllib.parse.quote(
                    doc["coordinates"]["type"] + \
                    doc["coordinates"]["provider"] + \
                    doc["coordinates"].get("namespace", "-") + \
                    doc["coordinates"]["name"] + \
                    doc["coordinates"]["revision"]
                )
                repair_list.append(coordinates)

                bulk_operations.append(
                    pymongo.UpdateOne(
                        {"_id": doc["_id"]},
                        {"$set": {"licensed.declared": blob_licensed.get("declared")}},
                    )
                )
            
        # Checkpoint in case mongo dies
        if count_docs % 100 == 0:
            total_invalid = running_count_invalid + count_invalid
            total_docs = running_count_docs + count_docs
            update_stats(invalid_data, total_invalid, range_label, total_docs, True)

    if REPAIR and len(repair_list) > 0:
        collection.bulk_write(bulk_operations)
        blob = repair_all(
            SERVICE_API_URL,
            repair_list
        )
        if VERBOSE:
            print(f"Repaired {len(repair_list)} items")

    total_invalid = running_count_invalid + count_invalid
    total_docs = running_count_docs + count_docs
    update_stats(invalid_data, total_invalid, range_label, total_docs)
    return count_docs, count_invalid


### Main ###
initialize()

print(f"Starting data synchronization analysis at {datetime.now()}")
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

    if DRYRUN:
        print("Range, # all docs, # missing, % missing, est hours to complete, est days to complete")

    label = custom_range_label() if not DRYRUN else f"{custom_range_label()}_dryrun"
    analyze_docs(
        collection,
        {
            "_meta.updated": {"$gte": START_DATE, "$lte": END_DATE},
        },
        label,
        invalid_data,
    ) 

else:
    INITIAL_SKIP = 0
    print("Processing by months")
    print(f"  START_MONTH: {START_MONTH}")
    print(f"  END_MONTH: {END_MONTH}")
    months = create_months(START_MONTH, END_MONTH)
    print(f"  {months}")

    if DRYRUN:
        print("Range, # all docs, # missing, % missing, est hours to complete, est days to complete")

    for month in months:
        if not DRYRUN:
            print(f"Processing {month}")

        analyze_docs(
            collection,
            {
                "_meta.updated": {"$gte": f"{month}-01", "$lte": f"{month}-31"},
            },
            month,
            invalid_data,
            one_pass=True,
        ) 
        
dump_data(invalid_data, OUTPUT_FILE)

if DRYRUN:
    print("Dry run completed. No data was modified.")
