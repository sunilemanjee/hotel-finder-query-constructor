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

def get_search_query(query_text, index, enable_reranking=False, reranking_params=None, selected_fields=None, highlight_config=None, size=20, retriever_type='linear', enable_location_filter=False, location_params=None, price_params=None, enable_explain=False, rrf_params=None, linear_params=None):
    logger.info(f"Building search query for: '{query_text}' with retriever_type: {retriever_type}")
    logger.debug(f"Selected fields: {selected_fields}")
    
    if reranking_params is None:
        reranking_params = {
            'rank_window_size': 5,
            'reranker_field': 'meta_description'
        }
    
    # Default RRF parameters if none provided
    if rrf_params is None:
        rrf_params = {
            'rank_window_size': max(size, 20),
            'rank_constant': 20
        }
    else:
        # Ensure required RRF parameters are present
        if 'rank_window_size' not in rrf_params:
            rrf_params['rank_window_size'] = max(size, 20)
        if 'rank_constant' not in rrf_params:
            rrf_params['rank_constant'] = 20
    
    # Default fields if none selected
    if selected_fields is None:
        selected_fields = []

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
    # Always include all available fields for output - this should never change based on selected fields
    base_query = {
        "fields": [
            "body_content_e5",
            "body_content_elser", 
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
        # Use the selected fields directly - they already contain boosts if specified
        fields_with_boosts = selected_fields or []
        
        # Only use selected fields - no default fallback to all fields
        # If no fields are selected, use a minimal default to avoid empty search
        if not fields_with_boosts:
            logger.warning("No fields selected for linear retriever - using minimal default")
            fields_with_boosts = ["property-description"]  # Minimal default to avoid empty search
        
        # Create the simplified linear retriever
        # Use linear_params if provided, otherwise default to max(size, 20)
        linear_rank_window_size = max(size, 20)  # Default value
        if linear_params and 'rank_window_size' in linear_params:
            linear_rank_window_size = max(linear_params['rank_window_size'], size)
        
        linear_retriever = {
            "linear": {
                "query": query_text,
                "fields": fields_with_boosts,
                "normalizer": "minmax",
                "rank_window_size": linear_rank_window_size
            }
        }
        
        # Add filter if present
        if combined_filter:
            linear_retriever["linear"]["filter"] = [combined_filter]
        
        base_query["retriever"] = linear_retriever
        
        # Log the field boosts being used
        logger.info("Linear retriever field boosts configured:")
        for field in fields_with_boosts:
            logger.info(f"  - {field}")
    elif retriever_type == 'rrf':
        # Create fields list for RRF retriever
        # Use selected fields if provided, otherwise use empty list
        rrf_fields = selected_fields or []
        
        # If no fields are selected, use a minimal default to avoid empty search
        if not rrf_fields:
            logger.warning("No fields selected for RRF retriever - using minimal default")
            rrf_fields = ["property-description"]  # Minimal default to avoid empty search
        
        # Create the simplified RRF retriever
        rrf_retriever = {
            "rrf": {
                "query": query_text,
                "fields": rrf_fields,
                "rank_window_size": rrf_params['rank_window_size'],
                "rank_constant": rrf_params['rank_constant']
            }
        }
        
        # Add filter if present
        if combined_filter:
            rrf_retriever["rrf"]["filter"] = [combined_filter]
        
        base_query["retriever"] = rrf_retriever
        
        # Log the fields being used
        logger.info("RRF retriever fields configured:")
        for field in rrf_fields:
            logger.info(f"  - {field}")
        
        # Log RRF parameters
        logger.info(f"RRF parameters: rank_window_size={rrf_params['rank_window_size']}, rank_constant={rrf_params['rank_constant']}")

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
        
        # When reranking is enabled, use the new simplified retriever format
        # Create a simple linear retriever for reranking
        # Use selected fields only - no default fallback
        reranker_fields = selected_fields or []
        
        # If no fields are selected, use a minimal default to avoid empty search
        if not reranker_fields:
            logger.warning("No fields selected for reranker - using minimal default")
            reranker_fields = ["property-description"]  # Minimal default to avoid empty search
        # Use linear_params for reranking retriever if provided
        reranker_rank_window_size = max(size, 20)  # Default value
        if linear_params and 'rank_window_size' in linear_params:
            reranker_rank_window_size = max(linear_params['rank_window_size'], size)
        
        reranker_retriever = {
            "linear": {
                "query": query_text,
                "fields": reranker_fields,
                "normalizer": "minmax",
                "rank_window_size": reranker_rank_window_size
            }
        }
        
        # Add filter if present
        if combined_filter:
            reranker_retriever["linear"]["filter"] = [combined_filter]
        
        base_query = {
            "_source": base_query.get("_source", False),
            "fields": [
                "body_content_e5",
                "body_content_elser", 
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
            "retriever": {
                "text_similarity_reranker": {
                    "field": reranker_field,
                    "inference_id": RERANKER_INFERENCE_ID,
                    "inference_text": query_text,
                    "rank_window_size": reranking_params['rank_window_size'],
                    "retriever": reranker_retriever
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
    
    enable_reranking = data.get('enableReranking', False)
    reranking_params = data.get('rerankingParams', {
        'rankWindowSize': 5,
        'rerankerField': 'meta_description'
    })
    selected_fields = data.get('selectedFields', [])
    highlight_config = data.get('highlightConfig', None)
    result_size = data.get('resultSize', 20)
    retriever_type = data.get('retrieverType', 'linear')
    enable_location_filter = data.get('enableLocationFilter', False)
    location_params = data.get('locationParams', None)
    price_params = data.get('priceParams', None)
    enable_explain = data.get('enableExplain', False)
    rrf_params = data.get('rrfParams', None)
    linear_params = data.get('linearParams', None)
    
    if not query:
        return jsonify({'error': 'Please enter a search query'})
    
    try:
        search_query = get_search_query(
            query, 
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
            enable_location_filter,
            location_params,
            price_params,
            enable_explain,
            rrf_params,
            linear_params
        )
        
        # Log the final query configuration
        if retriever_type == 'linear' and 'retriever' in search_query and 'linear' in search_query['retriever']:
            fields = search_query['retriever']['linear'].get('fields', [])
            logger.info("Final linear retriever field boosts:")
            for field in fields:
                logger.info(f"  - {field}")
        
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
                result['highlights'] = hit['highlight']
            
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
            error_msg = "The inference models are not ready yet. Please wait a moment and try your search again."
        elif "text_similarity_reranker" in error_msg or "rank_docs_retriever" in error_msg:
            error_msg = f"Reranker error: {error_msg}. Please check if the reranker model is available in your Elasticsearch cluster and that the field '{reranking_params.get('reranker_field', 'meta_description')}' exists in your index."
        elif "inference_id" in error_msg:
            error_msg = f"Inference model error: {error_msg}. Please check if the required models are deployed."
        elif "field" in error_msg and "combined_fields" in error_msg:
            error_msg = "Field error: The specified field does not exist in the index."
        
        return jsonify({'error': error_msg})

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
            error_msg = "The inference models are not ready yet. Please wait a moment and try your search again."
        
        return jsonify({'error': error_msg})

@app.route('/ai-summary-chat', methods=['POST'])
def ai_summary_chat():
    logger.info("Processing AI summary chat request...")
    try:
        data = request.get_json()
        explain = data.get('explain')
        messages = data.get('messages', [])  # List of {role, content}
        search_query = data.get('search_query', '')  # Add search query parameter
        current_settings = data.get('current_settings', {})  # Add current UI settings
        document_fields = data.get('document_fields', {})  # Add document fields from fields array
        has_recommendations = data.get('has_recommendations', False)  # Whether recommendations have been provided
        
        if not explain:
            logger.warning("Missing explain data in AI summary request")
            return jsonify({'error': 'Missing explain data'}), 400
        if not OPENAI_ENDPOINT or not OPENAI_API_KEY or not OPENAI_MODEL or not OPENAI_API_VERSION:
            logger.error("LLM credentials not configured")
            return jsonify({'error': 'LLM credentials not configured'}), 500

        # Prepare system prompt and user messages
        system_prompt = (
            "You are an AI search advisor that analyzes Elasticsearch 'explain' JSON to provide insights about search result scoring. "
            "Your role is to carefully analyze the explain plan and provide clear, educational explanations about how the search worked. "
            "Start with high-level observations and only provide specific recommendations when explicitly asked. "
            
            "CRITICAL FIELD KNOWLEDGE - You MUST understand these specific field characteristics: "
            "1. 'body_content_e5' - This is a TEXT EMBEDDING field using the multilingual-E5-small model. It converts text to dense vector representations for semantic similarity matching. "
            "2. 'body_content_elser' - This is an ELSER (Elastic Learned Sparse Encoder) field. ELSER uses term expansion with learned weights, similar to SPLADE. It expands queries with related terms and assigns learned importance weights to each term. "
            "3. Traditional fields (title, property-description, etc.) - These use standard BM25 keyword matching with TF-IDF scoring. "
            
            "SEMANTIC MODEL IDENTIFICATION - When analyzing explain JSON, identify which semantic model was used: "
            "- If you see 'body_content_e5.inference.chunks.embeddings' in the explain JSON, the search used E5 semantic model (dense vector embeddings) "
            "- If you see 'body_content_elser.inference.chunks.embeddings' in the explain JSON, the search used ELSER semantic model (sparse term expansion) "
            "- If you see both fields, the search used both models (RRF or Linear with multiple semantic fields) "
            "- If you see neither, the search used only traditional keyword matching (no semantic search) "
            "Always base your analysis on the actual field names found in the explain JSON, not assumptions. "
            
            "EXPLAIN PLAN ANALYSIS - You must carefully review the entire explain JSON to understand: "
            "1. Which fields contributed to the score and their individual contributions "
            "2. Field boost values and their impact on scoring "
            "3. Term frequency (TF) and inverse document frequency (IDF) values "
            "4. Length normalization effects "
            "5. Whether semantic models were used and which ones "
            "6. The overall scoring formula breakdown "
            
            "AVAILABLE INDEX FIELDS - The properties index contains these searchable fields: "
            "- title (text, keyword matching) "
            "- property-description (text, keyword matching) "
            "- property-features (text, keyword matching) "
            "- meta_description (text, keyword matching) "
            "- headings (text, keyword matching) "
            "- listing-agent-info (text, keyword matching) "
            "- property-status (text, keyword matching) "
            "- body_content_e5 (dense vector embeddings, semantic search) "
            "- body_content_elser (sparse term expansion, semantic search) "
            "- number-of-bedrooms (numeric, range queries) "
            "- number-of-bathrooms (numeric, range queries) "
            "- square-footage (numeric, range queries) "
            "- home-price (numeric, range queries) "
            "- annual-tax (numeric, range queries) "
            "- maintenance-fee (numeric, range queries) "
            "- location (geo_point, geographic queries) "
            
            "UI CAPABILITIES - The user has access to these tuning controls: "
            "1. Retriever Type: Linear (supports field boosts 0-5) or RRF (Reciprocal Rank Fusion, field selection only) "
            "2. Field boost sliders (0-5) for: Body Content E5, Body Content ELSER, Title, Property Description, Property Features, Meta Description, Headings "
            "3. Linear Parameters: Rank Window Size (must be >= result size) "
            "4. RRF Parameters: Rank Window Size and Rank Constant (default 20) "
            "5. Location filtering: latitude/longitude coordinates and distance in miles "
            "6. Price range filtering: min/max price sliders "
            "7. Reranking: Enable semantic reranking with field selection and rank window size "
            "8. Result size adjustment (1-100) "
            "9. Explain option for detailed scoring information "
            "10. Highlight field configuration "
            
            "RESPONSE BEHAVIOR RULES: "
            "1. INITIAL RESPONSE: Start with high-level observations about the explain plan - what semantic models were used, which fields contributed most, and general scoring patterns "
            "2. EDUCATIONAL FOCUS: Explain how the search worked in user-friendly terms, avoiding overly technical jargon "
            "3. NO IMMEDIATE RECOMMENDATIONS: Do NOT provide specific tuning recommendations unless the user explicitly asks for them "
            "4. WAIT FOR REQUESTS: Only provide prescriptive advice when users ask questions like 'How can I improve this?' or 'What should I change?' "
            "5. BE CONCISE AND PRECISE: When recommendations are requested, provide brief, specific, actionable advice with exact values. Avoid lengthy explanations and wordy responses. "
            "6. CONTEXT AWARENESS: Consider the semantic model characteristics when explaining how the search worked "
            "7. KEEP RECOMMENDATIONS SHORT: Limit recommendation responses to 2-3 specific actions with exact values. No lengthy explanations or multiple paragraphs. "
            "8. ITERATIVE TUNING REMINDER: Only show the iterative reminder ONCE per conversation. If the user has already received recommendations in this conversation, skip the iterative reminder and go directly to specific recommendations. The iterative reminder should only appear when this is the very first time providing recommendations in the conversation. "
            "9. FORMAT RECOMMENDATIONS CLEARLY: Put each recommendation on a new line for easy reading. Use numbered lists (1., 2., 3., etc.) with each recommendation on its own line. Include a brief explanation (less than 10 words) next to each recommendation explaining why. Avoid long paragraphs with multiple recommendations mixed together. "
            "10. NO INTRODUCTORY PARAGRAPHS: Do NOT write introductory paragraphs explaining what the recommendations will do. Go directly to the recommendations. Only include the iterative reminder if this is the first time providing recommendations in the conversation. "
            
            f"The original search query was: '{search_query}'. Use this context to provide relevant observations. "
            "Focus on explaining what happened in the search, not what to change (unless asked). "
            "When users explicitly ask for improvement suggestions, check if you have already provided recommendations in this conversation. If yes, go directly to specific recommendations without the iterative reminder. If this is the first time, start with 'Remember: Query tuning is iterative.' followed immediately by specific recommendations, like: '1. Boost body_content_e5 to 3.5 - enhances semantic matching 2. Boost title to 4.0 - prioritizes title relevance 3. Boost property-description to 2.5 - improves content matching'. No introductory paragraphs or explanations."
            
            f"\n\nRECOMMENDATION STATUS: {'Recommendations have already been provided in this conversation. Skip the iterative reminder and go directly to specific recommendations.' if has_recommendations else 'This is the first time providing recommendations in this conversation. Include the iterative reminder if recommendations are requested.'}"
        )
        
        # Add current settings context to the system prompt
        if current_settings:
            settings_context = f"\n\nCURRENT SEARCH SETTINGS USED: {json.dumps(current_settings, indent=2)}"
            system_prompt += settings_context
            logger.info(f"Added current settings context to AI prompt: {current_settings}")
            
            # Add specific guidance about current retriever type
            retriever_type = current_settings.get('retrieverType', 'unknown')
            if retriever_type == 'linear':
                system_prompt += f"\n\nIMPORTANT: The user is currently using LINEAR retriever. Do NOT suggest switching to Linear retriever since they are already using it. Instead, suggest specific boost adjustments for the field boost sliders (0-5 range)."
            elif retriever_type == 'rrf':
                system_prompt += f"\n\nIMPORTANT: The user is currently using RRF retriever. Do NOT suggest switching to RRF retriever since they are already using it. Instead, suggest field selection changes or switching to Linear retriever if field boosting would be beneficial."
            
        # Add document fields context to the system prompt
        if document_fields:
            fields_context = f"\n\nDOCUMENT FIELDS FOR THIS RESULT:\n{json.dumps(document_fields, indent=2)}"
            system_prompt += fields_context
            logger.info(f"Added document fields context to AI prompt: {document_fields}")
        # First message: summary request
        if not messages:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Provide a brief summary (2-3 sentences) of this Elasticsearch explain JSON. Identify which semantic model was used (E5, ELSER, or keyword matching) and mention the main field that contributed to the score for query '{search_query}'. Keep it concise: {json.dumps(explain)}"}
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

@app.route('/ai-visual-explanation', methods=['POST'])
def ai_visual_explanation():
    logger.info("Processing AI visual explanation request...")
    try:
        data = request.get_json()
        explain = data.get('explain')
        search_query = data.get('search_query', '')
        current_settings = data.get('current_settings', {})
        document_fields = data.get('document_fields', {})
        
        if not explain:
            logger.warning("Missing explain data in AI visual explanation request")
            return jsonify({'error': 'Missing explain data'}), 400
        if not OPENAI_ENDPOINT or not OPENAI_API_KEY or not OPENAI_MODEL or not OPENAI_API_VERSION:
            logger.error("LLM credentials not configured")
            return jsonify({'error': 'LLM credentials not configured'}), 500

        # Prepare system prompt for visual explanation
        system_prompt = (
            "You are an AI assistant that creates dynamic, creative visual explanations of Elasticsearch 'explain' JSON for search results. "
            "Generate innovative HTML that makes complex scoring data easy to understand through visual storytelling. "
            
            "IMPORTANT: Return ONLY valid HTML code. Do not include any markdown, explanations, or other text outside of HTML tags. "
            "The HTML should be self-contained and ready to be inserted into a web page. "
            
            "Be creative and dynamic in your approach. You can use: "
            "- Any Bootstrap components (cards, progress bars, badges, alerts, etc.) "
            "- Custom CSS styling and animations "
            "- Icons, emojis, and visual metaphors "
            "- Interactive elements and hover effects "
            "- Charts, graphs, or any visual representation that makes sense "
            "- Color psychology and visual hierarchy "
            "- Storytelling elements to guide the user through the explanation "
            
            "CRITICAL FIELD KNOWLEDGE - You MUST understand these specific field characteristics: "
            "1. 'body_content_e5' - This is a TEXT EMBEDDING field using the multilingual-E5-small model. It converts text to dense vector representations for semantic similarity matching. "
            "2. 'body_content_elser' - This is an ELSER (Elastic Learned Sparse Encoder) field. ELSER uses term expansion with learned weights, similar to SPLADE. It expands queries with related terms and assigns learned importance weights to each term. "
            "3. Traditional fields (title, property-description, etc.) - These use standard BM25 keyword matching with TF-IDF scoring. "
            
            "SEMANTIC MODEL IDENTIFICATION - When analyzing explain JSON, identify which semantic model was used: "
            "- If you see 'body_content_e5.inference.chunks.embeddings' in the explain JSON, the search used E5 semantic model (dense vector embeddings) "
            "- If you see 'body_content_elser.inference.chunks.embeddings' in the explain JSON, the search used ELSER semantic model (sparse term expansion) "
            "- If you see both fields, the search used both models (RRF or Linear with multiple semantic fields) "
            "- If you see neither, the search used only traditional keyword matching (no semantic search) "
            "Always base your analysis on the actual field names found in the explain JSON, not assumptions. "
            
            f"The original search query was: '{search_query}'. Use this context to provide better visual explanations. "
            
            "FOCUS ON FIELD-BASED SCORE ANALYSIS: "
            "1. Extract field-specific contributions (title, property-description, meta_description, headings, etc.) "
            "2. Calculate percentage contributions of each field to the total score "
            "3. Identify field boosts and their impact (e.g., 3.96x boost for headings) "
            "4. Analyze term frequency (TF) and inverse document frequency (IDF) values "
            "5. Show term occurrences and their scoring impact "
            "6. Create strategic scoring analysis with optimization factors "
            "7. Include scoring formula impact analysis (IDF component, TF component, field boosts, length normalization) "
            "8. Distinguish between semantic model contributions (E5 vs ELSER) and traditional keyword matching "
            "9. Show semantic similarity scores vs keyword matching scores "
            "10. Visualize the difference between dense vector embeddings and sparse term expansion "
            
            "CREATE VISUAL CHARTS AND ANALYSIS: "
            "- Field contribution pie charts or bar charts with semantic vs keyword breakdown "
            "- Boost impact visualizations "
            "- Term scoring breakdown charts "
            "- Strategic scoring analysis cards with percentages and multipliers "
            "- Scoring formula impact breakdown "
            "- Semantic model comparison charts (E5 vs ELSER vs keyword) "
            "- Term expansion visualization for ELSER results "
            "- Vector similarity visualization for E5 results "
            
            "DO NOT include search improvement suggestions or recommendations. "
            "Focus purely on explaining the current score breakdown and field contributions. "
            
            "Be innovative! Create something that's both informative and visually engaging. "
            "Return ONLY the HTML code, no other text or explanations."
        )
        
        # Add current settings context to the system prompt
        if current_settings:
            settings_context = f"\n\nCURRENT SEARCH SETTINGS USED: {json.dumps(current_settings, indent=2)}"
            system_prompt += settings_context
            logger.info(f"Added current settings context to AI visual prompt: {current_settings}")
            
        # Add document fields context to the system prompt
        if document_fields:
            fields_context = f"\n\nDOCUMENT FIELDS FOR THIS RESULT:\n{json.dumps(document_fields, indent=2)}"
            system_prompt += fields_context
            logger.info(f"Added document fields context to AI visual prompt: {document_fields}")

        # Prepare messages for the LLM
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Create a visual HTML explanation of this Elasticsearch explain JSON. First identify which semantic model was used (E5 dense embeddings, ELSER sparse term expansion, or traditional keyword matching) by looking for 'body_content_e5' or 'body_content_elser' in the field names. Then create an HTML visualization that shows: 1) Field-based score contributions with percentages and charts, distinguishing between semantic models (E5 vs ELSER) and traditional keyword matching, 2) Strategic scoring analysis with optimization factors, 3) Scoring formula impact breakdown (IDF, TF, field boosts, length normalization), 4) Term rarity and frequency analysis, 5) Semantic model comparison (dense vector embeddings vs sparse term expansion vs keyword matching). Focus on explaining the current score breakdown without suggestions for improvement. Return ONLY the HTML code: {json.dumps(explain)}"}
        ]

        # Azure OpenAI API call
        url = f"{OPENAI_ENDPOINT}/openai/deployments/{OPENAI_MODEL}/chat/completions?api-version={OPENAI_API_VERSION}"
        headers = {
            "Content-Type": "application/json",
            "api-key": OPENAI_API_KEY
        }
        payload = {
            "messages": messages,
            "max_tokens": 2048,  # Increased for HTML generation
            "temperature": 0.3
        }
        logger.info(f"Calling Azure OpenAI API for visual explanation with model: {OPENAI_MODEL}")
        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        if resp.status_code != 200:
            logger.error(f"LLM API error: {resp.status_code} {resp.text}")
            return jsonify({'error': f'LLM API error: {resp.status_code} {resp.text}'}), 500
        result = resp.json()
        html_content = result['choices'][0]['message']['content'] if 'choices' in result and result['choices'] else ''
        logger.info("AI visual explanation generated successfully")
        return jsonify({'html_content': html_content})
    except Exception as e:
        logger.error(f"Error in AI visual explanation: {str(e)}")
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