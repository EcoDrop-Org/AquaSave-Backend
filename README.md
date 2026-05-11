# AquaSave Backend

Backend API for AquaSave, organized around the documented bounded contexts:

- Device Management: device pairing, location, connectivity and telemetry.
- Identity Access Management: account registration, login, session tokens and logout.
- Irrigation Intelligence: manual irrigation events, valve commands and weather lookup.

The current implementation is ready for local development and stores data in JSON files under `DATA_DIR`. Repositories and gateways are defined behind interfaces so they can be replaced by PostgreSQL and MQTT/AWS IoT Core later without rewriting the domain/application layer.

## Why this stack

This backend uses Node.js, TypeScript and Express. It is small enough for the current project stage, easy to deploy as a Docker container on AWS ECS/Elastic Beanstalk, and simple to extend with an Edge API or MQTT adapter for ESP32 devices.

## Setup

```bash
npm install
copy .env.example .env
npm run dev
```

Default API URL:

```text
http://localhost:3000
```

## Main Endpoints

Swagger:

```http
GET /api/docs
GET /api/openapi.json
```

Health:

```http
GET /health
```

Authentication:

```http
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
POST /api/auth/logout
```

Register example:

```json
{
  "email": "ana@aquasave.test",
  "password": "secure-password",
  "fullName": "Ana Torres",
  "profileType": "horticultor-urbano",
  "spaceType": "Terraza",
  "cropTypes": ["Hortalizas"],
  "locationCity": "Lima"
}
```

Successful register/login returns:

```json
{
  "user": {
    "id": "generated-user-id",
    "email": "ana@aquasave.test",
    "profile": {}
  },
  "token": "session-token",
  "expiresAt": "..."
}
```

Protected endpoints require:

```http
Authorization: Bearer session-token
```

Devices:

```http
GET /api/devices
POST /api/devices
GET /api/devices/:deviceId
```

Register device example:

```json
{
  "name": "Huerto Miraflores",
  "location": {
    "label": "Miraflores, Lima"
  },
  "plantCount": 8,
  "cropType": "Hortalizas"
}
```

Weather:

```http
GET /api/weather/forecast?deviceId=:deviceId
```

Irrigation:

```http
GET /api/irrigation/devices/:deviceId/state
POST /api/irrigation/devices/:deviceId/start
POST /api/irrigation/devices/:deviceId/stop
GET /api/irrigation/devices/:deviceId/events
```

Edge-ready endpoints:

```http
POST /api/edge/devices/:deviceId/telemetry
POST /api/edge/devices/:deviceId/status
GET /api/edge/devices/:deviceId/commands/pending
POST /api/edge/devices/:deviceId/commands/:commandId/ack
```

If `EDGE_API_KEY` is configured, requests to `/api/edge/*` must include:

```http
x-edge-api-key: your-key
```

## ESP32 / Edge API integration later

The current `FileEdgeDeviceGateway` queues commands in `data/edge-commands.json`. This gives the frontend and backend a working contract now. Later it can be replaced by an adapter such as:

- `AwsIotCoreDeviceGateway`
- `MqttBrokerDeviceGateway`
- `HttpEdgeApiDeviceGateway`

The application services will stay the same because they only depend on the `EdgeDeviceGateway` port.

## IAM behavior

Each registered user becomes their own account boundary. Devices are saved with `accountId = user.id`, so:

- User A only lists and controls User A devices.
- User B cannot read User A devices by guessing a device id.
- Logout revokes the session token, and protected endpoints return `401` afterward.

This is currently implemented with opaque session tokens in `data/sessions.json`. The interface is intentionally close to JWT auth, so it can later be swapped for `JwtTokenService` from the documented IAM infrastructure layer.

## Validation

```bash
npm run typecheck
npm test
npm run build
```
