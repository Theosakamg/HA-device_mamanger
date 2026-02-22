#!/bin/bash

# HA Device Manager - View Development Logs

echo "Viewing Home Assistant logs (Ctrl+C to exit)..."
echo "Filtering for device_manager..."
echo ""

docker compose logs -f homeassistant | grep --line-buffered -i "device_manager\|device-manager\|ERROR\|WARNING"
