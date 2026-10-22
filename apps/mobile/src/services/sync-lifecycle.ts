import { AppState, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { initializeDatabase } from '../db/migrator';
import { getAuthSession } from './auth-store';
import { syncClient } from './sync-client';
import { createSyncTriggerCoordinator, SyncTriggerReason } from './sync-trigger-coordinator';

export const BACKGROUND_SYNC_TASK = 'expenseflow-background-sync';
const BACKGROUND_SYNC_INTERVAL_MINUTES = 15;

async function runAuthenticatedSync(reason: SyncTriggerReason): Promise<void> {
  await initializeDatabase();
  const { token } = await getAuthSession();
  if (!token) return;
  const result = await syncClient.runSync();
  if (result.errors.length > 0) {
    throw new Error(result.errors.join('; '));
  }
  console.info('[SyncLifecycle] Sync completed', { reason, ...result });
}

if (!TaskManager.isTaskDefined(BACKGROUND_SYNC_TASK)) {
  TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    try {
      await runAuthenticatedSync('background');
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch (error) {
      console.error('[SyncLifecycle] Background sync failed', error);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function registerBackgroundSync(): Promise<void> {
  if (Platform.OS === 'web') return;
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
    console.warn('[SyncLifecycle] Background tasks are unavailable or restricted');
    return;
  }
  if (!(await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK))) {
    await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: BACKGROUND_SYNC_INTERVAL_MINUTES,
    });
  }
}

export async function startSyncLifecycle(): Promise<() => void> {
  const coordinator = createSyncTriggerCoordinator(
    runAuthenticatedSync,
    (reason, error) => console.warn('[SyncLifecycle] Sync trigger failed', { reason, error })
  );

  await coordinator.trigger('launch');
  await registerBackgroundSync();

  const unsubscribeNetwork = NetInfo.addEventListener((state) => {
    coordinator.onConnectivityChange(state.isConnected);
  });
  const appStateSubscription = AppState.addEventListener('change', (state) => {
    coordinator.onAppStateChange(state);
  });

  return () => {
    unsubscribeNetwork();
    appStateSubscription.remove();
  };
}
