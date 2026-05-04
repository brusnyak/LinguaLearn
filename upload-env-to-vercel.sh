#!/bin/bash
# Upload environment variables from .env to Vercel

echo "Uploading environment variables to Vercel..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    exit 1
fi

# Read .env and add each variable to Vercel
while IFS='=' read -r name value; do
    # Skip comments and empty lines
    [[ $name =~ ^#.*$ ]] && continue
    [[ -z "$name" ]] && continue
    
    # Skip empty values
    if [ -z "$value" ]; then
        echo "Skipping $name (empty value)"
        continue
    fi
    
    echo "Adding/Updating $name..."
    
    # Try to remove existing var first (ignore errors)
    vercel env rm "$name" production --yes 2>&1 | grep -v "not found" || true
    
    # Add the new value
    echo "$value" | vercel env add "$name" production --yes 2>&1 | grep -v "Saved" || true
    
    echo "---"
done < .env

echo "Done! Check Vercel dashboard to verify."
