# Clear Browser Cache & Database

## The Problem

You're seeing: `VersionError: The requested version (3) is less than the existing version (5)`

This happens because your browser has an old version of the database cached.

## Solution: Clear IndexedDB

### Option 1: Chrome DevTools (Recommended)

1. Open Chrome DevTools (F12 or Cmd+Option+I)
2. Go to the **Application** tab
3. In the left sidebar, expand **Storage** → **IndexedDB**
4. Right-click on `lingua-learn-db` and select **Delete database**
5. Also delete any other databases you see (like `translation-cache`)
6. Refresh the page (Cmd+R or F5)

### Option 2: Clear All Site Data

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. In the left sidebar, click **Storage**
4. Click **Clear site data** button
5. Refresh the page

### Option 3: Incognito/Private Window

1. Open a new Incognito/Private window (Cmd+Shift+N in Chrome)
2. Navigate to http://localhost:5173
3. This will start fresh without any cached data

## After Clearing

- The app will recreate the database with version 5
- You'll need to create a new user account
- All previous data will be lost (this is expected for development)
