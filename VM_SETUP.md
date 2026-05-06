# PocketBase Setup on Oracle VM

## Prerequisites
- Oracle VM IP: 84.8.249.139
- User: ubuntu
- SSH Key: ssh-key-2026-02-21.key

## Step 1: Upload Setup Script to VM

```bash
# Copy the setup script to VM
scp -i ssh-key-2026-02-21.key setup-pocketbase.sh ubuntu@84.8.249.139:/home/ubuntu/

# SSH into the VM
ssh -i ssh-key-2026-02-21.key ubuntu@84.8.249.139
```

## Step 2: Run Setup Script (ON THE VM)

```bash
# Make the script executable
chmod +x setup-pocketbase.sh

# Run the setup
./setup-pocketbase.sh
```

## Step 3: Verify PocketBase is Running

```bash
# Check if PocketBase is running
curl http://localhost:8090/api/health

# Check the service status
sudo systemctl status pocketbase

# Check logs
sudo journalctl -u pocketbase -f
```

## Step 4: Access PocketBase Admin UI

Open in browser: `http://84.8.249.139:8090/_/`

First time you'll be prompted to create an admin account.

## Step 5: Configure Firewall (if needed)

```bash
# Check if port 8090 is open
sudo ufw status

# Open port 8090 if needed
sudo ufw allow 8090/tcp
```

## Manual Setup (if script fails)

```bash
# Download PocketBase
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.7/pocketbase_0.22.7_linux_amd64.zip
unzip pocketbase_0.22.7_linux_amd64.zip

# Create systemd service
sudo nano /etc/systemd/system/pocketbase.service
```

Add this to the service file:
```ini
[Unit]
Description=PocketBase
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu
ExecStart=/home/ubuntu/pocketbase serve --http=0.0.0.0:8090
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable pocketbase
sudo systemctl start pocketbase
sudo systemctl status pocketbase
```

## Import Database Schema

Once PocketBase is running and you've created an admin account:

1. Go to `http://84.8.249.139:8090/_/`
2. Navigate to Settings → Import collections
3. Upload the `pb_schema.json` file from the project root

Or use the API:
```bash
# Upload schema via API (replace ADMIN_TOKEN with actual token)
curl -X POST http://84.8.249.139:8090/api/collections/import \
  -H "Authorization: ADMIN_TOKEN" \
  -F "collections=@pb_schema.json"
```
