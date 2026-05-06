#!/bin/bash
# PocketBase setup script for Oracle VM
# Run this on the Oracle VM: bash setup-pocketbase.sh

set -e

echo "=== PocketBase Setup for Oracle VM ==="
echo ""

# Check architecture
ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    echo "Detected ARM64 architecture"
    PB_URL="https://github.com/pocketbase/pocketbase/releases/download/v0.22.7/pocketbase_0.22.7_linux_arm64.zip"
    PB_ZIP="pocketbase_0.22.7_linux_arm64.zip"
else
    echo "Detected x86_64 architecture"
    PB_URL="https://github.com/pocketbase/pocketbase/releases/download/v0.22.7/pocketbase_0.22.7_linux_amd64.zip"
    PB_ZIP="pocketbase_0.22.7_linux_amd64.zip"
fi

# Download PocketBase
echo ""
echo ">>> Downloading PocketBase..."
if [ -f "$PB_ZIP" ]; then
    echo "File already exists, skipping download"
else
    wget -O "$PB_ZIP" "$PB_URL"
fi

# Extract
echo ""
echo ">>> Extracting PocketBase..."
unzip -o "$PB_ZIP"

# Make executable
chmod +x pocketbase

# Create systemd service
echo ""
echo ">>> Creating systemd service..."
sudo tee /etc/systemd/system/pocketbase.service > /dev/null <<EOL
[Unit]
Description=PocketBase
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(pwd)/pocketbase serve --http=0.0.0.0:8090
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOL

# Reload and start service
echo ""
echo ">>> Starting PocketBase service..."
sudo systemctl daemon-reload
sudo systemctl enable pocketbase
sudo systemctl start pocketbase

# Check status
echo ""
echo ">>> Checking service status..."
sudo systemctl status pocketbase --no-pager

# Open firewall port
echo ""
echo ">>> Configuring firewall..."
sudo ufw allow 8090/tcp || echo "Warning: Could not configure ufw"

# Test connection
echo ""
echo ">>> Testing local connection..."
curl -s http://localhost:8090/api/health || echo "Warning: Could not connect locally"

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "PocketBase is now running at: http://$(curl -s ifconfig.me):8090"
echo "Admin UI: http://$(curl -s ifconfig.me):8090/_/"
echo ""
echo "Next steps:"
echo "1. Open the Admin UI in your browser"
echo "2. Create an admin account"
echo "3. Import the schema from pb_schema.json"
