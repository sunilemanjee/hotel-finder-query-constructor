#!/bin/bash

# Hotel Finder Query Constructor Setup Script
# This script clones the repository and configures the environment

echo "Setting up Hotel Finder Query Constructor..."

# Clone the repository to /root
echo "Cloning repository to /root/hotel-finder-query-constructor..."
git clone https://github.com/sunilemanjee/hotel-finder-query-constructor.git /root/hotel-finder-query-constructor

# Check if clone was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to clone repository"
    exit 1
fi

# Navigate to the cloned directory
cd /root/hotel-finder-query-constructor

# Rename variables.env.template to variables.env
echo "Renaming variables.env.template to variables.env..."
if [ -f "variables.env.template" ]; then
    cp variables.env.template variables.env
    echo "Successfully created variables.env from template"
else
    echo "Warning: variables.env.template not found"
fi

# Update the variables.env file with the specified values
echo "Configuring environment variables..."
if [ -f "variables.env" ]; then
    # Update ES_URL
    sed -i 's|ES_URL=.*|ES_URL="http://kubernetes-vm:9200"|' variables.env
    
    # Update ES_PASSWORD
    sed -i 's|ES_PASSWORD=.*|ES_PASSWORD=changeme|' variables.env
    
    # Update USE_PASSWORD
    sed -i 's|USE_PASSWORD=.*|USE_PASSWORD=true|' variables.env
    
    echo "Environment variables configured successfully:"
    echo "  - ES_URL=http://kubernetes-vm:9200"
    echo "  - ES_PASSWORD=changeme"
    echo "  - USE_PASSWORD=true"
else
    echo "Error: variables.env file not found"
    exit 1
fi

echo "Setup completed successfully!"
echo "Repository location: /root/hotel-finder-query-constructor" 