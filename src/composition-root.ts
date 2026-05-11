import type { AppEnv } from './config/env.js';
import { AuthenticateSessionService } from './contexts/identity-access/application/authenticate-session.service.js';
import { GetCurrentUserQuery } from './contexts/identity-access/application/get-current-user.query.js';
import { LoginUserService } from './contexts/identity-access/application/login-user.service.js';
import { LogoutUserService } from './contexts/identity-access/application/logout-user.service.js';
import { RegisterUserService } from './contexts/identity-access/application/register-user.service.js';
import { PasswordHasher } from './contexts/identity-access/domain/services/password-hasher.js';
import { FileSessionRepository } from './contexts/identity-access/infrastructure/file-session.repository.js';
import { FileUserRepository } from './contexts/identity-access/infrastructure/file-user.repository.js';
import { GetDeviceQuery } from './contexts/device-management/application/get-device.query.js';
import { ListDevicesQuery } from './contexts/device-management/application/list-devices.query.js';
import { PairDeviceService } from './contexts/device-management/application/pair-device.service.js';
import { RecordTelemetryService } from './contexts/device-management/application/record-telemetry.service.js';
import { UpdateDeviceStatusService } from './contexts/device-management/application/update-device-status.service.js';
import { FileDeviceRepository } from './contexts/device-management/infrastructure/file-device.repository.js';
import { GetIrrigationStateQuery } from './contexts/irrigation-intelligence/application/get-irrigation-state.query.js';
import { GetWeatherForecastQuery } from './contexts/irrigation-intelligence/application/get-weather-forecast.query.js';
import { ListIrrigationEventsQuery } from './contexts/irrigation-intelligence/application/list-irrigation-events.query.js';
import { StartIrrigationService } from './contexts/irrigation-intelligence/application/start-irrigation.service.js';
import { StopIrrigationService } from './contexts/irrigation-intelligence/application/stop-irrigation.service.js';
import type { EdgeDeviceGateway } from './contexts/irrigation-intelligence/domain/ports/edge-device-gateway.js';
import { FileEdgeDeviceGateway } from './contexts/irrigation-intelligence/infrastructure/file-edge-device-gateway.js';
import { FileIrrigationEventRepository } from './contexts/irrigation-intelligence/infrastructure/file-irrigation-event.repository.js';
import { OpenMeteoWeatherService } from './contexts/irrigation-intelligence/infrastructure/open-meteo-weather.service.js';

export type AppServices = ReturnType<typeof buildServices>;

export const buildServices = (env: AppEnv) => {
  const userRepository = new FileUserRepository(env.dataDir);
  const sessionRepository = new FileSessionRepository(env.dataDir);
  const passwordHasher = new PasswordHasher();
  const deviceRepository = new FileDeviceRepository(env.dataDir);
  const irrigationEventRepository = new FileIrrigationEventRepository(
    env.dataDir,
  );
  const edgeGateway: EdgeDeviceGateway = new FileEdgeDeviceGateway(env.dataDir);
  const weatherService = new OpenMeteoWeatherService();

  return {
    identityAccess: {
      registerUser: new RegisterUserService(
        userRepository,
        sessionRepository,
        passwordHasher,
      ),
      loginUser: new LoginUserService(
        userRepository,
        sessionRepository,
        passwordHasher,
      ),
      logoutUser: new LogoutUserService(sessionRepository),
      getCurrentUser: new GetCurrentUserQuery(
        userRepository,
        sessionRepository,
      ),
      authenticateSession: new AuthenticateSessionService(
        userRepository,
        sessionRepository,
      ),
      userRepository,
      sessionRepository,
    },
    deviceManagement: {
      pairDevice: new PairDeviceService(deviceRepository),
      listDevices: new ListDevicesQuery(deviceRepository),
      getDevice: new GetDeviceQuery(deviceRepository),
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
      edgeGateway,
      eventRepository: irrigationEventRepository,
      weatherService,
    },
  };
};
