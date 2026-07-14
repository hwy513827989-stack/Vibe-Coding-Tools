# Job Tracker
A local desktop app for tracking job and volunteer applications through stages:
觀望中 (Observing) → 修改中 (Editing) → 已投遞 (Submitted) → 已面試 (Interviewed).

## Features
- Editable application list with name, link, and stage dates
- Job info tags (salary, location, work mode, skills)
- Three views: **Table**, **Calendar** (daily activity), **Data** (funnel + bar chart)
- One-click job import: paste a job posting, key fields are extracted automatically (requires an API key, see below)
- Bilingual UI (中 / EN) — toggles interface text only, never your data
- Export / import JSON backups
- Data stored locally; nothing leaves your machine

## Requirements
- [Node.js](https://nodejs.org) (LTS)

## Setup
```bash
npm install
```

## Development
```bash
npm run electron   # run in a desktop window for testing
```

## Build the desktop app
```bash
npm run dist
```
The packaged app is in `dist/mac/` (or `dist/mac-arm64/`). Drag `Job Tracker.app` to `/Applications`.

## Run as a plain web server (optional)
```bash
npm start          # then open http://localhost:3210
```

## First launch on macOS (Gatekeeper warning)
The first time you double-click `start.command` (or the packaged `.app`), macOS will
block it with **"Apple could not verify this app is free of malware."** This is expected
for unsigned local tools, not a sign of a problem.

To allow it:
- Click **Done** on the warning (not "Move to Trash")
- Go to **System Settings → Privacy & Security**, scroll down, and click **Open Anyway**
  next to the blocked item, then confirm

Or from Terminal, in the project folder:
```bash
xattr -d com.apple.quarantine start.command stop.command
```
You only need to do this once.

## Data storage
- **Packaged app**: `~/Library/Application Support/Job Tracker/data.json`
- **Plain web server**: `data.json` in the project folder

Data is plain JSON and is excluded from this repository.

## Job import (optional, needs an API key)
The "Import job" feature sends the pasted text to the Anthropic API to extract
structured fields. To enable it, put your key in a file named `anthropic-key.txt`:
- **Packaged app**: in `~/Library/Application Support/Job Tracker/anthropic-key.txt`
- **Plain web server**: in the project folder, or set the `ANTHROPIC_API_KEY` env var

The key file is git-ignored and never leaves your machine except for the API call itself.
Without a key, the rest of the app works normally; only the import button is disabled.

## Project structure
- `public/index.html` — markup
- `public/styles.css` — all styles
- `public/app.js` — all frontend logic (views, charts, i18n)
- `server.js` — Express API + job-parsing route
- `store.js` — JSON-file data layer
- `main.js` — Electron entry point
