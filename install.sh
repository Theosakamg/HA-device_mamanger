#!/bin/bash

# HA Device Manager Installation Script
# This script installs the HA Device Manager custom component to your Home Assistant configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}HA Device Manager - Installation${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Check if config directory is provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: Home Assistant config directory not specified${NC}"
  echo ""
  echo "Usage: ./install.sh /path/to/homeassistant/config"
  echo ""
  echo "Example: ./install.sh /home/homeassistant/.homeassistant"
  echo "         ./install.sh /config  (for Home Assistant OS/Container)"
  exit 1
fi

CONFIG_DIR="$1"
COMPONENT_NAME="ha_device_manager"
SOURCE_DIR="custom_components/${COMPONENT_NAME}"
TARGET_DIR="${CONFIG_DIR}/custom_components/${COMPONENT_NAME}"

# Check if config directory exists
if [ ! -d "$CONFIG_DIR" ]; then
  echo -e "${RED}Error: Config directory does not exist: ${CONFIG_DIR}${NC}"
  exit 1
fi

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
  echo -e "${RED}Error: Source component not found: ${SOURCE_DIR}${NC}"
  echo "Make sure you're running this script from the project root directory."
  exit 1
fi

# Check if frontend is built
if [ ! -f "frontend/dist/device-manager.js" ]; then
  echo -e "${YELLOW}Warning: Frontend bundle not found. Building frontend first...${NC}"
  echo ""
  
  if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    echo ""
  fi
  
  echo "Building frontend..."
  cd frontend
  npm run build
  cd ..
  echo ""
  
  if [ ! -f "frontend/dist/device-manager.js" ]; then
    echo -e "${RED}Error: Frontend build failed${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✓ Frontend built successfully${NC}"
  echo ""
fi

# Create custom_components directory if it doesn't exist
mkdir -p "${CONFIG_DIR}/custom_components"

# Copy the component
echo "Installing component to ${TARGET_DIR}..."
cp -r "$SOURCE_DIR" "$TARGET_DIR"

# Copy frontend dist to component
echo "Copying frontend bundle..."
mkdir -p "${TARGET_DIR}/frontend/dist"
cp frontend/dist/device-manager.js "${TARGET_DIR}/frontend/dist/"

echo ""
echo -e "${GREEN}✓ Installation complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Restart Home Assistant"
echo "2. Add the integration via:"
echo "   Configuration > Integrations > Add Integration > HA Device Manager"
echo "3. Access the interface at: http://your-ha-url/ha_device_manager"
echo ""
echo -e "${GREEN}Installation path: ${TARGET_DIR}${NC}"
