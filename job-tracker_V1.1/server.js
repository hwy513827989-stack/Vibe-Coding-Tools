const express = require("express");
const path = require("path");
const store = require("./store");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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

const PORT = process.env.PORT || 3210;
app.listen(PORT, () => {
  console.log(`Job tracker running at http://localhost:${PORT}`);
  console.log(`Data is stored in: ${path.join(__dirname, "data.json")}`);
});
