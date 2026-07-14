const express = require("express");
const path = require("path");
const fs = require("fs");
const store = require("./store");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// API key is read from env var ANTHROPIC_API_KEY, or from a plain-text file
// "anthropic-key.txt" in the data directory. The key is never committed to
// the repo (data dir is git-ignored / outside the project for the packaged app).
function getApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY.trim();
  const dataDir = process.env.DATA_DIR || __dirname;
  const keyFile = path.join(dataDir, "anthropic-key.txt");
  try {
    if (fs.existsSync(keyFile)) return fs.readFileSync(keyFile, "utf-8").trim();
  } catch (_) {}
  return "";
}

app.get("/api/rows", (req, res) => {
  res.json(store.getAll());
});

app.post("/api/rows", (req, res) => {
  res.json(store.addRow());
});

app.put("/api/rows/:id", (req, res) => {
  const row = store.updateRow(req.params.id, req.body || {});
  if (!row) return res.status(404).json({ error: "not found" });
  res.json(row);
});

app.delete("/api/rows/:id", (req, res) => {
  store.deleteRow(req.params.id);
  res.json({ ok: true });
});

// Bulk import (restoring a backup, or migrating from the old
// localStorage-based version). mode: "replace" wipes existing data first,
// "append" adds rows after the current ones.
app.post("/api/import", (req, res) => {
  const { rows, mode } = req.body || {};
  if (!Array.isArray(rows)) return res.status(400).json({ error: "rows must be an array" });
  const result = store.importRows(rows, mode);
  res.json({ ok: true, imported: rows.length, total: result.length });
});

// Tells the frontend whether job-parsing is available (i.e. a key is set).
app.get("/api/parse-job/status", (req, res) => {
  res.json({ available: !!getApiKey() });
});

// Parse a pasted job description into structured fields via the Anthropic API.
app.post("/api/parse-job", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(400).json({ error: "no_api_key" });
  }

  const text = (req.body && req.body.text ? String(req.body.text) : "").slice(0, 20000);
  if (!text.trim()) {
    return res.status(400).json({ error: "empty_text" });
  }

  const prompt =
    "Extract structured fields from the job posting below. " +
    "Return ONLY a JSON object, no markdown, no explanation, with exactly these keys:\n" +
    '{"title": string, "company": string, "salary": string, "location": string, ' +
    '"mode": one of "remote"|"hybrid"|"onsite"|"", "field": string, "skills": string[]}\n' +
    "Rules: keep every value SHORT (skills are single words or short phrases, max ~8 items). " +
    "Preserve the original language of the posting (Chinese or English) for values. " +
    "If a field is not present, use an empty string (or empty array for skills). " +
    "Do not invent information.\n\n" +
    "JOB POSTING:\n" +
    text;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: "api_error", detail: errText.slice(0, 500) });
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    let raw = textBlock ? textBlock.text : "";
    raw = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      return res.status(502).json({ error: "parse_failed", raw: raw.slice(0, 500) });
    }

    res.json({
      ok: true,
      result: {
        title: typeof parsed.title === "string" ? parsed.title : "",
        company: typeof parsed.company === "string" ? parsed.company : "",
        salary: typeof parsed.salary === "string" ? parsed.salary : "",
        location: typeof parsed.location === "string" ? parsed.location : "",
        mode: ["remote", "hybrid", "onsite"].includes(parsed.mode) ? parsed.mode : "",
        field: typeof parsed.field === "string" ? parsed.field : "",
        skills: Array.isArray(parsed.skills)
          ? parsed.skills.filter((s) => typeof s === "string").slice(0, 8)
          : [],
      },
    });
  } catch (err) {
    res.status(500).json({ error: "request_failed", detail: String(err).slice(0, 300) });
  }
});

const PORT = process.env.PORT || 3210;
app.listen(PORT, () => {
  console.log(`Job tracker running at http://localhost:${PORT}`);
  console.log(`Data is stored in: ${path.join(__dirname, "data.json")}`);
});
