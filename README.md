

## Assumptions & Key Decisions

- Sync Connectivity: All network connectivity is considered successful except when explicitly mocked as failed within the tests.
- Conflict Resolution: Conflicts are resolved by comparing `updated_at`. If timestamps are equal, operation priority follows the challenge constraints (`delete` > `update` > `create`).
- Dead Letter Queue: Sync attempts that fail more than 3 times are marked as `'failed'` and remain in the database for later inspection or manual intervention.
- Batch Integrity: Each sync batch includes a checksum header; only validated batches are processed.
- Partial Task Usage: The system uses `Partial<Task>` appropriately for updates, both when persisting and syncing.
- Circular Dependency Handling: To resolve service wiring, `TaskService` and `SyncService` are first instantiated separately and then linked after construction.
- API and Database Mocking: All tests use API and DB mocks/stubs, with no live remote calls.
- Challenge Confidentiality: No pull requests to the source repo were made; code remains in my private fork per the submission instructions.
- Assumptions on Schema: The implementation assumes that the local database schema is consistent with the provided TypeScript interfaces.
- **Efficient Use of AI Assistance:** Leveraged AI-based research and code review tools for best practices, debugging motivation, and to validate architectural approaches—ensuring solution reliability and adherence to the challenge requirements.

***

