#!/bin/bash

# HA Device Manager - Development Environment Startup Script
# This script sets up and starts a local Home Assistant instance for testing

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}HA Device Manager - Dev Mode${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${YELLOW}Error: Docker is not running${NC}"
  echo "Please start Docker and try again"
  exit 1
fi

# Check if frontend is built
if [ ! -f "frontend/dist/device-manager.js" ]; then
  echo -e "${YELLOW}Frontend bundle not found. Building...${NC}"
  echo ""

  cd frontend
  if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
  fi

  echo "Building frontend..."
  npm run build
  cd ..
  echo ""
fi

# Copy frontend to component
echo "Deploying frontend to component..."
mkdir -p custom_components/ha_device_manager/frontend/dist
cp frontend/dist/device-manager.js custom_components/ha_device_manager/frontend/dist/
echo ""

# Create dev-config directory if it doesn't exist
mkdir -p dev-config
mkdir -p dev-config/custom_components

# Install HACS if not already present
if [ ! -d "dev-config/custom_components/hacs" ]; then
  echo -e "${YELLOW}HACS not found. Installing HACS...${NC}"
  HACS_URL="https://github.com/hacs/integration/releases/latest/download/hacs.zip"
  TEMP_DIR=$(mktemp -d)

  if curl -sL "$HACS_URL" -o "$TEMP_DIR/hacs.zip"; then
    unzip -qq "$TEMP_DIR/hacs.zip" -d dev-config/custom_components/hacs
    rm -rf "$TEMP_DIR"
    echo -e "${GREEN}✓ HACS installed successfully${NC}"
  else
    echo -e "${YELLOW}Warning: Failed to download HACS. Continuing without it...${NC}"
    rm -rf "$TEMP_DIR"
  fi
  echo ""
else
  echo -e "${GREEN}✓ HACS already installed${NC}"
  echo ""
fi

# Start Docker Compose
echo -e "${GREEN}Starting Home Assistant development environment...${NC}"
echo ""
docker compose up -d

echo ""
echo -e "${GREEN}✓ Home Assistant is starting!${NC}"
echo ""
echo -e "${YELLOW}Access Home Assistant at:${NC} http://localhost:8123"
echo -e "${YELLOW}Access Device Manager at:${NC} http://localhost:8123/ha_device_manager"
echo ""
echo -e "${BLUE}Initial setup:${NC}"
echo "1. Wait ~30 seconds for Home Assistant to start"
echo "2. Open http://localhost:8123 in your browser"
echo "3. Complete the onboarding (create user account)"
echo "4. Navigate to http://localhost:8123/ha_device_manager"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  View logs:     docker compose logs -f homeassistant"
echo "  Restart:       docker compose restart"
echo "  Stop:          docker compose down"
echo "  Rebuild:       docker compose up -d --build"
echo ""
echo -e "${BLUE}Development workflow:${NC}"
echo "1. Edit code in custom_components/ or frontend/src/"
echo "2. For frontend changes: cd frontend && npm run build && cd .."
echo "3. Run: docker compose restart"
echo "4. Refresh browser (Ctrl+Shift+R for hard refresh)"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
