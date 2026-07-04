import { randomUUID } from 'node:crypto';

import type { DeviceRepository } from '../../device-management/domain/repositories/device-repository.js';
import type { EdgeDeviceGateway } from '../domain/ports/edge-device-gateway.js';
import type { IrrigationEvent } from '../domain/irrigation-event.js';
import type { IrrigationEventRepository } from '../domain/repositories/irrigation-event-repository.js';

type ScheduleSlot = {
  timeText: string;
  enabled: boolean;
};

/**
 * Ejecuta los horarios de riego automatico que el usuario configura en la
 * pantalla de ajustes de la app (guardados en device_settings.schedules).
 *
 * En cada tick (cada ~20 s desde main.ts):
 *  1. Si el minuto actual (HH:MM en SCHEDULE_TIMEZONE) coincide con un
 *     horario habilitado de un dispositivo online sin riego en curso,
 *     encola `open-valve` y crea un evento 'scheduled'.
 *  2. Cierra los riegos 'scheduled' que superen la duracion maxima
 *     (SCHEDULED_RUN_MINUTES); el dispositivo tambien corta solo si el
 *     suelo se satura, en cuyo caso el evento lo completa la telemetria.
 */
export class ScheduledIrrigationService {
  private lastProcessedMinute = '';

  constructor(
    private readonly devices: DeviceRepository,
    private readonly events: IrrigationEventRepository,
    private readonly edgeGateway: EdgeDeviceGateway,
    private readonly timezone: string,
    private readonly runMinutes: number,
  ) {}

  async tick(now: Date = new Date()): Promise<void> {
    const minute = this.currentMinute(now);
    if (minute !== this.lastProcessedMinute) {
      this.lastProcessedMinute = minute;
      await this.startDueSchedules(minute);
    }
    await this.stopExpiredScheduledRuns(now);
  }

  private async startDueSchedules(minute: string): Promise<void> {
    const allSettings = await this.devices.getAllSettings();

    for (const { deviceId, settings } of allSettings) {
      const schedules = this.parseSchedules(settings['schedules']);
      const due = schedules.some(
        (slot) => slot.enabled && slot.timeText === minute,
      );
      if (!due) continue;

      try {
        const device = await this.devices.findById(deviceId);
        if (!device || device.status !== 'online') continue;

        const running = await this.events.findRunningByDeviceId(deviceId);
        if (running) continue;

        const command = await this.edgeGateway.queueOpenValve(deviceId);
        await this.devices.updateValveState(deviceId, 'open');

        const event: IrrigationEvent = {
          id: randomUUID(),
          deviceId,
          startedAt: new Date().toISOString(),
          litersConsumed: 0,
          triggerType: 'scheduled',
          status: 'running',
          wasSkipped: false,
          commandId: command.id,
        };
        await this.events.save(event);
        console.log(
          `[Scheduler] Riego programado iniciado (${deviceId}, ${minute})`,
        );
      } catch (err) {
        console.error(
          `[Scheduler] Error iniciando riego programado (${deviceId}):`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  private async stopExpiredScheduledRuns(now: Date): Promise<void> {
    const running = await this.events.findAllRunning();
    const maxAgeMs = this.runMinutes * 60_000;

    for (const event of running) {
      if (event.triggerType !== 'scheduled') continue;
      if (now.getTime() - Date.parse(event.startedAt) < maxAgeMs) continue;

      try {
        await this.edgeGateway.queueCloseValve(event.deviceId);
        await this.devices.updateValveState(event.deviceId, 'closed');

        const device = await this.devices.findById(event.deviceId);
        const flowRate = device?.lastTelemetry?.flowRateLMin ?? 0;
        const endedAt = now.toISOString();
        const durationMin =
          Math.max(now.getTime() - Date.parse(event.startedAt), 0) / 1000 / 60;
        const liters = Number((durationMin * flowRate).toFixed(2));

        await this.events.completeRunningEvent(
          event.deviceId,
          endedAt,
          liters,
        );
        console.log(
          `[Scheduler] Riego programado completado (${event.deviceId}, ${liters} L)`,
        );
      } catch (err) {
        console.error(
          `[Scheduler] Error cerrando riego programado (${event.deviceId}):`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  /** HH:MM actual en la zona horaria configurada. */
  private currentMinute(now: Date): string {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: this.timezone,
      }).format(now);
    } catch {
      // Zona horaria invalida: usar la hora local del servidor.
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  }

  private parseSchedules(value: unknown): ScheduleSlot[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (slot): slot is Record<string, unknown> =>
          typeof slot === 'object' && slot !== null,
      )
      .map((slot) => ({
        timeText: typeof slot['timeText'] === 'string' ? slot['timeText'] : '',
        enabled: slot['enabled'] === true,
      }))
      .filter((slot) => /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.timeText));
  }
}
