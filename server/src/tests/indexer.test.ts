let startIndexer: any;
let mockGetLatestLedger: jest.Mock;
let mockGetEvents: jest.Mock;
let mockSave: jest.Mock;
let mockFindOneAndUpdate: jest.Mock;

beforeEach(async () => {
  process.env.PUBLIC_PROMPT_HASH_CONTRACT_ID = "CCONTRACT";
  delete process.env.INDEXER_START_LEDGER;

  jest.resetModules();
  jest.useFakeTimers();

  mockGetLatestLedger = jest.fn();
  mockGetEvents = jest.fn();
  mockSave = jest.fn();
  mockFindOneAndUpdate = jest.fn().mockResolvedValue({
    lastIndexedLedger: 0,
    save: mockSave,
  });

  jest.doMock("../models/IndexerState", () => ({
    IndexerState: {
      findOneAndUpdate: mockFindOneAndUpdate,
    },
  }));

  jest.doMock("@stellar/stellar-sdk/rpc", () => ({
    Server: jest.fn(() => ({
      getLatestLedger: mockGetLatestLedger,
      getEvents: mockGetEvents,
    })),
  }));

  startIndexer = require("../services/indexer").startIndexer;
});

afterEach(() => {
  jest.useRealTimers();
});

describe("indexer backfill", () => {
  it("uses INDEXER_START_LEDGER when lastIndexedLedger is 0", async () => {
    process.env.INDEXER_START_LEDGER = "1000";
    mockGetLatestLedger.mockResolvedValue({ sequence: 1005 });
    mockGetEvents.mockResolvedValue({ events: [] });

    await startIndexer();
    await jest.advanceTimersByTimeAsync(5000);

    expect(mockGetEvents).toHaveBeenCalledWith(
      expect.objectContaining({ startLedger: 1000 }),
    );
  });

  it("batches large gaps into 2000-ledger chunks", async () => {
    mockFindOneAndUpdate.mockResolvedValue({
      lastIndexedLedger: 0,
      save: mockSave,
    });
    mockGetLatestLedger.mockResolvedValue({ sequence: 5000 });
    mockGetEvents.mockResolvedValue({ events: [] });

    await startIndexer();
    await jest.advanceTimersByTimeAsync(5000);

    expect(mockGetEvents).toHaveBeenCalledTimes(3);
    expect(mockGetEvents).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ startLedger: 1 }),
    );
    expect(mockGetEvents).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ startLedger: 2001 }),
    );
    expect(mockGetEvents).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ startLedger: 4001 }),
    );
  });

  it("updates cursor to chain tip after processing", async () => {
    mockFindOneAndUpdate.mockResolvedValue({
      lastIndexedLedger: 0,
      save: mockSave,
    });
    mockGetLatestLedger.mockResolvedValue({ sequence: 5000 });
    mockGetEvents.mockResolvedValue({ events: [] });

    await startIndexer();
    await jest.advanceTimersByTimeAsync(5000);

    expect(mockSave).toHaveBeenCalled();
  });
});
