# TRON AI — Public Product Architecture

**Author**: TRON Architecture Team  
**Specification Version**: 2.0  
**Scope**: Public Web Platform, Cloud AI Services, and Desktop Agent Ecosystem

---

## 1. Product Vision & Operational Separation

TRON AI is designed as a hybrid public AI product consisting of two primary operational domains:

```
+-----------------------------------------------------------------------------------+
|                                  TRON AI ECOSYSTEM                                |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ DOMAIN 1: WEB & CLOUD SERVICES ]        [ DOMAIN 2: COMPUTER AGENT ECOSYSTEM ]  |
|  - Available immediately upon login         - Requires authorized Desktop Agent   |
|  - Zero desktop devices required            - Full access to user's real PC       |
|  - Conversational AI (Chat)                 - Local source repositories & Git     |
|  - Low-latency Audio (Voice)                - Terminal execution & compilers      |
|  - Career Center, Resume & CV Tools         - Managed browser on user machine     |
|  - Mock Interview Simulations               - Local workspace sandboxing          |
|  - Server-side task processing              - One-time human approval gates       |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### 1.1 Zero-Device Web Experience
A public user registering with Google OAuth or local email/password can immediately access all core AI features without downloading, configuring, or pairing any desktop software. Chat, Voice, Career Center, and Interview tools execute entirely server-side.

### 1.2 Dedicated Computer Agent
When a user requests autonomous software engineering tasks on their local development environment (editing source code, invoking Maven/npm, inspecting Git branches, running tests), TRON connects to their personal PC via the **TRON Desktop Agent**.

---

## 2. Authentication & Identity Architecture

TRON employs a multi-tiered authentication model separating human user sessions from hardware device sessions:

```
[ User Browser ]                  [ Spring Boot Core ]                  [ Desktop Agent ]
       |                                   |                                    |
       |  1. Google OAuth2 Login           |                                    |
       |---------------------------------->|                                    |
       |                                   |                                    |
       |  2. Set HttpOnly Refresh Cookie   |                                    |
       |<----------------------------------|                                    |
       |                                   |                                    |
       |  3. Issue Short-Lived JWT         |                                    |
       |<----------------------------------|                                    |
       |                                   |                                    |
       |                                   |  4. Request Device Link Session    |
       |                                   |<-----------------------------------|
       |                                   |     Returns publicRequestId +      |
       |                                   |     pollSecret                     |
       |                                   |----------------------------------->|
       |                                   |                                    |
       |  5. Open Authorization URL        |                                    |
       |     (/connect-device?request=...) |                                    |
       |<.......................................................................|
       |                                   |                                    |
       |  6. Click [Authorize Computer]    |                                    |
       |---------------------------------->|                                    |
       |                                   |                                    |
       |                                   |  7. Poll with pollSecret           |
       |                                   |<-----------------------------------|
       |                                   |                                    |
       |                                   |  8. Single-Use Device Credential   |
       |                                   |----------------------------------->|
       |                                   |                                    |
       |                                   |  9. Authenticated WebSocket (WSS)  |
       |                                   |<==================================>|
```

### 2.1 Identity Storage (`user_identities`)
- Supports multiple identities per user account (e.g., Google OAuth + Local Password).
- Google accounts are keyed by stable Google Subject identifier (`sub`), immune to changes in email addresses.
- Auto-linking policy safely merges Google sign-ins with existing verified email accounts.

### 2.2 Device Credential Principle
- The Desktop Agent never holds, stores, or sees:
  - Google passwords or Google OAuth access tokens.
  - The TRON user's password.
  - The TRON user's browser JWT or session cookies.
- Spring generates a distinct, random, 32-byte hexadecimal `deviceCredential` delivered strictly once during device link completion.
- Stored on the user's computer inside an encrypted, platform-specific `CredentialStore`.

### 2.3 Session Decoupling
- **Web Logout**: When a user logs out from TRON Web, the browser refresh cookie and access JWT are invalidated.
- **Desktop Continuity**: The Desktop Agent remains **ONLINE** and authenticated over WebSocket. When the user signs in again on any browser, the computer is instantly available without re-authorization.

---

## 3. Desktop Agent Authorization Protocol

### 3.1 Browser-Based Onboarding ("Continue with TRON")
1. **Initiation**: The user launches TRON Desktop Agent and clicks **[ Continue with TRON ]**.
2. **Device Identity**: The agent retrieves or creates a persistent `deviceUuid` and RSA keypair.
3. **Session Creation**: Calls `POST /api/v1/desktop-agents/link-requests` with hostname, OS, agent version, public key, and requested workspace.
4. **Browser Launch**: Core returns an opaque `linkRequestId`, `pollSecret`, and browser `authorizationUrl`. The agent opens the default system browser via Java Desktop API (`Desktop.getDesktop().browse(...)`).
5. **Human Approval**: The user logs in (if needed) and views the device connection card on TRON Web. Clicking **[ Authorize Computer ]** triggers `POST /api/v1/desktop-agents/link-requests/{id}/authorize`.
6. **Credential Delivery**: The Desktop Agent polls `POST /api/v1/desktop-agents/link-requests/{id}/poll` using its private `pollSecret`. Once authorized, Spring returns the device credentials and marks the request `CONSUMED`.
7. **Connection**: The Desktop Agent establishes a persistent WebSocket connection, performs `DEVICE_HELLO` handshake, receives `DEVICE_WELCOME`, and enters the `ONLINE` state.

### 3.2 Offline / Recovery Fallback
- For restricted headless servers, firewalled environments, or troubleshooting, the legacy **6-digit pairing code** protocol is preserved intact.
- Accessible via **[ Pair using a code ]** in the Desktop Agent UI and **Pair Device** modal in TRON Web.

---

## 4. Multi-Tenant Device Ownership & Security Policy

### 4.1 Multiple Computers per User
A single TRON account may own multiple computers simultaneously. The TRON Web interface provides real-time status tracking and device selection:
- `● H25304028` (Windows 11) — ONLINE
- `● RTX4060-Laptop` (Windows 11) — ONLINE
- `○ Ubuntu-Server` (Linux x86_64) — OFFLINE

Tasks targeting computer execution are routed strictly to the designated target device.

### 4.2 Cross-Account Anti-Hijacking
- Each device is permanently bound to its owner's TRON account.
- If User B attempts to link a computer already registered to User A, Spring rejects the request with a sanitized conflict error: `"This computer is connected to another TRON account."`
- Non-owners are never granted access, and device lookup endpoints return `404 Not Found` for unauthorized tenants.

### 4.3 Sandboxing & Safety Gates
The Desktop Agent operates under strict containment rules:
- **Workspace Sandboxing**: Execution is restricted to the explicitly permitted workspace directory.
- **Approval Gates**: Sensitive actions (file deletion, Git pushes, external modifications) require explicit user confirmation.
- **Secret Redaction**: Credentials, tokens, and private keys are scrubbed before task logs are transmitted to the server.

---

## 5. Deployment & Configuration

### 5.1 Environment Variables

| Variable | Description | Default / Example |
|---|---|---|
| `GOOGLE_CLIENT_ID` | OAuth2 Client ID from Google Cloud Console | `${GOOGLE_CLIENT_ID:}` |
| `GOOGLE_CLIENT_SECRET` | OAuth2 Client Secret from Google Cloud Console | `${GOOGLE_CLIENT_SECRET:}` |
| `TRON_FRONTEND_URL` | Public frontend URL for OAuth callbacks | `http://localhost:5174` |
| `TRON_PUBLIC_API_URL` | Public backend URL for device link generation | `http://localhost:8080` |
| `TRON_DESKTOP_DOWNLOAD_WINDOWS_URL` | Optional URL for packaged desktop installer | `""` |

### 5.2 Desktop Packaging
- Built with OpenJDK 21 `jpackage`:
  - Output binary: `TRONDesktopAgent.exe` with bundled runtime.
  - Portable bundle: `TRONDesktopAgent-windows-x64.zip`.
  - Notice: Designated as an **UNSIGNED DEVELOPMENT BUILD** for local and internal testing.
