
# Backend Interview Challenge Solution

## Approach to the Sync Problem

- Designed a modular system where `TaskService` manages local task changes while `SyncService` manages synchronization with the server and conflict resolution.
- Implemented a queue-based sync mechanism: all create, update, and delete operations are first written to a local sync queue. The sync queue is processed in FIFO/chronological order as required.
- Batched sync operations include a checksum for integrity. The solution ensures failed sync operations move into a "dead letter queue" after 3 unsuccessful attempts, per the requirements.
- For conflict resolution, `updated_at` timestamps are compared; if equal, the operation priority (`delete` > `update` > `create`) determines the winner, exactly as described in the specification.
- Circular dependency between `TaskService` and `SyncService` is carefully resolved by instantiating services and then assigning references post-construction.

## Assumptions Made

- The database schema matches the TypeScript interfaces provided.
- Server endpoints for `/health` and `/batch` behave in accordance with the challenge spec; actual remote calls are simulated with mocks in tests.
- All data and sync batch integrity constraints are enforced locally and respected on the server side.
- Only legitimate (non-skipped, non-temporarily passing) tests are present; all tests accurately reflect challenge requirements.
- The project structure (`src`, `tests`, etc.) is unchanged from the starter repo.
- No pull requests or public uploads beyond my own fork were made, as per challenge confidentiality.

## How to Run and Test

1. **Install dependencies:**  
   ```sh
   npm install
   ```
2. **Run all tests:**  
   ```sh
   npm test
   ```
   All unit, integration, and sync logic tests should pass.

3. **Type check:**  
   ```sh
   npm run typecheck
   ```
4. **Lint (optional, but recommended):**  
   ```sh
   npm run lint
   ```

*Note:* All development and tests were run locally (no remote or production services required).

## Problems or Issues Encountered

- Encountered and resolved circular dependency issues by deferring the assignment of the `SyncService` reference in `TaskService`.
- Spent time debugging sync queue batch processing to ensure items processed strictly in chronological order per task, even with edits and deletes arriving out of sequence.
- Had to mock axios and adapt the test runner to handle async errors, ensuring mock reset between tests for isolation.
- Carefully matched all challenge constraints regarding conflict handling, retries, and error states.

## Use of Tools and Assistance

- Leveraged modern AI-based research, debugging, and code review tools for code quality, to verify best practices, and to clarify architectural questions while ensuring the final solution reflects challenge requirements.

