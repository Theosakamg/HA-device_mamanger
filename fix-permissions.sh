#!/bin/bash
if [ -d "dev-config" ]; then
  sudo chown -R $(id -u):$(id -g) dev-config/ 2>/dev/null || true
fi
