import type { StoragePort } from "../../domain/ports/StoragePort";

export class FileStorageAdapter {
  constructor(private readonly directory: string) {}

  save(payload: Record<string, unknown>): Promise<void> {
    void payload;
    return Promise.resolve();
  }
}
