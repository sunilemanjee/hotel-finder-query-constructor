#!/bin/bash
set -euxo pipefail

# Source environment variables
if [ -f "variables.env" ]; then
    source variables.env
    echo "Loaded environment variables from variables.env"
else
    echo "Warning: variables.env file not found"
fi

# Install dependencies
apt update && apt install -y python3-pip
python3 -m pip install --quiet elasticsearch requests


# Failure function for error messages
fail_message() {
  echo "$1" >&2
  exit 1
}

# Create inferencing endpoints and ingest data
python3 <<'EOF'
import os
import json
import requests
from elasticsearch import Elasticsearch, helpers, NotFoundError

# Elasticsearch configuration from environment variables
ES_URL = os.getenv("ES_URL", "http://kubernetes-vm:9200")
ES_API_KEY = os.getenv("ES_API_KEY")
ES_INDEX = "hotels"

# JSON dataset URL
DATASET_URL = "https://ela.st/hotels-dataset"

# Connect to Elasticsearch using API key if available, otherwise fallback to basic auth
if ES_API_KEY:
    print(f"Connecting to Elasticsearch using API key at: {ES_URL}")
    es = Elasticsearch(ES_URL, api_key=ES_API_KEY, request_timeout=120)
else:
    print(f"Connecting to Elasticsearch using basic auth at: {ES_URL}")
    ES_USER = os.getenv("ELASTIC_USERNAME", "elastic")
    ES_PASS = os.getenv("ELASTIC_PASSWORD", "changeme")
    es = Elasticsearch(ES_URL, basic_auth=(ES_USER, ES_PASS), request_timeout=120)

# Define the index mapping
INDEX_MAPPING = {
    "mappings": {
        "properties": {
            "Address": {"type": "text"},
            "Attractions": {"type": "text"},
            "Description": {"type": "text"},
            "FaxNumber": {"type": "text"},
            "HotelCode": {"type": "long"},
            "HotelFacilities": {"type": "text"},
            "HotelName": {"type": "text"},
            "HotelRating": {"type": "long"},
            "HotelWebsiteUrl": {"type": "keyword"},
            "Map": {"type": "keyword"},
            "PhoneNumber": {"type": "text"},
            "PinCode": {"type": "keyword"},
            "cityCode": {"type": "long"},
            "cityName": {"type": "text"},
            "combined_fields": {
                "type": "text",
                "copy_to": [
                    "semantic_description_elser",
                    "semantic_description_e5"
                    ]
                },
            "countryCode": {"type": "keyword"},
            "countryName": {"type": "keyword"},
            "latitude": {"type": "double"},
            "location": {"type": "geo_point"},
            "longitude": {"type": "double"},
            "semantic_description_e5": {
                    "type": "semantic_text",
                    "inference_id": ".multilingual-e5-small-elasticsearch"
            },
            "semantic_description_elser": {
                    "type": "semantic_text",
                    "inference_id": ".elser-2-elasticsearch"
    }
        }
    }
}

# Step 1: Create the index with mapping
def create_index():
    try:
        if es.indices.exists(index=ES_INDEX):
            print(f"Index '{ES_INDEX}' already exists. Deleting and recreating...")
            es.indices.delete(index=ES_INDEX)
        
        es.indices.create(index=ES_INDEX, body=INDEX_MAPPING)
        print(f"Index '{ES_INDEX}' created successfully.")
    except Exception as e:
        print(f"Error creating index: {e}")
        exit(1)

# Step 2: Download the JSON file
def download_json():
    print("Downloading dataset...")
    print(f"Using URL: {DATASET_URL}")
    
    # Start the request
    response = requests.get(DATASET_URL, stream=True)
    print(f"Received response with status code: {response.status_code}")
    
    # Check for errors
    try:
        response.raise_for_status()
        print("Response status is OK.")
    except requests.HTTPError as e:
        print(f"HTTP error occurred: {e}")
        raise

    # Optionally, show some headers (use carefully in production)
    print("Response headers:")
    for key, value in response.headers.items():
        print(f"  {key}: {value}")

    # Now return an iterator for the response lines
    print("Returning line iterator for the response content.")
    return response.iter_lines()

# Step 3: Ingest JSON records into Elasticsearch
def ingest_data():
    print("Ingesting data into Elasticsearch...")
    actions = []

    for line in download_json():
        if line:
            record = json.loads(line)
            # Convert latitude/longitude to geo_point format
            if "latitude" in record and "longitude" in record:
                record["location"] = {"lat": record["latitude"], "lon": record["longitude"]}
            
            actions.append({"_index": ES_INDEX, "_source": record})

            # Bulk index in batches of 50
            if len(actions) >= 50:
                helpers.bulk(es, actions)
                print(f"Ingested {len(actions)} records...")
                actions = []

    # Ingest any remaining records
    if actions:
        helpers.bulk(es, actions)
        print(f"Ingested {len(actions)} remaining records.")

    print("Data ingestion complete.")

# Run the steps
create_index()
ingest_data()
EOF

echo "Elasticsearch ingestion completed successfully."
