# TRON Auth and Device API Contract

Base URL for local TRON Core: `http://127.0.0.1:8080`

Web session and desktop device session are separate. Logging out of the web app revokes only the refresh cookie. It does not revoke a device credential or close a device WebSocket.

Error JSON for application failures:

```json
{ "detail": "human readable message", "code": "OPTIONAL_MACHINE_CODE" }
```

`code` is omitted when there is no machine code.

## GET /api/v1/auth/providers

Auth required: no

Request body: none

Response 200:

```json
{
  "google": { "enabled": true },
  "password": { "enabled": true }
}
```

`google.enabled` is true only when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are present and are not the removed placeholder values. `password.enabled` is always true.

## GET /oauth2/authorization/google

Auth required: no

Request body: none

Response when Google is configured: `302` to `https://accounts.google.com/o/oauth2/v2/auth` with Google's normal query parameters. The browser then returns to:

`{backendOrigin}/login/oauth2/code/google`

For the local web app the registered callback is exactly:

`http://localhost:8080/login/oauth2/code/google`

A request to `http://127.0.0.1:8080/oauth2/authorization/google` is redirected to `http://localhost:8080/oauth2/authorization/google` before the Google request is created, so the refresh cookie and the callback use the same host.

On success Spring sets the HttpOnly cookie `tron_refresh_token` and redirects to:

`http://localhost:5174/auth/callback?provider=google&status=success`

The access token and the Google token are not placed in the URL.

On failure the redirect is:

`http://localhost:5174/auth/callback?provider=google&status=error&message={encoded detail}`

Response when Google is not configured: `404`.

## POST /api/v1/auth/register

Auth required: no

Request:

```json
{ "email": "user@example.com", "password": "at least 8 characters", "displayName": "optional" }
```

Response 200: `Set-Cookie: tron_refresh_token=...; HttpOnly; Path=/api/v1/auth; SameSite=Lax` and:

```json
{
  "accessToken": "jwt",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": { "id": 1, "email": "user@example.com", "displayName": "user", "role": "USER", "authProviders": ["PASSWORD"] }
}
```

Errors: `409` email already registered. `400` password shorter than 8 characters.

## POST /api/v1/auth/login

Auth required: no

Request:

```json
{ "email": "user@example.com", "password": "secret" }
```

Response 200: same body and refresh cookie as register.

Errors: `401` invalid credentials.

## POST /api/v1/auth/refresh

Auth required: no. The refresh token is read from the `tron_refresh_token` cookie. A JSON body `{ "refreshToken": "..." }` is accepted only when the cookie is absent.

Response 200: a new access token and a rotated refresh cookie.

Errors: `401` `{ "detail": "Refresh token is missing" }` or `{ "detail": "Refresh token is invalid or expired" }`.

## POST /api/v1/auth/logout

Auth required: no

Request body: optional. Cookie is cleared even when no token is present.

Response 200:

```json
{ "detail": "Logged out successfully" }
```

The refresh cookie is cleared. Device credentials and open device sockets stay valid.

## GET /api/v1/auth/me

Auth required: yes. `Authorization: Bearer {accessToken}`

Response 200: the `user` object shown above.

Error 401:

```json
{ "detail": "Authentication required" }
```

## POST /api/v1/desktop-agents/link-requests

Auth required: no. This is the normal first-time desktop connection.

Request:

```json
{
  "deviceUuid": "uuid",
  "publicKey": "required public key pem",
  "os": "Windows 11",
  "hostname": "DESKTOP",
  "agentVersion": "0.1.0",
  "displayName": "My PC",
  "requestedWorkspace": "C:\\Dev"
}
```

Response 200:

```json
{
  "linkRequestId": "uuid used for polling",
  "publicRequestId": "different opaque uuid",
  "authorizationUrl": "http://localhost:5174/connect-device?request={publicRequestId}",
  "pollSecret": "returned only to the desktop agent",
  "expiresAt": "2026-10-17T00:00:00Z",
  "expiresInSeconds": 600,
  "fallbackPairingCode": "123-456"
}
```

`authorizationUrl` contains only the opaque `publicRequestId`. It does not contain `pollSecret`, the device credential, the approval key, a JWT, or a Google token.

Errors: `400` when `deviceUuid` is not a UUID or `publicKey` is missing.

## GET /api/v1/desktop-agents/link-requests/{publicRequestId}

Auth required: no. The web page calls this with the id from the browser URL.

Response 200:

```json
{
  "id": "publicRequestId",
  "publicRequestId": "publicRequestId",
  "linkRequestId": "publicRequestId",
  "deviceUuid": "uuid",
  "displayName": "My PC",
  "hostname": "DESKTOP",
  "os": "Windows 11",
  "osName": "Windows 11",
  "agentVersion": "0.1.0",
  "requestedWorkspace": "C:\\Dev",
  "status": "PENDING",
  "expiresAt": "2026-10-17T00:00:00Z",
  "expiresInSeconds": 600,
  "expired": false
}
```

The value named `linkRequestId` in this public response is the browser id, not the desktop poll id. The poll secret is not included. The owner is not included.

`status` is `PENDING`, `AUTHORIZED`, `CONSUMED`, `DENIED`, or `EXPIRED`.

Error 404: `{ "detail": "Device link request not found" }`

## POST /api/v1/desktop-agents/link-requests/{publicRequestId}/authorize

Auth required: yes. Spring uses the authenticated TRON user.

Request:

```json
{ "allowedWorkspace": "C:\\Dev", "displayName": "optional" }
```

Both fields are optional. The requested workspace is used when `allowedWorkspace` is omitted.

Response 200 for a new device or a same-owner repair:

```json
{
  "id": 10,
  "deviceUuid": "same uuid",
  "displayName": "My PC",
  "status": "OFFLINE",
  "allowedWorkspace": "C:\\Dev",
  "fingerprint": "sha256",
  "pairedAt": "2026-10-17T00:00:00Z",
  "repaired": false
}
```

Same-owner repair keeps the same device database id and the same `deviceUuid`, rotates the device credential, and sets `repaired` to true.

A fresh link request whose `publicKey` matches the key already registered for that computer moves the same device row to the signed-in user. The response sets `transferred` to true and `repaired` to true. The previous credential stops working, the previous socket is closed, and the previous account no longer sees the device. No second device row is created. The previous account does not have to sign in or revoke the computer.

Response 409 when the request only repeats a known device UUID and does not carry that computer's registered public key:

```json
{
  "detail": "This connection request was not started by this computer.",
  "code": "DEVICE_LINK_NOT_PROVEN"
}
```

The owner is not identified. The device row is not changed.

Other errors: `401` when the caller is not signed in. `404` unknown request. `409` request already used. `410` request expired.

## POST /api/v1/desktop-agents/link-requests/{linkRequestId}/poll

Auth required: no. The secret is the credential.

Request:

```json
{ "pollSecret": "secret from create" }
```

The same call is available as `GET` with header `X-Tron-Poll-Secret`. The desktop agent currently uses that GET. POST is the documented form.

Response while waiting:

```json
{ "pairingRequestId": "linkRequestId", "status": "PENDING", "expiresAt": "2026-10-17T00:00:00Z" }
```

Response exactly once after authorization:

```json
{
  "pairingRequestId": "linkRequestId",
  "status": "PAIRED",
  "deviceId": 10,
  "deviceUuid": "uuid",
  "deviceCredential": "store this",
  "credential": "same value as deviceCredential",
  "approvalKey": "store this",
  "allowedWorkspace": "C:\\Dev",
  "displayName": "My PC"
}
```

`credential` is the same single-use value as `deviceCredential`, kept so the current desktop agent can read it. A later poll with the same secret returns `PAIRED` and omits `deviceCredential`, `credential`, and `approvalKey`.

Response when the request was not proven to come from this computer:

```json
{
  "status": "CONFLICT",
  "code": "DEVICE_LINK_NOT_PROVEN",
  "detail": "This connection request was not started by this computer."
}
```

Errors: `401` missing poll secret. `404` wrong id or wrong secret.

## GET /api/v1/desktop-agents/devices

Auth required: yes

Response 200: an array of every device owned by that user. Another user's devices are absent.

```json
[
  {
    "id": 10,
    "deviceUuid": "uuid",
    "displayName": "My PC",
    "os": "Windows 11",
    "hostname": "DESKTOP",
    "agentVersion": "0.1.0",
    "fingerprint": "sha256",
    "status": "ONLINE",
    "lastSeen": "2026-10-17T00:00:00Z",
    "pairedAt": "2026-10-17T00:00:00Z",
    "revokedAt": null,
    "allowedWorkspace": "C:\\Dev",
    "createdAt": "2026-10-17T00:00:00Z"
  }
]
```

`status` is `ONLINE`, `OFFLINE`, `BUSY`, `PENDING`, or `REVOKED`.

## GET /api/v1/desktop-agents/devices/{id}

Auth required: yes

Response 200: one device object, only for the owner.

Error 404 for an unknown id or a device owned by someone else:

```json
{ "detail": "Device not found" }
```

## DELETE /api/v1/desktop-agents/devices/{id}

Auth required: yes. Revokes that owned device, invalidates its credential, and closes its socket.

Response 200: the device object with `status` `REVOKED`.

Error 404 for another account's device.

## WebSocket /api/v1/desktop-agent/ws

Auth required: device credential, not a user JWT.

Header: `Authorization: Device {deviceCredential}`

After the socket opens, the agent sends:

```json
{
  "protocolVersion": "1.0",
  "type": "DEVICE_HELLO",
  "deviceId": "device uuid",
  "hello": {
    "deviceUuid": "device uuid",
    "agentVersion": "0.1.0",
    "os": "Windows 11",
    "hostname": "DESKTOP",
    "allowedWorkspace": "C:\\Dev"
  }
}
```

Core replies:

```json
{
  "protocolVersion": "1.0",
  "type": "DEVICE_WELCOME",
  "deviceId": "device uuid",
  "summary": "Connected securely",
  "hello": { "deviceUuid": "device uuid" }
}
```

The device is then `ONLINE`. While that socket stays open, the device remains `ONLINE` after web logout and past the 45 second heartbeat window. A credential that was rotated or revoked is rejected and the socket is not accepted. A task created for one device id is delivered only to that device's socket.

## Pair-code fallback

These endpoints issue the same `deviceCredential`, `approvalKey`, and device row as browser authorization. Use them for recovery and development. Normal onboarding uses the link-request flow.

### POST /api/v1/desktop-agents/pairing-requests

Auth required: no

Request:

```json
{
  "deviceUuid": "uuid",
  "publicKey": "required",
  "os": "Windows 11",
  "hostname": "DESKTOP",
  "agentVersion": "0.1.0",
  "displayName": "My PC"
}
```

Response 200:

```json
{
  "pairingRequestId": "uuid",
  "pairingCode": "123-456",
  "pollSecret": "desktop only",
  "expiresAt": "2026-10-17T00:00:00Z"
}
```

### POST /api/v1/desktop-agents/pair

Auth required: yes

Request:

```json
{ "code": "123-456", "allowedWorkspace": "C:\\Dev", "displayName": "optional" }
```

Response 200: the same device object as authorize, including `repaired` and `transferred`.

A pair code created by the desktop agent with that computer's registered public key moves the same device row to the signed-in user. A code created with a different public key returns `409` `DEVICE_LINK_NOT_PROVEN`.

### GET /api/v1/desktop-agents/pairing-requests/{pairingRequestId}

Auth required: no. Header `X-Tron-Poll-Secret` is required.

Response: the same poll payload as the link poll, including the one-time `deviceCredential`.

## POST /api/v1/agent-tasks

Auth required: yes

Request:

```json
{ "deviceId": 10, "goal": "what to do", "workspace": "C:\\Dev" }
```

The device must belong to the caller. A device id owned by someone else returns `404` `{ "detail": "Device not found" }`. Approving, reading, or stopping that task as another user also returns `404`.
