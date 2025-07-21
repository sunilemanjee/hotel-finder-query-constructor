from flask import Flask, render_template, request, jsonify
from elasticsearch import Elasticsearch
from dotenv import load_dotenv
import os
import json
import warnings
from urllib3.exceptions import InsecureRequestWarning
import requests
import logging
from datetime import datetime

# Suppress the SSL warning for unverified HTTPS requests
warnings.filterwarnings('ignore', category=InsecureRequestWarning)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # Console output
        logging.FileHandler('search_ui.log')  # File output
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv('variables.env')

# Elasticsearch configuration
ES_URL = os.getenv('ES_URL')
ES_API_KEY = os.getenv('ES_API_KEY')
ES_USERNAME = os.getenv('ES_USERNAME', 'elastic')
ES_PASSWORD = os.getenv('ES_PASSWORD')
ES_INDEX = os.getenv('ES_INDEX', 'properties')
USE_PASSWORD = os.getenv('USE_PASSWORD', 'false').lower() == 'true'

# LLM/Azure OpenAI configuration
OPENAI_ENDPOINT = os.getenv('OPENAI_ENDPOINT')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
OPENAI_MODEL = os.getenv('OPENAI_MODEL')
OPENAI_API_VERSION = os.getenv('OPENAI_API_VERSION')

# Initialize Elasticsearch client
if USE_PASSWORD:
    es = Elasticsearch(
        ES_URL,
        basic_auth=(ES_USERNAME, ES_PASSWORD),
        request_timeout=300
    )
else:
    es = Elasticsearch(
        ES_URL,
        api_key=ES_API_KEY,
        request_timeout=300
    )

app = Flask(__name__)

# Available indices
INDICES = [
    ES_INDEX
]

# At the top of the file, after imports
ELSER_INFERENCE_ID = os.environ.get("ELSER_INFERENCE_ID", ".elser-2-elasticsearch")
E5_INFERENCE_ID = os.environ.get("E5_INFERENCE_ID", ".multilingual-e5-small-elasticsearch")
RERANKER_INFERENCE_ID = os.environ.get("RERANKER_INFERENCE_ID", ".rerank-v1-elasticsearch")

def get_search_query(query_text, weights, index, enable_reranking=False, reranking_params=None, selected_fields=None, highlight_config=None, size=20, retriever_type='linear', rrf_rank_window_size=20, enable_location_filter=False, location_params=None, price_params=None, multi_match_type='best_fields', enable_explain=False):
    logger.info(f"Building search query for: '{query_text}' with retriever_type: {retriever_type}")
    logger.debug(f"Weights configuration: {weights}")
    logger.debug(f"Weight types - ada002: {type(weights.get('ada002'))}, elser: {type(weights.get('elser'))}, text: {type(weights.get('text'))}")
    
    if reranking_params is None:
        reranking_params = {
            'rank_window_size': 5,
            'reranker_field': 'meta_description'
        }
    
    # Default fields if none selected
    if selected_fields is None:
        selected_fields = ["title", "property-description", "property-features", "meta_description", "headings"]

    # Default highlight config if none provided
    if highlight_config is None:
        highlight_config = {
            "title": {
                "number_of_fragments": 1,
                "order": "score"
            },
            "property-description": {
                "number_of_fragments": 2,
                "order": "score"
            },
            "property-features": {
                "number_of_fragments": 1,
                "order": "score"
            },
            "meta_description": {
                "number_of_fragments": 1,
                "order": "score"
            },
            "headings": {
                "number_of_fragments": 1,
                "order": "score"
            },
            "body_content_e5": {
                "type": "semantic",
                "number_of_fragments": 2,
                "order": "score"
            },
            "body_content_elser": {
                "type": "semantic",
                "number_of_fragments": 2,
                "order": "score"
            }
        }

    # Properties search query
    base_query = {
        "fields": ["title", "property-description", "property-features", "meta_description", "headings", "listing-agent-info", "property-status", "number-of-bedrooms", "number-of-bathrooms", "square-footage", "home-price", "annual-tax", "maintenance-fee"],
        "size": size,
        "highlight": {
            "fields": highlight_config
        }
    }
    
    # Add explain parameter if enabled
    if enable_explain:
        base_query["explain"] = True

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

    # Prepare price filter if price filtering is enabled
    price_filter = None
    if price_params:
        min_price = price_params.get('minPrice')
        max_price = price_params.get('maxPrice')
        
        if min_price is not None and max_price is not None:
            # Build range filter
            range_filter = {"home-price": {}}
            
            # Add minimum price if greater than 0
            if min_price > 0:
                range_filter["home-price"]["gte"] = min_price
            
            # Add maximum price if less than 10M (treat 10M as no upper limit)
            if max_price < 10000000:
                range_filter["home-price"]["lte"] = max_price
            
            # Only create filter if we have at least one condition
            if range_filter["home-price"]:
                price_filter = {
                    "bool": {
                        "must": [
                            {
                                "range": range_filter
                            }
                        ]
                    }
                }

    # Combine filters if both are present
    combined_filter = None
    if geo_filter and price_filter:
        combined_filter = {
            "bool": {
                "must": [
                    geo_filter,
                    price_filter
                ]
            }
        }
    elif geo_filter:
        combined_filter = geo_filter
    elif price_filter:
        combined_filter = price_filter

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
                                "field": "body_content_e5",
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
                                "type": multi_match_type
                            }
                        }),
                        "weight": weights['text'],
                        "normalizer": "minmax"
                    },
                    {
                        "retriever": create_standard_retriever({
                            "semantic": {
                                "field": "body_content_elser",
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
        
        # Log the actual weights being used in the query
        logger.info("Linear retriever weights configured:")
        logger.info(f"  - E5 (ada002): {base_query['retriever']['linear']['retrievers'][0]['weight']}")
        logger.info(f"  - Text (text): {base_query['retriever']['linear']['retrievers'][1]['weight']}")
        logger.info(f"  - ELSER (elser): {base_query['retriever']['linear']['retrievers'][2]['weight']}")
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
                            "field": "body_content_e5",
                            "query": query_text
                        }
                    }),
                    create_standard_retriever({
                        "semantic": {
                            "field": "body_content_elser",
                            "query": query_text
                        }
                    }),
                    create_standard_retriever({
                        "multi_match": {
                            "query": query_text,
                            "fields": selected_fields,
                            "type": multi_match_type
                        }
                    })
                ],
                "rank_window_size": rrf_rank_window_size
            }
        }

    # Add reranking if enabled
    if enable_reranking:
        reranker_field = reranking_params.get('reranker_field', 'meta_description')
        
        logger.info(f"Reranking enabled with field: {reranker_field}")
        
        # Validate that the reranker field is in the selected fields
        if reranker_field not in selected_fields:
            logger.warning(f"Reranker field '{reranker_field}' not in selected fields: {selected_fields}")
            # Add it to selected fields to ensure it's available
            if reranker_field not in selected_fields:
                selected_fields.append(reranker_field)
                logger.info(f"Added '{reranker_field}' to selected fields")
        
        # When reranking is enabled, use a simpler retriever structure similar to wake-elser
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
        
        # Create a simple retriever for reranking (similar to wake-elser function)
        simple_retriever = create_standard_retriever({
            "multi_match": {
                "query": query_text,
                "fields": selected_fields,
                "type": multi_match_type
            }
        })
        
        base_query = {
            "_source": base_query.get("_source", False),
            "fields": base_query.get("fields", ["text"]),
            "retriever": {
                "text_similarity_reranker": {
                    "field": reranker_field,
                    "inference_id": RERANKER_INFERENCE_ID,
                    "inference_text": query_text,
                    "rank_window_size": reranking_params['rank_window_size'],
                    "retriever": simple_retriever
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
        logger.info(f"Using default weights: {weights}")
    else:
        # Use the weights exactly as provided, even if they are 0
        weights = weights_data
        logger.info(f"Received weights from frontend: {weights}")
    
    enable_reranking = data.get('enableReranking', False)
    reranking_params = data.get('rerankingParams', {
        'rankWindowSize': 5,
        'rerankerField': 'meta_description'
    })
    selected_fields = data.get('selectedFields', ["title", "property-description", "property-features", "meta_description", "headings"])
    multi_match_type = data.get('multiMatchType', 'best_fields')
    highlight_config = data.get('highlightConfig', None)
    result_size = data.get('resultSize', 20)
    retriever_type = data.get('retrieverType', 'linear')
    rrf_rank_window_size = data.get('rrfRankWindowSize', 20)
    enable_location_filter = data.get('enableLocationFilter', False)
    location_params = data.get('locationParams', None)
    price_params = data.get('priceParams', None)
    enable_explain = data.get('enableExplain', False)
    
    if not query:
        return jsonify({'error': 'Please enter a search query'})
    
    try:
        search_query = get_search_query(
            query, 
            weights, 
            ES_INDEX,  # Use ES_INDEX
            enable_reranking,
            {
                'rank_window_size': reranking_params['rankWindowSize'],
                'reranker_field': reranking_params['rerankerField']
            },
            selected_fields,
            highlight_config,
            result_size,
            retriever_type,
            rrf_rank_window_size,
            enable_location_filter,
            location_params,
            price_params,
            multi_match_type,
            enable_explain
        )
        
        # Log the final query configuration
        if retriever_type == 'linear' and 'retriever' in search_query and 'linear' in search_query['retriever']:
            retrievers = search_query['retriever']['linear']['retrievers']
            logger.info("Final linear retriever weights:")
            logger.info(f"  - E5 (ada002): {retrievers[0]['weight']}")
            logger.info(f"  - Text (text): {retrievers[1]['weight']}")
            logger.info(f"  - ELSER (elser): {retrievers[2]['weight']}")
        
        # Log reranker configuration
        if enable_reranking:
            reranker_config = search_query['retriever']['text_similarity_reranker']
            logger.info("Reranker configuration:")
            logger.info(f"  - Field: {reranker_config['field']}")
            logger.info(f"  - Inference ID: {reranker_config['inference_id']}")
            logger.info(f"  - Rank window size: {reranker_config['rank_window_size']}")
            logger.debug(f"Full reranker structure: {json.dumps(reranker_config, indent=2)}")
        
        logger.info(f"Executing search on index: {ES_INDEX}")
        logger.debug(f"Full search query: {json.dumps(search_query, indent=2)}")
        
        start_time = datetime.now()
        response = es.search(
            index=ES_INDEX,  # Use ES_INDEX
            body=search_query
        )
        end_time = datetime.now()
        search_duration = (end_time - start_time).total_seconds()
        logger.info(f"Search completed in {search_duration:.2f} seconds")
        logger.info(f"Found {response['hits']['total']['value']} total results")
        
        results = []
        for hit in response['hits']['hits']:
            result = {
                'score': str(hit['_score']),
                'highlights': [],
                '_id': hit['_id']
            }
            
            # Properties result processing - using fields format
            fields = hit.get('fields', {})
            result['title'] = fields.get('title', ['N/A'])[0] if fields.get('title') else 'N/A'
            result['property-description'] = fields.get('property-description', ['N/A'])[0] if fields.get('property-description') else 'N/A'
            result['property-features'] = fields.get('property-features', ['N/A'])[0] if fields.get('property-features') else 'N/A'
            result['meta_description'] = fields.get('meta_description', ['N/A'])[0] if fields.get('meta_description') else 'N/A'
            result['headings'] = fields.get('headings', ['N/A'])[0] if fields.get('headings') else 'N/A'
            result['listing-agent-info'] = fields.get('listing-agent-info', ['N/A'])[0] if fields.get('listing-agent-info') else 'N/A'
            result['property-status'] = fields.get('property-status', ['N/A'])[0] if fields.get('property-status') else 'N/A'
            result['number-of-bedrooms'] = fields.get('number-of-bedrooms', [0])[0] if fields.get('number-of-bedrooms') else 0
            result['number-of-bathrooms'] = fields.get('number-of-bathrooms', [0])[0] if fields.get('number-of-bathrooms') else 0
            result['square-footage'] = fields.get('square-footage', [0])[0] if fields.get('square-footage') else 0
            result['home-price'] = fields.get('home-price', [0])[0] if fields.get('home-price') else 0
            result['annual-tax'] = fields.get('annual-tax', [0])[0] if fields.get('annual-tax') else 0
            result['maintenance-fee'] = fields.get('maintenance-fee', [0])[0] if fields.get('maintenance-fee') else 0
            
            if 'highlight' in hit:
                for field, fragments in hit['highlight'].items():
                    result['highlights'].extend(fragments)
            
            # Add explanation if available
            if '_explanation' in hit:
                result['explanation'] = hit['_explanation']
            
            results.append(result)
        
        logger.info(f"Returning {len(results)} results to frontend")
        return jsonify({
            'results': results,
            'query': search_query
        })
        
    except ValueError as e:
        logger.error(f"ValueError in search: {str(e)}")
        return jsonify({'error': str(e)})
    except Exception as e:
        logger.error(f"Exception in search: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        
        # Enhanced error logging for reranker issues
        if "text_similarity_reranker" in str(e) or "rank_docs_retriever" in str(e):
            logger.error(f"Reranker-specific error detected: {str(e)}")
            logger.error(f"Reranker configuration: {json.dumps(reranking_params, indent=2)}")
            logger.error(f"Search query with reranker: {json.dumps(search_query, indent=2)}")
            
        # Provide more specific error messages for common issues
        error_msg = str(e)
        if "model_deployment_timeout_exception" in error_msg:
            error_msg = "The inference models are not ready yet. Please click the 'Wake Inference Endpoints' button to launch the models, then try your search again."
        elif "text_similarity_reranker" in error_msg or "rank_docs_retriever" in error_msg:
            error_msg = f"Reranker error: {error_msg}. Please check if the reranker model is available in your Elasticsearch cluster and that the field '{reranking_params.get('reranker_field', 'meta_description')}' exists in your index."
        elif "inference_id" in error_msg:
            error_msg = f"Inference model error: {error_msg}. Please check if the required models are deployed."
        elif "field" in error_msg and "combined_fields" in error_msg:
            error_msg = "Field error: The specified field does not exist in the index."
        
        return jsonify({'error': error_msg})

@app.route('/wake-elser', methods=['POST'])
def wake_elser():
    logger.info("Waking up inference models...")
    try:
        # Wake up ELSER model
        logger.info(f"Waking up ELSER model: {ELSER_INFERENCE_ID}")
        elser_response = es.inference.inference(
            inference_id=ELSER_INFERENCE_ID,
            input=['vector are so much fun']
        )
        logger.info("ELSER model woken up successfully")
        
        # Wake up multilingual E5 model
        logger.info(f"Waking up E5 model: {E5_INFERENCE_ID}")
        e5_response = es.inference.inference(
            inference_id=E5_INFERENCE_ID,
            input=['vector are so much fun']
        )
        logger.info("E5 model woken up successfully")
        
        # Wake up reranker endpoint by running a query with text_similarity_reranker
        reranker_query = {
            "_source": False,
            "fields": [
                "title",
                "property-description",
                "property-features",
                "meta_description",
                "headings",
                "listing-agent-info",
                "property-status",
                "number-of-bedrooms",
                "number-of-bathrooms",
                "square-footage",
                "home-price",
                "annual-tax",
                "maintenance-fee"
            ],
            "highlight": {
                "fields": {}
            },
            "retriever": {
                "text_similarity_reranker": {
                    "field": "meta_description",
                    "inference_id": RERANKER_INFERENCE_ID,
                    "inference_text": "beach",
                    "rank_window_size": 5,
                    "retriever": {
                        "rrf": {
                            "rank_window_size": 10,
                            "retrievers": [
                                {
                                    "standard": {
                                        "filter": [
                                            {
                                                "bool": {
                                                    "must": [
                                                        {
                                                            "range": {
                                                                "home-price": {
                                                                    "lte": 3720000
                                                                }
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        ],
                                        "query": {
                                            "semantic": {
                                                "field": "body_content_e5",
                                                "query": "beach"
                                            }
                                        }
                                    }
                                },
                                {
                                    "standard": {
                                        "filter": [
                                            {
                                                "bool": {
                                                    "must": [
                                                        {
                                                            "range": {
                                                                "home-price": {
                                                                    "lte": 3720000
                                                                }
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        ],
                                        "query": {
                                            "semantic": {
                                                "field": "body_content_elser",
                                                "query": "beach"
                                            }
                                        }
                                    }
                                },
                                {
                                    "standard": {
                                        "filter": [
                                            {
                                                "bool": {
                                                    "must": [
                                                        {
                                                            "range": {
                                                                "home-price": {
                                                                    "lte": 3720000
                                                                }
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        ],
                                        "query": {
                                            "multi_match": {
                                                "fields": [
                                                    "title",
                                                    "property-description",
                                                    "property-features",
                                                    "meta_description",
                                                    "headings"
                                                ],
                                                "query": "beach",
                                                "type": "best_fields"
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        }
        
        # Execute the reranker query to wake up the reranking endpoint
        logger.info("Waking up reranker model...")
        reranker_response = es.search(
            index=ES_INDEX,
            body=reranker_query
        )
        logger.info("Reranker model woken up successfully")
        
        logger.info("All inference models woken up successfully")
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error waking up inference models: {str(e)}")
        
        # Check if it's a 408 error (models still deploying)
        if hasattr(e, 'status_code') and e.status_code == 408:
            logger.info("Models are still deploying (408 error detected)")
            return jsonify({
                'success': False, 
                'error': 'Models are deploying, not ready yet. Please try again in a few minutes.',
                'deploying': True
            })
        
        # Check for model deployment timeout exception
        error_msg = str(e)
        if "model_deployment_timeout_exception" in error_msg:
            return jsonify({
                'success': False, 
                'error': 'Models are still deploying. Please try again in a few minutes.',
                'deploying': True
            })
        
        return jsonify({'success': False, 'error': str(e)})

@app.route('/check-reranker', methods=['POST'])
def check_reranker():
    logger.info(f"Checking reranker availability: {RERANKER_INFERENCE_ID}")
    try:
        # Check if reranker model is available
        response = es.inference.inference(
            inference_id=RERANKER_INFERENCE_ID,
            input=['test query for reranker availability check']
        )
        logger.info("Reranker model is available")
        return jsonify({'success': True, 'message': 'Reranker model is available'})
    except Exception as e:
        logger.error(f"Reranker check failed: {str(e)}")
        
        # Check for model deployment timeout exception
        error_msg = str(e)
        if "model_deployment_timeout_exception" in error_msg:
            return jsonify({
                'success': False, 
                'error': 'Models are still deploying. Please try again in a few minutes.',
                'deploying': True
            })
        
        return jsonify({'success': False, 'error': str(e)})

@app.route('/execute-query', methods=['POST'])
def execute_query():
    logger.info("Executing custom query...")
    try:
        data = request.get_json()
        query = data.get('query')
        
        if not query:
            logger.warning("No query provided in execute-query request")
            return jsonify({'error': 'No query provided'})
        
        logger.debug(f"Custom query: {json.dumps(query, indent=2)}")
        
        # Execute the query on properties index
        start_time = datetime.now()
        response = es.search(
            index=ES_INDEX,  # Use ES_INDEX
            body=query
        )
        end_time = datetime.now()
        search_duration = (end_time - start_time).total_seconds()
        logger.info(f"Custom query completed in {search_duration:.2f} seconds")
        
        results = []
        for hit in response['hits']['hits']:
            result = {
                'score': str(hit['_score']),
                'highlights': [],
                '_id': hit['_id']
            }
            
            # Properties result processing - using fields format
            fields = hit.get('fields', {})
            result['title'] = fields.get('title', ['N/A'])[0] if fields.get('title') else 'N/A'
            result['property-description'] = fields.get('property-description', ['N/A'])[0] if fields.get('property-description') else 'N/A'
            result['property-features'] = fields.get('property-features', ['N/A'])[0] if fields.get('property-features') else 'N/A'
            result['meta_description'] = fields.get('meta_description', ['N/A'])[0] if fields.get('meta_description') else 'N/A'
            result['headings'] = fields.get('headings', ['N/A'])[0] if fields.get('headings') else 'N/A'
            result['listing-agent-info'] = fields.get('listing-agent-info', ['N/A'])[0] if fields.get('listing-agent-info') else 'N/A'
            result['property-status'] = fields.get('property-status', ['N/A'])[0] if fields.get('property-status') else 'N/A'
            result['number-of-bedrooms'] = fields.get('number-of-bedrooms', [0])[0] if fields.get('number-of-bedrooms') else 0
            result['number-of-bathrooms'] = fields.get('number-of-bathrooms', [0])[0] if fields.get('number-of-bathrooms') else 0
            result['square-footage'] = fields.get('square-footage', [0])[0] if fields.get('square-footage') else 0
            result['home-price'] = fields.get('home-price', [0])[0] if fields.get('home-price') else 0
            result['annual-tax'] = fields.get('annual-tax', [0])[0] if fields.get('annual-tax') else 0
            result['maintenance-fee'] = fields.get('maintenance-fee', [0])[0] if fields.get('maintenance-fee') else 0
            
            if 'highlight' in hit:
                for field, fragments in hit['highlight'].items():
                    result['highlights'].extend(fragments)
            
            results.append(result)
        
        logger.info(f"Custom query returned {len(results)} results")
        return jsonify({
            'results': results
        })
        
    except Exception as e:
        logger.error(f"Error executing custom query: {str(e)}")
        
        # Provide more specific error messages for common issues
        error_msg = str(e)
        if "model_deployment_timeout_exception" in error_msg:
            error_msg = "The inference models are not ready yet. Please click the 'Wake Inference Endpoints' button to launch the models, then try your search again."
        
        return jsonify({'error': error_msg})

@app.route('/ai-summary-chat', methods=['POST'])
def ai_summary_chat():
    logger.info("Processing AI summary chat request...")
    try:
        data = request.get_json()
        explain = data.get('explain')
        messages = data.get('messages', [])  # List of {role, content}
        search_query = data.get('search_query', '')  # Add search query parameter
        
        if not explain:
            logger.warning("Missing explain data in AI summary request")
            return jsonify({'error': 'Missing explain data'}), 400
        if not OPENAI_ENDPOINT or not OPENAI_API_KEY or not OPENAI_MODEL or not OPENAI_API_VERSION:
            logger.error("LLM credentials not configured")
            return jsonify({'error': 'LLM credentials not configured'}), 500

        # Prepare system prompt and user messages
        system_prompt = (
            "You are an AI assistant that summarizes and explains Elasticsearch 'explain' JSON for search results. "
            "Provide clear, user-friendly explanations for non-technical users. "
            "If the user asks follow-up questions, answer them based on the explain JSON and previous context. "
            "When summarizing, keep your response under 80 words. "
            "Focus on explaining which specific document fields (like title, property-description, meta_description, headings, etc.) contributed most to the score. "
            "Avoid technical terms like 'weighted linear combination' or 'embeddings'. Instead, explain what content matched and why it was relevant. "
            f"The original search query was: '{search_query}'. Use this context to provide better guidance when users ask about improving their search. "
            "IMPORTANT: The user has access to a search tuning interface with these capabilities: "
            "1. Weight controls for three search components: E5 Semantic Search (0-5), ELSER Semantic Search (0-5), and Text Match (0-5) "
            "2. Field boost options for: title, property-description, property-features, meta_description, and headings (with customizable boost values) "
            "3. Retriever types: Linear (uses weights) and RRF (Reciprocal Rank Fusion, no weights) "
            "4. Location filtering by coordinates and distance "
            "5. Price range filtering "
            "6. Multi-match type selection (best_fields vs most_fields) "
            "7. Result size adjustment (1-100) "
            "When users ask about improving search results, provide specific recommendations using these UI controls. "
            "For example: 'Try increasing the Text Match weight to 2.0 and adding a boost of 3.0 to the title field' or 'Switch to Linear retriever and increase E5 Semantic Search weight to 3.0'."
        )
        # First message: summary request
        if not messages:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Explain this search result in user-friendly terms (max 80 words). Focus on which specific document fields (title, description, features, etc.) contributed most to the score and why they matched the search query '{search_query}': {json.dumps(explain)}"}
            ]
        else:
            # Always prepend system prompt
            messages = [{"role": "system", "content": system_prompt}] + messages

        # Azure OpenAI API call
        url = f"{OPENAI_ENDPOINT}/openai/deployments/{OPENAI_MODEL}/chat/completions?api-version={OPENAI_API_VERSION}"
        headers = {
            "Content-Type": "application/json",
            "api-key": OPENAI_API_KEY
        }
        payload = {
            "messages": messages,
            "max_tokens": 512,
            "temperature": 0.3
        }
        logger.info(f"Calling Azure OpenAI API with model: {OPENAI_MODEL}")
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        if resp.status_code != 200:
            logger.error(f"LLM API error: {resp.status_code} {resp.text}")
            return jsonify({'error': f'LLM API error: {resp.status_code} {resp.text}'}), 500
        result = resp.json()
        ai_message = result['choices'][0]['message']['content'] if 'choices' in result and result['choices'] else ''
        logger.info("AI summary generated successfully")
        return jsonify({'ai_message': ai_message})
    except Exception as e:
        logger.error(f"Error in AI summary chat: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting Hotel Finder Search UI...")
    logger.info(f"Elasticsearch URL: {ES_URL}")
    logger.info(f"Elasticsearch Index: {ES_INDEX}")
    logger.info(f"Using password auth: {USE_PASSWORD}")
    if OPENAI_ENDPOINT:
        logger.info(f"Azure OpenAI configured: {OPENAI_ENDPOINT}")
    else:
        logger.warning("Azure OpenAI not configured")
    
    app.run(debug=True, host='0.0.0.0', port=5001) 