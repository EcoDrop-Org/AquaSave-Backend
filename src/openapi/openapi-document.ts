export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'AquaSave API',
    version: '0.1.0',
    description:
      'REST API for AquaSave IAM, Device Management, Irrigation Intelligence and Edge-ready device communication.',
  },
  servers: [
    {
      url: '',
      description: 'Current server (local or production)',
    },
  ],
  tags: [
    { name: 'Health' },
    { name: 'Identity Access Management' },
    { name: 'Device Management' },
    { name: 'Irrigation Intelligence' },
    { name: 'Weather' },
    { name: 'Edge API' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'opaque-session-token',
      },
      edgeApiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'x-edge-api-key',
      },
    },
    schemas: {
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'fullName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          fullName: { type: 'string' },
          profileType: {
            type: 'string',
            enum: ['horticultor-urbano', 'micro-agricultor-periurbano'],
          },
          spaceType: { type: 'string', example: 'Terraza' },
          cropTypes: {
            type: 'array',
            items: { type: 'string' },
            example: ['Hortalizas'],
          },
          locationCity: { type: 'string', example: 'Lima' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/PublicUser' },
          token: { type: 'string' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
      PublicUser: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          profile: {
            type: 'object',
            properties: {
              fullName: { type: 'string' },
              profileType: { type: 'string' },
              spaceType: { type: 'string' },
              cropTypes: { type: 'array', items: { type: 'string' } },
              locationCity: { type: 'string' },
            },
          },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          lastLoginAt: { type: 'string', format: 'date-time' },
        },
      },
      GeoLocation: {
        type: 'object',
        required: ['label'],
        properties: {
          label: { type: 'string', example: 'Miraflores, Lima' },
          latitude: { type: 'number', example: -12.1211 },
          longitude: { type: 'number', example: -77.0297 },
        },
      },
      PairDeviceRequest: {
        type: 'object',
        required: ['name', 'location'],
        properties: {
          name: { type: 'string', example: 'Huerto terraza' },
          location: { $ref: '#/components/schemas/GeoLocation' },
          plantCount: { type: 'integer', minimum: 1, example: 8 },
          cropType: { type: 'string', example: 'Hortalizas' },
          firmwareVersion: { type: 'string', example: '1.0.0' },
        },
      },
      Device: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          accountId: { type: 'string' },
          name: { type: 'string' },
          location: { $ref: '#/components/schemas/GeoLocation' },
          status: {
            type: 'string',
            enum: ['online', 'offline', 'connecting', 'error'],
          },
          firmwareVersion: { type: 'string' },
          isActive: { type: 'boolean' },
          plantCount: { type: 'integer' },
          cropType: { type: 'string' },
          valveState: { type: 'string', enum: ['open', 'closed'] },
          lastTelemetry: { $ref: '#/components/schemas/SensorReading' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      SensorReading: {
        type: 'object',
        required: ['soilMoisturePct', 'temperatureC'],
        properties: {
          soilMoisturePct: { type: 'number', minimum: 0, maximum: 100 },
          temperatureC: { type: 'number' },
          flowRateLMin: { type: 'number', minimum: 0 },
          batteryPct: { type: 'number', minimum: 0, maximum: 100 },
          recordedAt: { type: 'string', format: 'date-time' },
        },
      },
      DeviceStatusUpdate: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['online', 'offline', 'connecting', 'error'],
          },
          firmwareVersion: { type: 'string' },
        },
      },
      IrrigationEvent: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          deviceId: { type: 'string' },
          startedAt: { type: 'string', format: 'date-time' },
          endedAt: { type: 'string', format: 'date-time' },
          litersConsumed: { type: 'number' },
          triggerType: {
            type: 'string',
            enum: ['manual', 'automatic', 'scheduled'],
          },
          status: { type: 'string', enum: ['running', 'completed', 'skipped'] },
          wasSkipped: { type: 'boolean' },
          skipReason: { type: 'string' },
          commandId: { type: 'string' },
        },
      },
      IrrigationState: {
        type: 'object',
        properties: {
          deviceId: { type: 'string' },
          valveState: { type: 'string', enum: ['open', 'closed'] },
          isRunning: { type: 'boolean' },
          elapsedSeconds: { type: 'integer' },
          runningEvent: { $ref: '#/components/schemas/IrrigationEvent' },
        },
      },
      WeatherForecast: {
        type: 'object',
        properties: {
          deviceId: { type: 'string' },
          locationName: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          temperatureC: { type: 'number' },
          apparentTemperatureC: { type: 'number' },
          humidityPct: { type: 'number' },
          rainProbabilityPct: { type: 'number' },
          precipitationMm: { type: 'number' },
          windSpeedKmh: { type: 'number' },
          conditionLabel: { type: 'string' },
          retrievedAt: { type: 'string', format: 'date-time' },
          validUntil: { type: 'string', format: 'date-time' },
        },
      },
      EdgeCommand: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          deviceId: { type: 'string' },
          type: { type: 'string', enum: ['open-valve', 'close-valve'] },
          status: {
            type: 'string',
            enum: ['pending', 'acknowledged', 'failed'],
          },
          issuedAt: { type: 'string', format: 'date-time' },
          acknowledgedAt: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          details: {},
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API health',
        responses: {
          '200': { description: 'API is healthy' },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Identity Access Management'],
        summary: 'Register a new user account',
        requestBody: jsonBody('RegisterRequest'),
        responses: {
          '201': jsonResponse('AuthResponse', 'User registered'),
          '409': errorResponse('Email already registered'),
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Identity Access Management'],
        summary: 'Authenticate a user and start a session',
        requestBody: jsonBody('LoginRequest'),
        responses: {
          '200': jsonResponse('AuthResponse', 'Authenticated'),
          '401': errorResponse('Invalid credentials'),
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Identity Access Management'],
        summary: 'Get current authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': jsonResponse('PublicUser', 'Current user'),
          '401': errorResponse('Invalid or expired session'),
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Identity Access Management'],
        summary: 'Revoke current session',
        security: [{ bearerAuth: [] }],
        responses: {
          '204': { description: 'Session revoked' },
          '401': errorResponse('Invalid or expired session'),
        },
      },
    },
    '/api/devices': {
      get: {
        tags: ['Device Management'],
        summary: 'List current user devices',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': arrayResponse('Device', 'User devices', 'devices'),
        },
      },
      post: {
        tags: ['Device Management'],
        summary: 'Register a device for the current user',
        security: [{ bearerAuth: [] }],
        requestBody: jsonBody('PairDeviceRequest'),
        responses: {
          '201': objectResponse('Device', 'Device registered', 'device'),
        },
      },
    },
    '/api/devices/{deviceId}': {
      get: {
        tags: ['Device Management'],
        summary: 'Get one current-user device',
        security: [{ bearerAuth: [] }],
        parameters: [deviceIdParam()],
        responses: {
          '200': objectResponse('Device', 'Device found', 'device'),
          '404': errorResponse('Device not found'),
        },
      },
    },
    '/api/weather/forecast': {
      get: {
        tags: ['Weather'],
        summary: 'Get weather forecast for one current-user device',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'deviceId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': objectResponse('WeatherForecast', 'Weather forecast', 'forecast'),
        },
      },
    },
    '/api/irrigation/devices/{deviceId}/state': {
      get: {
        tags: ['Irrigation Intelligence'],
        summary: 'Get irrigation state for a device',
        security: [{ bearerAuth: [] }],
        parameters: [deviceIdParam()],
        responses: {
          '200': objectResponse('IrrigationState', 'Irrigation state', 'state'),
        },
      },
    },
    '/api/irrigation/devices/{deviceId}/start': {
      post: {
        tags: ['Irrigation Intelligence'],
        summary: 'Start manual irrigation and queue an open-valve command',
        security: [{ bearerAuth: [] }],
        parameters: [deviceIdParam()],
        responses: {
          '202': objectResponse('IrrigationEvent', 'Irrigation started', 'event'),
        },
      },
    },
    '/api/irrigation/devices/{deviceId}/stop': {
      post: {
        tags: ['Irrigation Intelligence'],
        summary: 'Stop manual irrigation and queue a close-valve command',
        security: [{ bearerAuth: [] }],
        parameters: [deviceIdParam()],
        responses: {
          '202': objectResponse('IrrigationEvent', 'Irrigation stopped', 'event'),
        },
      },
    },
    '/api/irrigation/devices/{deviceId}/events': {
      get: {
        tags: ['Irrigation Intelligence'],
        summary: 'List irrigation events for one current-user device',
        security: [{ bearerAuth: [] }],
        parameters: [deviceIdParam()],
        responses: {
          '200': arrayResponse('IrrigationEvent', 'Irrigation events', 'events'),
        },
      },
    },
    '/api/edge/devices/{deviceId}/telemetry': {
      post: {
        tags: ['Edge API'],
        summary: 'Receive telemetry from ESP32 or Edge API',
        security: [{ edgeApiKey: [] }],
        parameters: [deviceIdParam()],
        requestBody: jsonBody('SensorReading'),
        responses: {
          '202': objectResponse('Device', 'Telemetry accepted', 'device'),
        },
      },
    },
    '/api/edge/devices/{deviceId}/status': {
      post: {
        tags: ['Edge API'],
        summary: 'Receive connection status from ESP32 or Edge API',
        security: [{ edgeApiKey: [] }],
        parameters: [deviceIdParam()],
        requestBody: jsonBody('DeviceStatusUpdate'),
        responses: {
          '202': objectResponse('Device', 'Status accepted', 'device'),
        },
      },
    },
    '/api/edge/devices/{deviceId}/commands/pending': {
      get: {
        tags: ['Edge API'],
        summary: 'Poll pending commands for a device',
        security: [{ edgeApiKey: [] }],
        parameters: [deviceIdParam()],
        responses: {
          '200': arrayResponse('EdgeCommand', 'Pending commands', 'commands'),
        },
      },
    },
    '/api/edge/devices/{deviceId}/commands/{commandId}/ack': {
      post: {
        tags: ['Edge API'],
        summary: 'Acknowledge command delivery/execution',
        security: [{ edgeApiKey: [] }],
        parameters: [
          deviceIdParam(),
          {
            name: 'commandId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '202': objectResponse('EdgeCommand', 'Command acknowledged', 'command'),
        },
      },
    },
  },
} as const;

function schemaRef(schema: string) {
  return {
  $ref: `#/components/schemas/${schema}`,
  };
}

function jsonBody(schema: string) {
  return {
  required: true,
  content: {
    'application/json': {
      schema: schemaRef(schema),
    },
  },
  };
}

function jsonResponse(schema: string, description: string) {
  return {
  description,
  content: {
    'application/json': {
      schema: schemaRef(schema),
    },
  },
  };
}

function objectResponse(
  schema: string,
  description: string,
  propertyName: string,
) {
  return {
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          [propertyName]: schemaRef(schema),
        },
      },
    },
  },
  };
}

function arrayResponse(
  schema: string,
  description: string,
  propertyName: string,
) {
  return {
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          [propertyName]: {
            type: 'array',
            items: schemaRef(schema),
          },
        },
      },
    },
  },
  };
}

function errorResponse(description: string) {
  return {
  description,
  content: {
    'application/json': {
      schema: schemaRef('Error'),
    },
  },
  };
}

function deviceIdParam() {
  return {
  name: 'deviceId',
  in: 'path',
  required: true,
  schema: { type: 'string' },
  };
}
