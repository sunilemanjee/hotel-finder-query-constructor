#!/bin/bash

apt install python3-pip -y
python3 -m pip install --quiet "elasticsearch>=7.0.0,<9.0.0"
python3 -m pip install --quiet pandas
python3 -m pip install --quiet requests 
python3 -m pip install --quiet xgboost 
python3 -m pip install --quiet scikit-learn 
python3 -m pip install --quiet --force-reinstall "eland==8.18.1" "eland[scikit-learn]==8.18.1" xgboost tqdm

set -euxo pipefail

# Elasticsearch credentials
USERNAME="elastic"
PASSWORD="changeme"

# Elasticsearch host and index name
HOST="kubernetes-vm:9200"
INDEX_NAME="movies"

# Run Python code within the shell script
python3 <<'EOF'
import json
import requests
import elasticsearch.helpers as es_helpers
import pandas as pd
from elasticsearch import Elasticsearch
from urllib.request import urlopen
from urllib.parse import urljoin
import os 
import requests


# Elasticsearch connection
es_client = Elasticsearch("http://kubernetes-vm:9200", basic_auth=("elastic", "changeme"))

# Print Elasticsearch client info for debugging
print("Elasticsearch client info:")
print(es_client.info())

# URLs for settings and data
DATASET_BASE_URL = "https://raw.githubusercontent.com/elastic/elasticsearch-labs/main/notebooks/search/sample_data/learning-to-rank/"
INDEX_SETTINGS_URL = urljoin(DATASET_BASE_URL, "movies-index-settings.json")
CORPUS_URL = urljoin(DATASET_BASE_URL, "movies-corpus.jsonl.gz")
MODEL_URL = "https://sunmanapp.blob.core.windows.net/publicstuff/ltr/ltr_model.xgb"

MOVIE_INDEX = "movies"

# Delete index if it exists
print("Deleting index if it already exists:", MOVIE_INDEX)
es_client.options(ignore_status=[400, 404]).indices.delete(index=MOVIE_INDEX)

# Create index with settings
print("Creating index:", MOVIE_INDEX)
print("Index settings URL:", INDEX_SETTINGS_URL)

index_settings = json.load(urlopen(INDEX_SETTINGS_URL))
es_client.indices.create(index=MOVIE_INDEX, **index_settings)

# Load the corpus
print(f"Loading the corpus from {CORPUS_URL}")
corpus_df = pd.read_json(CORPUS_URL, lines=True)

# Index documents into Elasticsearch
print(f"Indexing the corpus into {MOVIE_INDEX} ...")
bulk_result = es_helpers.bulk(
    es_client,
    actions=[
        {"_id": movie["id"], "_index": MOVIE_INDEX, **movie}
        for movie in corpus_df.to_dict("records")
    ],
)
print(f"Indexed {bulk_result[0]} documents into {MOVIE_INDEX}")



EOF



python3 <<'EOF'
from elasticsearch import Elasticsearch
from urllib.request import urlopen
from urllib.parse import urljoin
import os 
import requests
from eland.ml.ltr import LTRModelConfig, QueryFeatureExtractor
from xgboost import XGBRanker
from eland.ml import MLModel


# Elasticsearch connection
es_client = Elasticsearch("http://kubernetes-vm:9200", basic_auth=("elastic", "changeme"))

# Print Elasticsearch client info for debugging
print("Elasticsearch client info:")
print(es_client.info())

MODEL_URL = "https://sunmanapp.blob.core.windows.net/publicstuff/ltr/ltr_model.xgb"
LEARNING_TO_RANK_MODEL_ID = "ltr-model-xgboost"
url = "https://sunmanapp.blob.core.windows.net/publicstuff/ltr/ltr_model.xgb"


ltr_config = LTRModelConfig(
    feature_extractors=[
        # For the following field we want to use the score of the match query for the field as a features:
        QueryFeatureExtractor(
            feature_name="title_bm25", query={"match": {"title": "{{query}}"}}
        ),
        QueryFeatureExtractor(
            feature_name="actors_bm25", query={"match": {"actors": "{{query}}"}}
        ),
        # We could also use a more strict matching clause as an additional features. Here we want all the terms of our query to match.
        QueryFeatureExtractor(
            feature_name="title_all_terms_bm25",
            query={
                "match": {
                    "title": {"query": "{{query}}", "minimum_should_match": "100%"}
                }
            },
        ),
        QueryFeatureExtractor(
            feature_name="actors_all_terms_bm25",
            query={
                "match": {
                    "actors": {"query": "{{query}}", "minimum_should_match": "100%"}
                }
            },
        ),
        # Also we can use a script_score query to get the document field values directly as a feature.
        QueryFeatureExtractor(
            feature_name="popularity",
            query={
                "script_score": {
                    "query": {"exists": {"field": "popularity"}},
                    "script": {"source": "return doc['popularity'].value;"},
                }
            },
        ),
    ]
)


# Define the directory path
directory_path = "/root/ltr"

# Create the directory if it does not exist
if not os.path.exists(directory_path):
    os.makedirs(directory_path)
    print(f"Directory created: {directory_path}")
else:
    print(f"Directory already exists: {directory_path}")

local_model_path = "/root/ltr/ltr_model.xgb"


# Download the model
response = requests.get(url)
with open(local_model_path, 'wb') as file:
    file.write(response.content)

# Load the model
ranker = XGBRanker()
ranker.load_model(local_model_path)

print("Model imported successfully!")


MLModel.import_ltr_model(
    es_client=es_client,
    model=ranker,
    model_id=LEARNING_TO_RANK_MODEL_ID,
    ltr_model_config=ltr_config,
    es_if_exists="replace",
)

print("Model loaded into ES successfully!")
EOF



exit 0
