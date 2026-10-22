import { describe, expect, it, vi } from 'vitest';
import { createSyncTriggerCoordinator } from '../sync-trigger-coordinator';

describe('sync trigger coordinator', () => {
  it('runs launch and foreground triggers', async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const coordinator = createSyncTriggerCoordinator(run);

    await coordinator.trigger('launch');
    coordinator.onAppStateChange('background');
    coordinator.onAppStateChange('active');
    await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(2));
    expect(run.mock.calls.map(([reason]) => reason)).toEqual(['launch', 'foreground']);
  });

  it('runs reconnect only after a disconnected to connected transition', async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const coordinator = createSyncTriggerCoordinator(run);

    coordinator.onConnectivityChange(true);
    coordinator.onConnectivityChange(false);
    coordinator.onConnectivityChange(true);
    await vi.waitFor(() => expect(run).toHaveBeenCalledWith('reconnect'));
  });

  it('coalesces overlapping triggers into one sync', async () => {
    let resolveRun!: () => void;
    const run = vi.fn(() => new Promise<void>((resolve) => { resolveRun = resolve; }));
    const coordinator = createSyncTriggerCoordinator(run);

    const first = coordinator.trigger('launch');
    const second = coordinator.trigger('foreground');
    expect(run).toHaveBeenCalledTimes(1);
    resolveRun();
    await Promise.all([first, second]);
  });

  it('reports failures without leaving the coordinator locked', async () => {
    const onError = vi.fn();
    const run = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    const coordinator = createSyncTriggerCoordinator(run, onError);

    await coordinator.trigger('launch');
    await coordinator.trigger('reconnect');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(2);
  });
});
