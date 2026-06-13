# Vibe-Coding-Tools


# Job Tracker

A simple local desktop app for tracking job and volunteer applications through stages: Observing → 修改中 → 已投递 → 已通过.

## Features

- Editable list of applications with name, link, and stage dates
- Stats overview (totals per stage, pass rate)
- Pipeline distribution progress bar
- Export / import JSON backups
- Runs locally; data never leaves your machine

## Requirements

- [Node.js](https://nodejs.org) (LTS)

## Setup

```bash
npm install
```

## Development

Run the app in a window for testing UI/logic changes:

```bash
npm run electron
```

## Build the desktop app

```bash
npm run dist
```

The packaged app will be in `dist/mac/` (or `dist/mac-arm64/`), e.g. `Job Tracker.app`. Drag it to `/Applications` to install.

## Run as a plain web server (optional)

```bash
npm start
```

Then open `http://localhost:3210` in a browser.

## Data storage

- **Packaged app**: `~/Library/Application Support/Job Tracker/data.json`
- **Plain web server (`npm start`)**: `data.json` in the project folder

Data is plain JSON and is not included in this repository (see `.gitignore`).

## Tech stack

- Node.js + Express (backend, JSON file storage)
- Electron (desktop wrapper)
- Vanilla HTML/CSS/JS (frontend)
