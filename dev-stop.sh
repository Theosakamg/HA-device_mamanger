#!/bin/bash

# HA Device Manager - Stop Development Environment

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Stopping Home Assistant development environment...${NC}"
echo ""

docker compose down

echo ""
echo -e "${GREEN}✓ Environment stopped${NC}"
echo ""
echo "To start again: ./dev-start.sh"
