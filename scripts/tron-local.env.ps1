# TRON Local Environment Configuration
# Override machine-specific paths here if needed.
# Do NOT store credentials, passwords, or secrets in this file.

$script:JavaHome = if (Test-Path "C:\Java\jdk-21.0.7.6-hotspot") { "C:\Java\jdk-21.0.7.6-hotspot" } else { $env:JAVA_HOME }
$script:PythonExe = if (Test-Path "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe") {
    "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe"
} elseif (Test-Path "backend\stt-worker\venv\Scripts\python.exe") {
    "backend\stt-worker\venv\Scripts\python.exe"
} else {
    "python"
}
$script:MysqlHome = "C:\Program Files\MySQL\MySQL Server 8.4"
$script:MysqlData = "$env:USERPROFILE\mysql84-data"
$script:VitePort = 5174
$script:SpringPort = 8080
$script:SttPort = 8091
$script:OllamaPort = 11434
$script:VoicevoxPort = 50021
