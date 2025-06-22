#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to setup environment
setup_environment() {
    echo -e "${GREEN}Setting up Python virtual environment...${NC}"

    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        echo -e "${GREEN}Virtual environment created.${NC}"
    else
        echo -e "${GREEN}Virtual environment already exists.${NC}"
    fi

    # Install dependencies
    echo -e "${GREEN}Installing dependencies...${NC}"
    source venv/bin/activate
    pip install -r requirements.txt

    # Check if variables.env exists
    if [ ! -f variables.env ]; then
        echo -e "${RED}Error: variables.env file not found${NC}"
        return 1
    fi

    # Read variables from variables.env
    source variables.env

    # Validate required variables
    if [ -z "$ES_URL" ] || [ -z "$ES_API_KEY" ]; then
        echo -e "${RED}Error: ES_URL and ES_API_KEY must be set in variables.env${NC}"
        return 1
    fi

    # Validate URL format
    if [[ ! $ES_URL =~ ^https?:// ]]; then
        echo -e "${RED}Error: ES_URL must start with http:// or https://${NC}"
        return 1
    fi

    # Create .env file
    cat > .env << EOL
# Elasticsearch Configuration
ES_URL=$ES_URL
ES_API_KEY=$ES_API_KEY

# Generated on $(date)
EOL

    echo -e "${GREEN}Environment file created successfully!${NC}"

    # Check if .gitignore exists and contains .env
    if [ -f .gitignore ]; then
        if ! grep -q "^\.env$" .gitignore; then
            echo ".env" >> .gitignore
        fi
        if ! grep -q "^venv$" .gitignore; then
            echo "venv" >> .gitignore
        fi
    else
        echo -e "${GREEN}Creating .gitignore file...${NC}"
        echo -e ".env\nvenv" > .gitignore
    fi

    echo -e "${GREEN}Setup completed successfully!${NC}"
    echo -e "${GREEN}Virtual environment is now activated!${NC}"
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Script is being executed directly
    echo -e "${RED}This script should be sourced, not executed.${NC}"
    echo -e "${GREEN}Please run: source setup_env.sh${NC}"
    exit 1
else
    # Script is being sourced
    setup_environment 
fi 