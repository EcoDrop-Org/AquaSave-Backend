export type EdgeCommandType =
  | 'open-valve'
  | 'close-valve'
  | 'pause-device'
  | 'resume-device';
export type EdgeCommandStatus = 'pending' | 'acknowledged' | 'failed';

export type EdgeCommand = {
  id: string;
  deviceId: string;
  type: EdgeCommandType;
  status: EdgeCommandStatus;
  issuedAt: string;
  acknowledgedAt?: string;
};

export interface EdgeDeviceGateway {
  queueOpenValve(deviceId: string): Promise<EdgeCommand>;
  queueCloseValve(deviceId: string): Promise<EdgeCommand>;
  queuePauseDevice(deviceId: string): Promise<EdgeCommand>;
  queueResumeDevice(deviceId: string): Promise<EdgeCommand>;
  getPendingCommands(deviceId: string): Promise<EdgeCommand[]>;
  acknowledgeCommand(deviceId: string, commandId: string): Promise<EdgeCommand>;
}
