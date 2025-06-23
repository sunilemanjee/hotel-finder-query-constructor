#!/bin/bash

# Hotel Search UI Container Runner
# This script helps you build and run the containerized search UI

set -e

# Parse command line arguments
BACKGROUND_MODE=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --background|-b|-d)
            BACKGROUND_MODE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--background|-b|-d]"
            exit 1
            ;;
    esac
done

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

# Build the Docker image with no cache
echo "🔨 Building Docker image (no cache)..."
docker-compose build --no-cache

echo "✅ Docker image built successfully"

# Run the container based on mode
if [ "$BACKGROUND_MODE" = true ]; then
    echo "🚀 Starting the search UI container in background mode..."
    echo "The application will be available at: http://localhost:8080"
    echo "To view logs: docker-compose logs -f"
    echo "To stop: docker-compose down"
    echo ""
    docker-compose up --build -d
    echo "✅ Container started in background. Use 'docker-compose logs -f' to view logs."
else
    echo "🚀 Starting the search UI container..."
    echo "The application will be available at: http://localhost:8080"
    echo "Press Ctrl+C to stop the container"
    echo ""
    docker-compose up --build 
fi 