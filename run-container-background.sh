#!/bin/bash

# Hotel Search UI Container Runner (Background Mode)
# This script runs the containerized search UI in the background

set -e

echo "🏨 Hotel Search UI Container Setup (Background Mode)"
echo "=================================================="

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

# Build the Docker image with no cache
echo "🔨 Building Docker image (no cache)..."
#docker-compose build --no-cache
docker-compose build

echo "✅ Docker image built successfully"

# Run the container in background mode
echo "🚀 Starting the search UI container in background mode..."
echo "The application will be available at: http://localhost:8080"
echo ""
echo "📋 Useful commands:"
echo "  View logs: docker-compose logs -f"
echo "  Stop container: docker-compose down"
echo "  Check status: docker-compose ps"
echo ""

docker-compose up --build -d

echo "✅ Container started successfully in background!"
echo "🌐 Application URL: http://localhost:8080"
echo "📝 To view logs: docker-compose logs -f"
echo "🛑 To stop: docker-compose down" 