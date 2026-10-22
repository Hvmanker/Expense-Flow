# ExpenseFlow physical-device E2E

These Maestro flows verify the native boundaries that unit tests cannot: secure
credential persistence across a process restart and deep-link capture persistence
in SQLite while offline.

Prerequisites:

1. Build and install a development client with application ID `com.expenseflow.app`.
2. Run the API in `development` or `test` mode against isolated MongoDB and Redis.
3. Request an OTP for a dedicated test email and provide the returned development
   OTP to Maestro without committing it.

Run on each connected physical device:

```sh
TEST_EMAIL=e2e@example.com OTP_CODE=123456 maestro test apps/mobile/e2e/auth-persistence.yaml
maestro test apps/mobile/e2e/deep-link-offline.yaml
```

Background execution must also be triggered from the installed development client
with Expo's `triggerTaskWorkerForTestingAsync`, then inspected using Android
`jobscheduler` or Xcode device logs. Expo Background Task does not execute on an
iOS simulator, so simulator output is not valid evidence for this release gate.
