# Hotel Search Query Tuning - Elasticsearch Hybrid Search

This project provides a web-based interface for performing hybrid searches across hotel data in Elasticsearch, combining semantic search with traditional text matching.

## Features

- Hybrid search across hotel data with:
  - E5 Semantic Search (dense embeddings)
  - ELSER Semantic Search (sparse embeddings)
  - Text Match across multiple fields

- Adjustable search component weights:
  - E5 Semantic Search
  - ELSER Semantic Search
  - Text Match

- Real-time search results with highlighting
- Modern, responsive UI built with Bootstrap
- Query visualization for debugging
- Optional semantic reranking

## Prerequisites

- Python 3.11 or higher (for local development)
- Docker and Docker Compose (for containerized deployment)
- Elasticsearch cluster with the `hotels` index containing:
  - Hotel information (name, description, address, etc.)
  - Semantic embeddings (`semantic_description_e5`, `semantic_description_elser`)
  - Combined fields for reranking

## Quick Start with Docker (Recommended)

The easiest way to run this application is using Docker:

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/hotel-finder-query-constructor.git
cd hotel-finder-query-constructor
```

2. **Set up environment variables:**
```bash
cp variables.env.template variables.env
```
Edit `variables.env` with your Elasticsearch configuration:
```env
ES_URL=https://your-cluster.region.elastic.co:9243
ES_API_KEY=your-api-key-here
ELSER_INFERENCE_ID=.elser-2-elasticsearch
```

3. **Run the containerized application:**
```bash
./run-container.sh
```

4. **Access the application:**
Open your browser and go to `http://localhost:8080`

For detailed Docker instructions, see [README-Docker.md](README-Docker.md).

## Local Development Setup

If you prefer to run the application locally without Docker:

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/hotel-finder-query-constructor.git
cd hotel-finder-query-constructor
```

2. **Create a `variables.env` file with your Elasticsearch configuration:**
```bash
cat > variables.env << EOL
ES_URL=your_elasticsearch_url
ES_API_KEY=your_elasticsearch_api_key
EOL
```
Replace `your_elasticsearch_url` and `your_elasticsearch_api_key` with your actual Elasticsearch credentials.

> **Note:** The `variables.env` file contains sensitive information and should not be committed to version control. It is automatically added to `.gitignore`.

3. **Set up and activate the environment:**

Run the following command to set up the Python virtual environment, install dependencies, validate your configuration, and activate the environment in your current shell:

```bash
source setup_env.sh
```

> **Important:** You must use `source setup_env.sh` (not `./setup_env.sh`) so that the virtual environment is activated in your current shell session.

When setup completes, your shell prompt should show `(venv)` indicating the environment is active.

### Deactivate the Virtual Environment

When you're done, you can deactivate the virtual environment by running:

```bash
deactivate
```

## Data Ingestion

Before using the UI, you must ingest hotel data into your Elasticsearch `hotels` index. Use your preferred ingestion method or script to populate the index as needed.

> **Note:** The previous ingestion scripts (`ingest.py`, `elasticsearch_ingest.py`) have been removed. Please use your own ingestion process or contact the project maintainer for guidance.

## Running the Application

### With Docker (Recommended)
```bash
./run-container.sh
```
Access at: `http://localhost:8080`

### Local Development
1. Start the Flask application:
```bash
python search_ui.py
```

2. Open your browser and navigate to `http://127.0.0.1:5001`

## Usage

1. Enter your search query (hotel name, description, location, amenities, etc.)
2. Adjust the weights for different search components using the sliders:
   - E5 Semantic Search (default: 2.0)
   - ELSER Semantic Search (default: 1.5)
   - Text Match (default: 1.0)
3. Optionally enable semantic reranking with configurable parameters
4. Click "Search" or press Enter
5. View the results with highlighted matches
6. Click "Show Generated Query" to see the Elasticsearch query structure

## Search Fields

The search covers the following hotel fields:
- HotelName
- Description
- Address
- cityName
- HotelFacilities
- Attractions

## Development

The project consists of two main components:

1. `search_ui.py`: Flask application handling the backend logic
2. `templates/index.html`: Frontend interface with Bootstrap styling

## Containerization

This project includes Docker support for easy deployment:

- **Dockerfile**: Multi-stage build for production-ready container
- **docker-compose.yml**: Easy orchestration with environment variables
- **run-container.sh**: Helper script for building and running
- **README-Docker.md**: Detailed Docker documentation

## License

[Your License Here]

## Contributing

[Your Contributing Guidelines Here] 