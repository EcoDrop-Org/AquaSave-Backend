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
};
