$ErrorActionPreference = "Continue"
$requestDir = Join-Path $env:LOCALAPPDATA "TRON\desktop-agent"
$request = Join-Path $requestDir "show.request"
try {
    New-Item -ItemType Directory -Force -Path $requestDir | Out-Null
    if (-not (Test-Path -LiteralPath $request)) {
        $stream = [System.IO.File]::Open($request, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite -bor [System.IO.FileShare]::Delete)
        try {
            $bytes = [System.Text.Encoding]::ASCII.GetBytes("show")
            $stream.Write($bytes, 0, $bytes.Length)
        } finally {
            $stream.Dispose()
        }
    }
} catch {
    # The desktop agent may already be reading this file. Showing the window still continues.
}

# 2. Signal directly via loopback socket
$portFile = Join-Path $requestDir "instance.port"
if (Test-Path -LiteralPath $portFile) {
    try {
        $p = [int](Get-Content $portFile -Raw).Trim()
        $tcp = New-Object System.Net.Sockets.TcpClient
        $iar = $tcp.BeginConnect("127.0.0.1", $p, $null, $null)
        if ($iar.AsyncWaitHandle.WaitOne(1000, $false)) {
            $tcp.EndConnect($iar)
            $w = New-Object System.IO.StreamWriter($tcp.GetStream(), [System.Text.Encoding]::UTF8)
            $w.WriteLine("SHOW")
            $w.Flush()
            $tcp.Close()
        } else {
            $tcp.Close()
        }
    } catch {}
}

Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class TronWin {
  public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, IntPtr processId);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
  public static IntPtr Found;
  public static IntPtr Find() {
    Found = IntPtr.Zero;
    EnumWindows(Callback, IntPtr.Zero);
    return Found;
  }
  public static bool Callback(IntPtr hWnd, IntPtr lParam) {
    int length = GetWindowTextLength(hWnd);
    if (length <= 0) return true;
    StringBuilder title = new StringBuilder(length + 1);
    GetWindowText(hWnd, title, title.Capacity);
    if (title.ToString() == "TRON Desktop Agent") {
      Found = hWnd;
      return false;
    }
    return true;
  }
}
"@

$hwnd = [TronWin]::Find()
if ($hwnd -ne [IntPtr]::Zero) {
    $foreground = [TronWin]::GetForegroundWindow()
    $foregroundThread = [TronWin]::GetWindowThreadProcessId($foreground, [IntPtr]::Zero)
    $currentThread = [TronWin]::GetCurrentThreadId()
    $attached = $false
    if ($foregroundThread -ne 0 -and $foregroundThread -ne $currentThread) {
        $attached = [TronWin]::AttachThreadInput($currentThread, $foregroundThread, $true)
    }
    [TronWin]::ShowWindow($hwnd, 9) | Out-Null
    [TronWin]::BringWindowToTop($hwnd) | Out-Null
    [TronWin]::SetForegroundWindow($hwnd) | Out-Null
    if ($attached) {
        [TronWin]::AttachThreadInput($currentThread, $foregroundThread, $false) | Out-Null
    }
}
exit 0
