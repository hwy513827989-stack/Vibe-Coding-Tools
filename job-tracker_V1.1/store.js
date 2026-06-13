const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// When run inside the packaged Electron app, main.js sets DATA_DIR to a
// writable per-user app data folder. When run as a plain Node server
// (e.g. via `npm start`), it falls back to this project folder.
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, "data.json");
const STAGE_KEYS = ["observing", "editing", "submitted", "passed"];

function emptyRow() {
  return {
    id: crypto.randomUUID(),
    name: "",
    url: "",
    stages: { observing: null, editing: null, submitted: null, passed: null },
  };
}

function normalizeRow(r) {
  if (!r || typeof r !== "object") return emptyRow();
  const s = r.stages && typeof r.stages === "object" ? r.stages : {};
  return {
    id: typeof r.id === "string" && r.id ? r.id : crypto.randomUUID(),
    name: typeof r.name === "string" ? r.name : "",
    url: typeof r.url === "string" ? r.url : "",
    stages: {
      observing: s.observing || null,
      editing: s.editing || null,
      submitted: s.submitted || null,
      passed: s.passed || null,
    },
  };
}

function load() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const initial = [emptyRow()];
      save(initial);
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [emptyRow()];
    const rows = data.map(normalizeRow);
    return rows.length ? rows : [emptyRow()];
  } catch (err) {
    console.error("Failed to load data.json, starting fresh:", err.message);
    return [emptyRow()];
  }
}

function save(rows) {
  // Write atomically: write to a temp file then rename, to avoid corruption
  // if the process is killed mid-write.
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

let rows = load();

function getAll() {
  return rows;
}

function addRow() {
  const row = emptyRow();
  rows.push(row);
  save(rows);
  return row;
}

function updateRow(id, patch) {
  const row = rows.find((r) => r.id === id);
  if (!row) return null;

  if (typeof patch.name === "string") row.name = patch.name;
  if (typeof patch.url === "string") row.url = patch.url;
  if (patch.stages && typeof patch.stages === "object") {
    STAGE_KEYS.forEach((key) => {
      if (key in patch.stages) {
        row.stages[key] = patch.stages[key] || null;
      }
    });
  }

  save(rows);
  return row;
}

function deleteRow(id) {
  const before = rows.length;
  rows = rows.filter((r) => r.id !== id);
  if (rows.length === 0) rows.push(emptyRow());
  save(rows);
  return rows.length !== before;
}

function importRows(importedRows, mode) {
  const normalized = importedRows.map(normalizeRow);
  if (mode === "replace") {
    rows = normalized.length ? normalized : [emptyRow()];
  } else {
    rows = rows.concat(normalized);
  }
  save(rows);
  return rows;
}

module.exports = {
  getAll,
  addRow,
  updateRow,
  deleteRow,
  importRows,
  STAGE_KEYS,
  DATA_FILE,
};
