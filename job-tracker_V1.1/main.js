const { app, BrowserWindow } = require("electron");
const path = require("path");

const PORT = 3210;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 720,
    minHeight: 500,
    title: "Job Tracker",
    backgroundColor: "#f5f5f5",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);
}

app.whenReady().then(() => {
  // Store data in the standard per-user app data folder, e.g.
  // ~/Library/Application Support/Job Tracker/data.json
  process.env.DATA_DIR = app.getPath("userData");
  process.env.PORT = String(PORT);

  // Starts the Express server (server.js calls app.listen on require).
  require("./server");

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
