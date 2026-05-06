# PocketBase Setup Guide

PocketBase is a simple, self-hosted backend in a single binary with built-in:
- SQLite database
- Real-time subscriptions
- Authentication
- File storage
- Admin dashboard

## Quick Start with Docker (Recommended)

1. **Start PocketBase with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

2. **Access the Admin Dashboard:**
   Open http://localhost:8090/_/ in your browser

3. **Create Admin Account:**
   - First time you open the dashboard, you'll be prompted to create an admin account
   - Use a strong email and password

4. **Import the Schema:**
   - In the Admin Dashboard, go to Settings → Import collections
   - Upload the `pb_schema.json` file from this project
   - Or manually create the collections (words, user_settings, user_progress)

5. **Enable User Registration (Optional):**
   - Go to Settings → Auth providers
   - Enable "Allow users to sign up"

6. **Update your .env file:**
   ```env
   VITE_PB_URL=http://localhost:8090
   ```

## Manual Installation (Without Docker)

1. **Download PocketBase:**
   - Visit https://github.com/pocketbase/pocketbase/releases
   - Download the binary for your OS (macOS, Linux, Windows)

2. **Extract and Run:**
   ```bash
   # macOS/Linux
   unzip pocketbase_*.zip
   ./pocketbase serve
   
   # Windows
   pocketbase.exe serve
   ```

3. **Follow steps 2-6 from the Docker section above.**

## Collections Schema

The `pb_schema.json` file includes these collections:

### words
- `user_id` (text, required) - Owner of the word
- `term` (text, required) - The word/phrase in target language
- `translation` (text, required) - Translation in native language
- `phonetic` (text, optional)
- `category` (text, optional)
- `type` (text, optional) - 'word' or 'phrase'
- `mastery_level` (number) - 0-5
- `last_reviewed` (number) - timestamp
- `times_correct` (number)
- `is_mastered` (bool)
- `association` (text, optional)
- `created_at` (number) - timestamp

### user_settings
- `user_id` (text, required)
- `profile` (json) - User profile data
- `theme` (text) - 'light', 'dark', or 'system'
- `notifications_enabled` (bool)
- `notification_time` (text)
- `daily_goal` (number)
- `auto_read_flashcards` (bool)

### user_progress
- `user_id` (text, required)
- `current_streak` (number)
- `last_study_date` (text)
- `study_history` (json) - array of dates
- `xp` (number)
- `level` (number)
- `completed_dungeon_levels` (json) - array of level IDs

## Security Rules

All collections have these access rules:
- **List/View:** `user_id = @request.auth.id`
- **Create:** `user_id = @request.auth.id`
- **Update:** `user_id = @request.auth.id`
- **Delete:** `user_id = @request.auth.id`

This ensures users can only access their own data.

## Monitoring

PocketBase includes a built-in admin dashboard at `/_/` where you can:
- View all collections and records
- Monitor user registrations
- View API requests logs
- Manage authentication settings
- Backup/restore data (SQLite file)

## Backup

Since PocketBase uses SQLite, backup is simple:
```bash
# Stop PocketBase first
docker-compose stop pocketbase

# Copy the database file
cp pb_data/data.db pb_data/data.db.backup

# Restart
docker-compose start pocketbase
```

Or use cron for automated backups:
```bash
# Add to crontab (crontab -e)
0 2 * * * cp /path/to/pb_data/data.db /path/to/backups/data_$(date +\%Y\%m\%d).db
```

## Migrating from Supabase

If you're currently using Supabase:

1. Export your data from Supabase
2. Set up PocketBase using the steps above
3. Update your `.env` file to use `VITE_PB_URL` instead of Supabase vars
4. Rebuild your app: `npm run build`
5. Log in to PocketBase and sync your data

## Why PocketBase?

| Feature | PocketBase | Supabase |
|---------|------------|---------|
| Setup complexity | Single binary | 13+ containers |
| RAM usage | ~30 MB | 2-4 GB |
| Database | SQLite | PostgreSQL |
| Admin UI | Built-in | Separate (Studio) |
| Monitoring | Web UI | Requires setup |
| Backup | Copy 1 file | pg_dump |
| Self-hosting | Very easy | Complex |

## Troubleshooting

**Port 8090 already in use:**
```bash
# Change port in docker-compose.yml or run with:
./pocketbase serve --http=0.0.0.0:8091
```

**Can't access admin dashboard:**
- Make sure PocketBase is running
- Check firewall settings
- Try http://127.0.0.1:8090/_/ instead

**Data not syncing:**
- Verify `VITE_PB_URL` is set correctly in `.env`
- Check browser console for errors
- Ensure you're logged in to PocketBase
