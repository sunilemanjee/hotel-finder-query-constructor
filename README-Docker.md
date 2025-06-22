# Hotel Search UI - Containerized

This is the containerized version of the Hotel Search UI, a Flask application that provides a web interface for searching hotel data using Elasticsearch.

## Prerequisites

- Docker
- Docker Compose
- Elasticsearch cluster with hotel data indexed

## Quick Start

1. **Set up environment variables:**
   ```bash
   cp variables.env.template variables.env
   ```
   
   Edit `variables.env` with your Elasticsearch configuration:
   ```env
   ES_URL=https://your-cluster.region.elastic.co:9243
   ES_API_KEY=your-api-key-here
   ELSER_INFERENCE_ID=.elser-2-elasticsearch
   ```

2. **Run the container:**
   ```bash
   ./run-container.sh
   ```
   
   Or manually:
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   Open your browser and go to `http://localhost:8080`

## Manual Docker Commands

### Build the image
```bash
docker build -t hotel-search-ui .
```

### Run the container
```bash
docker run -p 8080:5000 --env-file variables.env hotel-search-ui
```

### Run with docker-compose
```bash
docker-compose up --build
```

### Run in background
```bash
docker-compose up -d
```

### Stop the container
```bash
docker-compose down
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ES_URL` | Your Elasticsearch cluster URL | Yes |
| `ES_API_KEY` | Your Elasticsearch API key | Yes |
| `ELSER_INFERENCE_ID` | ELSER inference ID for semantic search | Yes |

## Container Details

- **Base Image:** Python 3.11-slim
- **Port:** 8080 (external) → 5000 (internal)
- **Health Check:** HTTP endpoint check every 30 seconds
- **User:** Non-root user for security
- **Restart Policy:** Unless stopped

## Troubleshooting

### Container won't start
- Check that your `variables.env` file exists and has correct values
- Verify your Elasticsearch cluster is accessible
- Check Docker logs: `docker-compose logs`

### Connection to Elasticsearch fails
- Verify your `ES_URL` and `ES_API_KEY` are correct
- Ensure your Elasticsearch cluster is running and accessible
- Check network connectivity from the container

### Health check fails
- The container includes a health check that verifies the Flask app is responding
- If it fails, check the application logs for errors

### Port already in use
- The container uses port 8080 to avoid conflicts with macOS AirPlay Receiver (port 5000)
- If port 8080 is also in use, you can change it in `docker-compose.yml`

## Development

To modify the application:

1. Make your changes to `search_ui.py` or `templates/`
2. Rebuild the container: `docker-compose up --build`
3. The changes will be reflected in the running container

## Security Notes

- The container runs as a non-root user
- Environment variables are used for sensitive configuration
- The application is configured for production use
- Health checks are enabled for monitoring

## Performance

- The container uses Python 3.11 for optimal performance
- Dependencies are cached in Docker layers for faster builds
- The slim base image reduces container size 