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
  "profileType": "principiante",
  "spaceType": "Terraza",
  "cropTypes": ["Hortalizas"],
  "locationCity": "Lima"
}
```

`profileType` is one of the two target segments from the report (section 1.3):

| Value | Segment |
|---|---|
| `principiante` | Needs guidance reading the measurements |
| `experto` | Wants history, numbers and configuration |

The app changes how it presents information based on this value, and
recommendations are worded differently for each. The previous geographic
values (`horticultor-urbano`, `micro-agricultor-periurbano`) are still
accepted and mapped to `principiante` / `experto` so existing accounts keep
working.

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
  "name": "Mi albahaca",
  "location": {
    "label": "Miraflores, Lima"
  },
  "speciesId": "albahaca",
  "cropType": "La del balcon"
}
```

**One irrigation device serves exactly one plant.** `speciesId` sets the soil
moisture thresholds used to decide watering (see
`device-management/domain/plant-species.ts`), and `cropType` is just the user's
free-text note. `plantCount` is deprecated: it is always stored as 1.

A plant can exist **without** an irrigation device. The response includes
`hasIrrigationDevice: false` in that case, and the app still shows the species
care sheet — only without readings or automatic watering.

Weather:

```http
GET /api/weather/forecast?deviceId=:deviceId
```

Irrigation:

```http
GET /api/irrigation/devices/:deviceId/recommendation
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

## Plant recommendations

`GET /api/irrigation/devices/:deviceId/recommendation` returns three things:

1. `irrigation` — whether to water now, based on soil moisture, the species
   thresholds and the weather.
2. `care` — species care tips (light, watering, pests). These do **not** depend
   on the sensor, so they work for a plant with no device yet.
3. `info` — description and photo of the species (optional).

### Why rules first and the LLM second

The watering decision **always** comes from the local rules engine
(`irrigation-intelligence/domain/recommendation.ts`): no network, no quota, no
way for it to fail. Gemini only rewrites the text and expands the care tips
when there is quota; `source` says which one produced it (`rules` or `ai`).

This matters: the project already ran out of Open-Meteo's daily quota once,
which is why `fallbackForecast()` exists. The headline feature cannot depend on
an external API answering during a demo. The LLM never changes `level` or
`reason`, so an odd model response can't trigger watering that the rules did
not call for.

Both integrations are optional. With no `GEMINI_API_KEY` or `PERENUAL_API_KEY`
the endpoint still returns a complete, useful recommendation.

> Perenual's free tier returns an `upgrade_access.jpg` placeholder instead of a
> photo for part of its catalog. Those are discarded, so the app falls back to
> its own icon rather than showing a paywall image.

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
