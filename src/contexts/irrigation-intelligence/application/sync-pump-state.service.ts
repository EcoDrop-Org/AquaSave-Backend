import { randomUUID } from 'node:crypto';

import type { DeviceRepository } from '../../device-management/domain/repositories/device-repository.js';
import type { EdgeDeviceGateway } from '../domain/ports/edge-device-gateway.js';
import type { IrrigationEvent } from '../domain/irrigation-event.js';
import type { IrrigationEventRepository } from '../domain/repositories/irrigation-event-repository.js';

export type SyncPumpStateInput = {
  deviceId: string;
  /** Estado de la bomba reportado en la telemetria (undefined = no reportado). */
  pumpOn?: boolean;
  /** Caudal reportado (L/min), usado para estimar litros consumidos. */
  flowRateLMin?: number;
};

// No cerrar/abrir eventos creados hace menos de este margen: da tiempo a que
// un comando recien encolado (start/stop desde la app) llegue al dispositivo.
const COMMAND_GRACE_MS = 15_000;

/**
 * Mantiene coherentes los eventos de riego con lo que la bomba hace
 * realmente (el dispositivo tambien riega por su cuenta en modo automatico):
 *
 * - Bomba ON sin evento en curso  -> crea un evento 'automatic'.
 * - Bomba OFF con evento en curso -> completa el evento y calcula litros.
 *
 * Los comandos pendientes (open/close-valve aun no ejecutados por el ESP32)
 * se respetan para no pisar acciones manuales en transito.
 */
export class SyncPumpStateService {
  constructor(
    private readonly devices: DeviceRepository,
    private readonly events: IrrigationEventRepository,
    private readonly edgeGateway: EdgeDeviceGateway,
  ) {}

  async execute(input: SyncPumpStateInput): Promise<void> {
    if (input.pumpOn === undefined) return;

    const device = await this.devices.findById(input.deviceId);
    if (!device) return;

    const running = await this.events.findRunningByDeviceId(input.deviceId);
    const pending = await this.edgeGateway.getPendingCommands(input.deviceId);
    const pendingTypes = new Set(pending.map((command) => command.type));

    if (input.pumpOn) {
      if (device.valveState !== 'open') {
        await this.devices.updateValveState(input.deviceId, 'open');
      }

      // Si hay un close-valve en transito, la bomba esta por apagarse:
      // no crear un evento nuevo.
      if (!running && !pendingTypes.has('close-valve')) {
        const event: IrrigationEvent = {
          id: randomUUID(),
          deviceId: input.deviceId,
          startedAt: new Date().toISOString(),
          litersConsumed: 0,
          triggerType: 'automatic',
          status: 'running',
          wasSkipped: false,
          // Snapshot de las condiciones al iniciar (para el historial).
          soilMoisturePct: device.lastTelemetry?.soilMoisturePct,
          temperatureC: device.lastTelemetry?.temperatureC,
        };
        await this.events.save(event);
      }
      return;
    }

    // Bomba apagada.
    if (running) {
      // Un open-valve en transito o un evento muy reciente significa que el
      // dispositivo aun no llego a encender la bomba: esperar.
      const eventAgeMs = Date.now() - Date.parse(running.startedAt);
      if (pendingTypes.has('open-valve') || eventAgeMs < COMMAND_GRACE_MS) {
        return;
      }

      const endedAt = new Date().toISOString();
      const flowRate =
        input.flowRateLMin ?? device.lastTelemetry?.flowRateLMin ?? 0;
      const durationMin =
        Math.max(Date.parse(endedAt) - Date.parse(running.startedAt), 0) /
        1000 /
        60;
      const liters = Number((durationMin * flowRate).toFixed(2));
      await this.events.completeRunningEvent(input.deviceId, endedAt, liters);
    }

    if (device.valveState !== 'closed') {
      await this.devices.updateValveState(input.deviceId, 'closed');
    }
  }
}
