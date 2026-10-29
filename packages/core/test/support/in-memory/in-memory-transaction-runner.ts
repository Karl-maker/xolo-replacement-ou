import type {
  TransactionPorts,
  TransactionRunner,
} from "../../../src/index.js";

/**
 * Test transaction boundary. Production atomicity belongs to the database
 * adapter; this fake makes use cases use the same scoped-port API in unit tests.
 */
export class InMemoryTransactionRunner implements TransactionRunner {
  constructor(private readonly ports: TransactionPorts) {}

  async run<T>(work: (ports: TransactionPorts) => Promise<T>): Promise<T> {
    return work(this.ports);
  }
}
