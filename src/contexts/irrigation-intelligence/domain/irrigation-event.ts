export type IrrigationTriggerType = 'manual' | 'automatic' | 'scheduled';
export type IrrigationEventStatus = 'running' | 'completed' | 'skipped';

export type IrrigationEvent = {
  id: string;
  deviceId: string;
  startedAt: string;
  endedAt?: string;
  litersConsumed: number;
  triggerType: IrrigationTriggerType;
  status: IrrigationEventStatus;
  wasSkipped: boolean;
  skipReason?: string;
  commandId?: string;
  // Snapshot de la telemetria del dispositivo al momento de iniciar el riego.
  // Ausente en eventos antiguos (anteriores a este campo).
  soilMoisturePct?: number;
  temperatureC?: number;
};
