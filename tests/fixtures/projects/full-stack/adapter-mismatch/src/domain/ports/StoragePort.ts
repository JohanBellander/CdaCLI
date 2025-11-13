export interface StoragePort {
  save(payload: Record<string, unknown>): Promise<void>;
}
