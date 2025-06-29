from flask import Flask, render_template, request, jsonify
from elasticsearch import Elasticsearch
from dotenv import load_dotenv
import os
import json
import warnings
from urllib3.exceptions import InsecureRequestWarning

# Suppress the SSL warning for unverified HTTPS requests
warnings.filterwarnings('ignore', category=InsecureRequestWarning)

# Load environment variables
load_dotenv('variables.env')

# Elasticsearch configuration
ES_URL = os.getenv('ES_URL')
ES_API_KEY = os.getenv('ES_API_KEY')
ES_USERNAME = os.getenv('ES_USERNAME', 'elastic')
ES_PASSWORD = os.getenv('ES_PASSWORD')
USE_PASSWORD = os.getenv('USE_PASSWORD', 'false').lower() == 'true'

# Initialize Elasticsearch client
if USE_PASSWORD:
    es = Elasticsearch(
        ES_URL,
        basic_auth=(ES_USERNAME, ES_PASSWORD),
        verify_certs=False,
        request_timeout=300
    )
else:
    es = Elasticsearch(
        ES_URL,
        api_key=ES_API_KEY,
        verify_certs=False,
        request_timeout=300
    )

app = Flask(__name__)

# Available indices
INDICES = [
    'hotels'
]

# At the top of the file, after imports
ELSER_INFERENCE_ID = os.environ.get("ELSER_INFERENCE_ID", ".elser-2-elasticsearch")
E5_INFERENCE_ID = os.environ.get("E5_INFERENCE_ID", ".multilingual-e5-small-elasticsearch")
RERANKER_INFERENCE_ID = os.environ.get("RERANKER_INFERENCE_ID", ".rerank-v1-elasticsearch")

def get_search_query(query_text, weights, index, enable_reranking=False, reranking_params=None, selected_fields=None, highlight_config=None, size=20, retriever_type='linear', rrf_rank_window_size=20, enable_location_filter=False, location_params=None, rating_params=None):
    print("DEBUG: get_search_query called with weights:", weights)
    print("DEBUG: weights type:", type(weights))
    print("DEBUG: individual weight values - ada002:", weights.get('ada002'), "type:", type(weights.get('ada002')))
    print("DEBUG: individual weight values - elser:", weights.get('elser'), "type:", type(weights.get('elser')))
    print("DEBUG: individual weight values - text:", weights.get('text'), "type:", type(weights.get('text')))
    
    if reranking_params is None:
        reranking_params = {
            'rank_window_size': 10
        }
    
    # Default fields if none selected
    if selected_fields is None:
        selected_fields = ["HotelName", "Description", "Address", "cityName", "HotelFacilities", "Attractions"]

    # Default highlight config if none provided
    if highlight_config is None:
        highlight_config = {
            "HotelName": {
                "number_of_fragments": 1,
                "order": "score"
            },
            "Description": {
                "number_of_fragments": 2,
                "order": "score"
            },
            "Address": {
                "number_of_fragments": 1,
                "order": "score"
            },
            "HotelFacilities": {
                "number_of_fragments": 1,
                "order": "score"
            },
            "semantic_description_e5": {
                "type": "semantic",
                "number_of_fragments": 2,
                "order": "score"
            },
            "semantic_description_elser": {
                "type": "semantic",
                "number_of_fragments": 2,
                "order": "score"
            }
        }

    # Hotels search query
    base_query = {
        "fields": ["HotelName", "Description", "Address", "cityName", "HotelFacilities", "HotelRating", "Attractions"],
        "size": size,
        "highlight": {
            "fields": highlight_config
        }
    }

    # Prepare geo filter if location filtering is enabled
    geo_filter = None
    if enable_location_filter and location_params:
        lat = location_params.get('latitude')
        lon = location_params.get('longitude')
        distance_miles = location_params.get('distance', 10)
        
        if lat is not None and lon is not None:
            geo_filter = {
                "bool": {
                    "must": [
                        {
                            "geo_distance": {
                                "distance": f"{distance_miles}mi",
                                "location": {
                                    "lat": lat,
                                    "lon": lon
                                }
                            }
                        }
                    ]
                }
            }

    # Prepare rating filter if rating filtering is enabled
    rating_filter = None
    if rating_params:
        min_rating = rating_params.get('minRating')
        max_rating = rating_params.get('maxRating')
        
        if min_rating is not None and max_rating is not None and min_rating > 0:
            # Only apply filter if minimum rating is greater than 0
            rating_filter = {
                "bool": {
                    "must": [
                        {
                            "range": {
                                "HotelRating": {
                                    "gte": min_rating
                                }
                            }
                        }
                    ]
                }
            }

    # Combine filters if both are present
    combined_filter = None
    if geo_filter and rating_filter:
        combined_filter = {
            "bool": {
                "must": [
                    geo_filter,
                    rating_filter
                ]
            }
        }
    elif geo_filter:
        combined_filter = geo_filter
    elif rating_filter:
        combined_filter = rating_filter

    # Build retriever based on type
    if retriever_type == 'linear':
        # Prepare standard retriever base with optional geo filter
        def create_standard_retriever(query_part):
            retriever = {
                "standard": {
                    "query": query_part
                }
            }
            if combined_filter:
                retriever["standard"]["filter"] = [combined_filter]
            return retriever

        base_query["retriever"] = {
            "linear": {
                "retrievers": [
                    {
                        "retriever": create_standard_retriever({
                            "semantic": {
                                "field": "semantic_description_e5",
                                "query": query_text
                            }
                        }),
                        "weight": weights['ada002'],  # Using ada002 weight for E5
                        "normalizer": "minmax"
                    },
                    {
                        "retriever": create_standard_retriever({
                            "multi_match": {
                                "query": query_text,
                                "fields": selected_fields,
                                "type": "best_fields"
                            }
                        }),
                        "weight": weights['text'],
                        "normalizer": "minmax"
                    },
                    {
                        "retriever": create_standard_retriever({
                            "semantic": {
                                "field": "semantic_description_elser",
                                "query": query_text
                            }
                        }),
                        "weight": weights['elser'],
                        "normalizer": "minmax"
                    }
                ],
                "rank_window_size": 100
            }
        }
        
        # Debug: Print the actual weights being used in the query
        print("DEBUG: Final retriever weights in query:")
        print("  - E5 (ada002):", base_query["retriever"]["linear"]["retrievers"][0]["weight"])
        print("  - Text (text):", base_query["retriever"]["linear"]["retrievers"][1]["weight"])
        print("  - ELSER (elser):", base_query["retriever"]["linear"]["retrievers"][2]["weight"])
    elif retriever_type == 'rrf':
        # Prepare standard retriever base with optional geo filter
        def create_standard_retriever(query_part):
            retriever = {
                "standard": {
                    "query": query_part
                }
            }
            if combined_filter:
                retriever["standard"]["filter"] = [combined_filter]
            return retriever

        base_query["retriever"] = {
            "rrf": {
                "retrievers": [
                    create_standard_retriever({
                        "semantic": {
                            "field": "semantic_description_e5",
                            "query": query_text
                        }
                    }),
                    create_standard_retriever({
                        "semantic": {
                            "field": "semantic_description_elser",
                            "query": query_text
                        }
                    }),
                    create_standard_retriever({
                        "multi_match": {
                            "query": query_text,
                            "fields": selected_fields,
                            "type": "best_fields"
                        }
                    })
                ],
                "rank_window_size": rrf_rank_window_size
            }
        }

    # Add reranking if enabled
    if enable_reranking:
        base_query = {
            "_source": base_query.get("_source", False),
            "fields": base_query.get("fields", ["text"]),
            "retriever": {
                "text_similarity_reranker": {
                    "field": "Description",
                    "inference_id": RERANKER_INFERENCE_ID,
                    "inference_text": query_text,
                    "rank_window_size": reranking_params['rank_window_size'],
                    "retriever": base_query["retriever"]
                }
            },
            "highlight": base_query["highlight"]
        }

    return base_query

@app.route('/')
def index():
    return render_template('index.html', indices=INDICES)

@app.route('/search', methods=['POST'])
def search():
    data = request.get_json()
    query = data.get('query')
    
    # Get weights from request, but only use defaults if weights are not provided at all
    weights_data = data.get('weights')
    if weights_data is None:
        # Only use defaults if weights object is completely missing
        weights = {
            'ada002': 2.0,
            'elser': 1.5,
            'text': 1.0
        }
        print("DEBUG: Using default weights:", weights)
    else:
        # Use the weights exactly as provided, even if they are 0
        weights = weights_data
        print("DEBUG: Received weights from frontend:", weights)
    
    enable_reranking = data.get('enableReranking', False)
    reranking_params = data.get('rerankingParams', {
        'rankWindowSize': 10
    })
    selected_fields = data.get('selectedFields', ["HotelName", "Description", "Address", "cityName", "HotelFacilities", "Attractions"])
    highlight_config = data.get('highlightConfig', None)
    result_size = data.get('resultSize', 20)
    retriever_type = data.get('retrieverType', 'linear')
    rrf_rank_window_size = data.get('rrfRankWindowSize', 20)
    enable_location_filter = data.get('enableLocationFilter', False)
    location_params = data.get('locationParams', None)
    rating_params = data.get('ratingParams', None)
    
    if not query:
        return jsonify({'error': 'Please enter a search query'})
    
    try:
        search_query = get_search_query(
            query, 
            weights, 
            'hotels',  # Always use hotels index
            enable_reranking,
            {
                'rank_window_size': reranking_params['rankWindowSize']
            },
            selected_fields,
            highlight_config,
            result_size,
            retriever_type,
            rrf_rank_window_size,
            enable_location_filter,
            location_params,
            rating_params
        )
        
        # Debug logging for the final query weights
        if retriever_type == 'linear' and 'retriever' in search_query and 'linear' in search_query['retriever']:
            retrievers = search_query['retriever']['linear']['retrievers']
            print("DEBUG: Final query weights:", {
                'E5 (ada002)': retrievers[0]['weight'],
                'Text (text)': retrievers[1]['weight'],
                'ELSER (elser)': retrievers[2]['weight']
            })
        
        # Debug logging for reranker configuration
        if enable_reranking:
            print("DEBUG: Reranker enabled with config:", {
                'field': search_query['retriever']['text_similarity_reranker']['field'],
                'inference_id': search_query['retriever']['text_similarity_reranker']['inference_id'],
                'rank_window_size': search_query['retriever']['text_similarity_reranker']['rank_window_size']
            })
        
        print("DEBUG: Executing search query:", json.dumps(search_query, indent=2))
        
        response = es.search(
            index='hotels',  # Always use hotels index
            body=search_query
        )
        
        results = []
        for hit in response['hits']['hits']:
            result = {
                'score': str(hit['_score']),
                'highlights': [],
                '_id': hit['_id']
            }
            
            # Hotels result processing - using fields format
            fields = hit.get('fields', {})
            result['HotelName'] = fields.get('HotelName', ['N/A'])[0] if fields.get('HotelName') else 'N/A'
            result['Description'] = fields.get('Description', ['N/A'])[0] if fields.get('Description') else 'N/A'
            result['Address'] = fields.get('Address', ['N/A'])[0] if fields.get('Address') else 'N/A'
            result['HotelFacilities'] = fields.get('HotelFacilities', ['N/A'])[0] if fields.get('HotelFacilities') else 'N/A'
            result['HotelRating'] = fields.get('HotelRating', [0])[0] if fields.get('HotelRating') else 0
            result['cityName'] = fields.get('cityName', ['N/A'])[0] if fields.get('cityName') else 'N/A'
            result['Attractions'] = fields.get('Attractions', ['N/A'])[0] if fields.get('Attractions') else 'N/A'
            
            if 'highlight' in hit:
                for field, fragments in hit['highlight'].items():
                    result['highlights'].extend(fragments)
            
            results.append(result)
        
        return jsonify({
            'results': results,
            'query': search_query
        })
        
    except ValueError as e:
        print(f"ERROR: ValueError in search: {str(e)}")
        return jsonify({'error': str(e)})
    except Exception as e:
        print(f"ERROR: Exception in search: {str(e)}")
        print(f"ERROR: Exception type: {type(e).__name__}")
        import traceback
        print(f"ERROR: Full traceback: {traceback.format_exc()}")
        
        # Provide more specific error messages for common issues
        error_msg = str(e)
        if "text_similarity_reranker" in error_msg:
            error_msg = f"Reranker error: {error_msg}. Please check if the reranker model is available in your Elasticsearch cluster."
        elif "inference_id" in error_msg:
            error_msg = f"Inference model error: {error_msg}. Please check if the required models are deployed."
        elif "field" in error_msg and "combined_fields" in error_msg:
            error_msg = "Field error: The specified field does not exist in the index."
        
        return jsonify({'error': error_msg})

@app.route('/wake-elser', methods=['POST'])
def wake_elser():
    try:
        # Wake up ELSER model
        elser_response = es.inference.inference(
            inference_id=ELSER_INFERENCE_ID,
            input=['vector are so much fun']
        )
        
        # Wake up multilingual E5 model
        e5_response = es.inference.inference(
            inference_id=E5_INFERENCE_ID,
            input=['vector are so much fun']
        )
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/check-reranker', methods=['POST'])
def check_reranker():
    try:
        # Check if reranker model is available
        response = es.inference.inference(
            inference_id=RERANKER_INFERENCE_ID,
            input=['test query for reranker availability check']
        )
        return jsonify({'success': True, 'message': 'Reranker model is available'})
    except Exception as e:
        print(f"ERROR: Reranker check failed: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/execute-query', methods=['POST'])
def execute_query():
    try:
        data = request.get_json()
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'})
        
        # Execute the query on hotels index
        response = es.search(
            index='hotels',  # Always use hotels index
            body=query
        )
        
        results = []
        for hit in response['hits']['hits']:
            result = {
                'score': str(hit['_score']),
                'highlights': [],
                '_id': hit['_id']
            }
            
            # Hotels result processing - using fields format
            fields = hit.get('fields', {})
            result['HotelName'] = fields.get('HotelName', ['N/A'])[0] if fields.get('HotelName') else 'N/A'
            result['Description'] = fields.get('Description', ['N/A'])[0] if fields.get('Description') else 'N/A'
            result['Address'] = fields.get('Address', ['N/A'])[0] if fields.get('Address') else 'N/A'
            result['HotelFacilities'] = fields.get('HotelFacilities', ['N/A'])[0] if fields.get('HotelFacilities') else 'N/A'
            result['HotelRating'] = fields.get('HotelRating', [0])[0] if fields.get('HotelRating') else 0
            result['cityName'] = fields.get('cityName', ['N/A'])[0] if fields.get('cityName') else 'N/A'
            result['Attractions'] = fields.get('Attractions', ['N/A'])[0] if fields.get('Attractions') else 'N/A'
            
            if 'highlight' in hit:
                for field, fragments in hit['highlight'].items():
                    result['highlights'].extend(fragments)
            
            results.append(result)
        
        return jsonify({
            'results': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=5001) 