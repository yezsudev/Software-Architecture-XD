import { BankAccountState, Snapshot } from '../models';

/**
 * SnapshotStore — stores point-in-time state snapshots
 *
 * A snapshot is an "optimized checkpoint":
 * { version: 50, state: <current state> }
 *
 * When loading an aggregate later:
 *   - Start from snapshot state (version 50)
 *   - Only replay events 51..now  (delta)
 *   - Instead of replaying events 0..now (full)
 *
 * Without snapshot: O(N) replay every time (N = total events)
 * With snapshot:    O(K) replay          (K = events since last snapshot)
 */
export class SnapshotStore {
  // Only keep latest snapshot per aggregate (could keep multiple for versioning)
  private snapshots = new Map<string, Snapshot>();

  /**
   * Save snapshot for an aggregate at a specific version
   * @param accountId - Aggregate ID
   * @param version - Current event count (version when snapshot taken)
   * @param state - Current computed state
   */
  save(accountId: string, version: number, state: BankAccountState): void {
    const snapshot: Snapshot = {
      accountId,
      version,
      state: { ...state },     // Deep copy to avoid mutation
      createdAt: new Date()
    };
    this.snapshots.set(accountId, snapshot);
    console.log(`[SnapshotStore] Snapshot saved for ${accountId} at v${version} (balance: $${state.balance})`);
  }

  /**
   * Get latest snapshot for an aggregate
   * @returns Snapshot or null if none exists
   */
  getLatest(accountId: string): Snapshot | null {
    return this.snapshots.get(accountId) ?? null;
  }

  /**
   * Check if snapshot exists for aggregate
   */
  has(accountId: string): boolean {
    return this.snapshots.has(accountId);
  }

  /**
   * Get all snapshots (for debugging)
   */
  getAllSnapshots(): Snapshot[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * Delete snapshot (force full replay on next load)
   */
  delete(accountId: string): void {
    this.snapshots.delete(accountId);
  }
}
