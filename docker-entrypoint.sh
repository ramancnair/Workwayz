#!/bin/sh
# Ensure data directory exists
mkdir -p /app/data

# If connections.json doesn't exist in the data volume, initialize it as empty object
if [ ! -f /app/data/connections.json ]; then
  echo "{}" > /app/data/connections.json
fi

# If .env.local doesn't exist, initialize it
if [ ! -f /app/data/.env.local ]; then
  touch /app/data/.env.local
fi

# Create symlinks from root to the volume
ln -sf /app/data/connections.json /app/connections.json
ln -sf /app/data/.env.local /app/.env.local

# Execute the main command (e.g. node server.js)
exec "$@"
