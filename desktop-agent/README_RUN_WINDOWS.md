# Running TRON Desktop Agent on Windows

## Quick Start

Simply run the launcher script:

```cmd
run-tron-agent.cmd
```

or via PowerShell:

```powershell
.\run-tron-agent.ps1
```

The launcher will:
1. Automatically locate Java 21 (checking `JAVA_HOME` and standard paths).
2. Start the TRON Desktop Agent JavaFX companion window.
3. If an existing agent is already running, it brings that existing window to the front and focuses it.

## Maven Command Line

Alternatively, launch with Maven from the `desktop-agent` directory:

```cmd
.\mvnw.cmd javafx:run
```

## Useful Environment Variables

- `TRON_CORE_URL`: WebSocket URL of TRON Core (default: `ws://localhost:8080/api/v1/desktop-agent/ws`).
- `TRON_WORKSPACE`: Default allowed directory sandbox for agent file and terminal operations.
- `TRON_WEB_URL`: Web console URL (default: `http://localhost:5174`).
- `TRON_UI_SMOKE`: Set to `true` to perform a quick UI initialization smoke test and exit cleanly.

## System Tray

- Closing the window hides the agent to the Windows system tray.
- Double-click the TRON tray icon (or right-click → **Open TRON Desktop Agent**) to restore the window.
- Right-click the tray icon and select **Exit** to shut down the agent completely.
