export type SyncTriggerReason = 'launch' | 'reconnect' | 'foreground' | 'background';

export interface SyncTriggerCoordinator {
  trigger(reason: SyncTriggerReason): Promise<void>;
  onConnectivityChange(isConnected: boolean | null): void;
  onAppStateChange(state: string): void;
}

export function createSyncTriggerCoordinator(
  run: (reason: SyncTriggerReason) => Promise<unknown>,
  onError: (reason: SyncTriggerReason, error: unknown) => void = () => {}
): SyncTriggerCoordinator {
  let inFlight: Promise<void> | null = null;
  let previousConnectivity: boolean | null = null;

  const trigger = async (reason: SyncTriggerReason): Promise<void> => {
    if (inFlight) return inFlight;
    inFlight = Promise.resolve(run(reason))
      .then(() => undefined)
      .catch((error) => onError(reason, error))
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };

  return {
    trigger,
    onConnectivityChange(isConnected) {
      if (isConnected === true && previousConnectivity === false) {
        void trigger('reconnect');
      }
      previousConnectivity = isConnected;
    },
    onAppStateChange(state) {
      if (state === 'active') void trigger('foreground');
    },
  };
}
