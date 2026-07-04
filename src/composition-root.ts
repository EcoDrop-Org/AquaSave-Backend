import type { AppEnv } from './config/env.js';
import { AuthenticateSessionService } from './contexts/identity-access/application/authenticate-session.service.js';
import { GetCurrentUserQuery } from './contexts/identity-access/application/get-current-user.query.js';
import { LoginUserService } from './contexts/identity-access/application/login-user.service.js';
import { LogoutUserService } from './contexts/identity-access/application/logout-user.service.js';
import { RegisterUserService } from './contexts/identity-access/application/register-user.service.js';
import { JwtService } from './contexts/identity-access/domain/services/jwt-service.js';
import { PasswordHasher } from './contexts/identity-access/domain/services/password-hasher.js';
import { FileSessionRepository } from './contexts/identity-access/infrastructure/file-session.repository.js';
import { FileUserRepository } from './contexts/identity-access/infrastructure/file-user.repository.js';
import { PgSessionRepository } from './contexts/identity-access/infrastructure/pg-session.repository.js';
import { PgUserRepository } from './contexts/identity-access/infrastructure/pg-user.repository.js';
import { GetDeviceQuery } from './contexts/device-management/application/get-device.query.js';
import { ListDevicesQuery } from './contexts/device-management/application/list-devices.query.js';
import { PairDeviceService } from './contexts/device-management/application/pair-device.service.js';
import { RecordTelemetryService } from './contexts/device-management/application/record-telemetry.service.js';
import { UnpairDeviceService } from './contexts/device-management/application/unpair-device.service.js';
import { UpdateDeviceService } from './contexts/device-management/application/update-device.service.js';
import { UpdateDeviceStatusService } from './contexts/device-management/application/update-device-status.service.js';
import { FileDeviceRepository } from './contexts/device-management/infrastructure/file-device.repository.js';
import { PgDeviceRepository } from './contexts/device-management/infrastructure/pg-device.repository.js';
import { GetIrrigationStateQuery } from './contexts/irrigation-intelligence/application/get-irrigation-state.query.js';
import { GetWeatherForecastQuery } from './contexts/irrigation-intelligence/application/get-weather-forecast.query.js';
import { ListIrrigationEventsQuery } from './contexts/irrigation-intelligence/application/list-irrigation-events.query.js';
import { ScheduledIrrigationService } from './contexts/irrigation-intelligence/application/scheduled-irrigation.service.js';
import { StartIrrigationService } from './contexts/irrigation-intelligence/application/start-irrigation.service.js';
import { StopIrrigationService } from './contexts/irrigation-intelligence/application/stop-irrigation.service.js';
import { SyncPumpStateService } from './contexts/irrigation-intelligence/application/sync-pump-state.service.js';
import type { EdgeDeviceGateway } from './contexts/irrigation-intelligence/domain/ports/edge-device-gateway.js';
import { FileEdgeDeviceGateway } from './contexts/irrigation-intelligence/infrastructure/file-edge-device-gateway.js';
import { FileIrrigationEventRepository } from './contexts/irrigation-intelligence/infrastructure/file-irrigation-event.repository.js';
import { PgEdgeDeviceGateway } from './contexts/irrigation-intelligence/infrastructure/pg-edge-device-gateway.js';
import { PgIrrigationEventRepository } from './contexts/irrigation-intelligence/infrastructure/pg-irrigation-event.repository.js';
import { OpenMeteoWeatherService } from './contexts/irrigation-intelligence/infrastructure/open-meteo-weather.service.js';
import type { PgClient } from './shared/persistence/pg-client.js';

export type AppServices = ReturnType<typeof buildServices>;

// Con `sql` usa PostgreSQL (produccion); sin `sql` usa almacenamiento en
// archivos JSON dentro de env.dataDir (tests / desarrollo sin base de datos).
export const buildServices = (env: AppEnv, sql?: PgClient) => {
  const userRepository = sql
    ? new PgUserRepository(sql)
    : new FileUserRepository(env.dataDir);
  const sessionRepository = sql
    ? new PgSessionRepository(sql)
    : new FileSessionRepository(env.dataDir);
  const jwtService = new JwtService(env.jwtSecret);
  const passwordHasher = new PasswordHasher();
  const deviceRepository = sql
    ? new PgDeviceRepository(sql)
    : new FileDeviceRepository(env.dataDir);
  const irrigationEventRepository = sql
    ? new PgIrrigationEventRepository(sql)
    : new FileIrrigationEventRepository(env.dataDir);
  const edgeGateway: EdgeDeviceGateway = sql
    ? new PgEdgeDeviceGateway(sql)
    : new FileEdgeDeviceGateway(env.dataDir);
  const weatherService = new OpenMeteoWeatherService();

  return {
    identityAccess: {
      registerUser: new RegisterUserService(
        userRepository,
        jwtService,
        passwordHasher,
        sessionRepository,
      ),
      loginUser: new LoginUserService(
        userRepository,
        jwtService,
        passwordHasher,
        sessionRepository,
      ),
      logoutUser: new LogoutUserService(sessionRepository),
      getCurrentUser: new GetCurrentUserQuery(
        userRepository,
        jwtService,
      ),
      authenticateSession: new AuthenticateSessionService(
        userRepository,
        jwtService,
        sessionRepository,
      ),
      userRepository,
      passwordHasher,
    },
    deviceManagement: {
      pairDevice: new PairDeviceService(deviceRepository),
      listDevices: new ListDevicesQuery(deviceRepository),
      getDevice: new GetDeviceQuery(deviceRepository),
      updateDevice: new UpdateDeviceService(deviceRepository),
      unpairDevice: new UnpairDeviceService(deviceRepository),
      recordTelemetry: new RecordTelemetryService(deviceRepository),
      updateDeviceStatus: new UpdateDeviceStatusService(deviceRepository),
      repository: deviceRepository,
    },
    irrigationIntelligence: {
      startIrrigation: new StartIrrigationService(
        deviceRepository,
        irrigationEventRepository,
        edgeGateway,
      ),
      stopIrrigation: new StopIrrigationService(
        deviceRepository,
        irrigationEventRepository,
        edgeGateway,
      ),
      getIrrigationState: new GetIrrigationStateQuery(
        deviceRepository,
        irrigationEventRepository,
      ),
      listIrrigationEvents: new ListIrrigationEventsQuery(
        deviceRepository,
        irrigationEventRepository,
      ),
      getWeatherForecast: new GetWeatherForecastQuery(
        deviceRepository,
        weatherService,
      ),
      syncPumpState: new SyncPumpStateService(
        deviceRepository,
        irrigationEventRepository,
        edgeGateway,
      ),
      scheduledIrrigation: new ScheduledIrrigationService(
        deviceRepository,
        irrigationEventRepository,
        edgeGateway,
        env.scheduleTimezone,
        env.scheduledRunMinutes,
      ),
      edgeGateway,
      eventRepository: irrigationEventRepository,
      weatherService,
    },
  };
};
