# YouTube Research

YouTube Research lives in the existing admin app under Sales & Marketing. Routes are `/admin/youtube-research` and `/api/admin/youtube/...`. It uses the same admin session, Postgres database, and encryption key as the rest of Techantum. There is no separate user system, job queue, or scheduled sync.

## Access

Super Admin has every permission. Other admin users start with no access. A Super Admin grants keys from YouTube Research → Settings. The keys are:

- `youtube_research.view`
- `youtube_research.channels.manage`
- `youtube_research.videos.import`
- `youtube_research.videos.refresh`
- `youtube_research.research.edit`
- `youtube_research.analytics.view`
- `youtube_research.competitors.view`
- `youtube_research.reports.export`
- `youtube_research.settings.manage`

The sidebar link is visible under Sales & Marketing. The page and every API call still check the grant.

## Projects

Research is organized by project. The sidebar lists Research Projects and Settings. Inside a project, Overview, Channels, Video Explorer, Analysis, Channel Comparison, and Reports sit in a side menu. Video comparison stays available from Video Explorer and is not a project tab. The open project is remembered in the `ta_yt_project` cookie. The breadcrumb is YouTube Research / Research Projects / project name.

Each project has one own channel (the channel this project is about; the app does not verify ownership) and any number of competitors. The same YouTube channel can belong to more than one project. Removing it from a project only removes that link. Channel and video rows stay when another project still uses them.

Topics, thumbnail captions, and research notes are stored per project. Existing channels, videos, and notes were copied into a project named Existing research. That project cannot be archived. Topics are not seeded.

Imports start from the project, for selected channels or every channel in the project. They still use `channels.list`, `playlistItems.list`, and `videos.list`, and they also store public tags, category id, language, duration, and the channel publish date. Refresh does not clear project notes. There is no scheduled sync.

Video Explorer searches title, description, and tags only while the video row is inside the 30-day window, so a stale title or tag cannot be matched and returned. Compare screens and reports label figures as YouTube Data API public values. They do not calculate engagement rate, average views, or subscriber growth. The Data API does not return history, so charts use imported-video publish months and the current public counts on those rows. Publishing counts are counts of imported records. PDF exports show the first 40 rows in a landscape table (title, channel, role, date, length, views, likes, comments, topic) and point to Excel for the full set. Excel and CSV still stop at 5,000 rows. The PDF uses a Unicode system font when one is available so titles are not garbled.

## API key

Set `YOUTUBE_API_KEY` on the server, or save a key in Settings. A saved key is encrypted with `AI_SECRETS_ENCRYPTION_KEY` (AES-256-GCM, the same helper as AI Gateway). The browser never receives the key. The last four characters are shown only to someone who can manage settings, and only for a key saved in the database.

Calls go only to `https://www.googleapis.com/youtube/v3/`. Channel lookup uses `channels.list` with `id` or `forHandle`. Imports use the uploads playlist (`playlistItems.list`) and then `videos.list`. `search.list` is not used. Test connection calls `channels.list?part=snippet&id=UC_x5XG1OV2P6uZZ5FSM9Ttw` and reports success only after Google returns that channel. An IP or referrer restriction is reported separately from an invalid key. Remaining quota is not shown.

## Import limits

Imports run in the request that starts them. The default limit is 50 videos and the settings maximum is 200, with a hard ceiling of 500. Playlist scanning stops after 20 pages. A second import cannot start for a channel that already has a running job. A job left running for more than 10 minutes is marked failed and can be retried. Preview does not write videos.

## What is stored

YouTube fields (title, description, thumbnail, duration, public view/like/comment counts, channel profile) are hidden 30 days after `fetched_at` or `last_refreshed_at`. Channel IDs, video IDs, classification, notes, topics, and thumbnail captions stay. Watch and channel links are rebuilt from those IDs so refresh and “open on YouTube” still work. Refresh does not overwrite research notes, topics, or captions.

Missing public statistics stay blank. They are not shown as zero. The screens do not calculate YouTube Analytics engagement rate, average views, or subscriber growth. Counts on screen are the public values returned by the YouTube Data API for the videos in this library. Analysis ranks those public views, likes, and comments, and can derive likes + comments and likes+comments per 1,000 views. An optional AI summary compares high- and low-interaction videos using title, tags, Short vs Video, and organic vs paid placement.

Topics are created by admins. Archiving a topic sets it inactive and leaves video notes in place.

## Reports

Excel, CSV, and PDF exports use the same video columns, include a data-source note, and stop at 5,000 rows. The PDF shows the first 40 of those rows. CSV is UTF-8 with a BOM. Cells that start with `=`, `+`, `-`, or `@` are escaped. The API key is not exported.

## Deploy

1. Apply `supabase/migrations/20261022120000_youtube_research.sql`, then `supabase/migrations/20261022133000_youtube_research_projects.sql`.
2. Set `AI_SECRETS_ENCRYPTION_KEY` if admins will save the API key in the UI.
3. Set `YOUTUBE_API_KEY` or save the key after sign-in.
4. Enable YouTube Data API v3 for that key in Google Cloud.

## Future Chrome extension

The extension is not part of this app. A later extension can call the same `/api/admin/youtube` JSON routes with the existing admin session. It should not embed the API key or scrape YouTube.
