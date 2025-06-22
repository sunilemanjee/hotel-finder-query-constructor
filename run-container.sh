#!/bin/bash

# Hotel Search UI Container Runner
# This script helps you build and run the containerized search UI

set -e

echo "🏨 Hotel Search UI Container Setup"
echo "=================================="

# Check if variables.env exists
if [ ! -f "variables.env" ]; then
    echo "❌ Error: variables.env file not found!"
    echo "Please create variables.env file with your Elasticsearch configuration:"
    echo "ES_URL=https://your-cluster.region.elastic.co:9243"
    echo "ES_API_KEY=your-api-key-here"
    echo "ELSER_INFERENCE_ID=.elser-2-elasticsearch"
    exit 1
fi

echo "✅ Environment file found"

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -t hotel-search-ui .

echo "✅ Docker image built successfully"

# Run the container
echo "🚀 Starting the search UI container..."
echo "The application will be available at: http://localhost:8080"
echo "Press Ctrl+C to stop the container"
echo ""

docker-compose up 