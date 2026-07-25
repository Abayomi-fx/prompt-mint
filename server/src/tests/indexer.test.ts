import { Server } from "@stellar/stellar-sdk/rpc";
import { IndexerState } from "../models/IndexerState";
import { startIndexer } from "../services/indexer";

jest.mock("../models/IndexerState");
jest.mock("@stellar/stellar-sdk/rpc");

const mockFindOneAndUpdate = IndexerState.findOneAndUpdate as jest.Mock;
const mockSave = jest.fn();
const mockGetLatestLedger = jest.fn();
const mockGetEvents = jest.fn();

(Server as jest.Mock).mockImplementation(() => ({
  getLatestLedger: mockGetLatestLedger,
  getEvents: mockGetEvents,
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockFindOneAndUpdate.mockResolvedValue({
    lastIndexedLedger: 0,
    save: mockSave,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("indexer backfill", () => {
  it("uses INDEXER_START_LEDGER when lastIndexedLedger is 0", async () => {
    process.env.INDEXER_START_LEDGER = "1000";
    mockGetLatestLedger.mockResolvedValue({ sequence: 1005 });
    mockGetEvents.mockResolvedValue({ events: [] });

    startIndexer();
    await jest.advanceTimersByTimeAsync(5000);

    expect(mockGetEvents).toHaveBeenCalledWith(
      expect.objectContaining({ startLedger: 1000 }),
      expect.anything(),
    );
  });

  it("batches large gaps into 2000-ledger chunks", async () => {
    mockFindOneAndUpdate.mockResolvedValue({
      lastIndexedLedger: 0,
      save: mockSave,
    });
    mockGetLatestLedger.mockResolvedValue({ sequence: 5000 });
    mockGetEvents.mockResolvedValue({ events: [] });

    startIndexer();
    await jest.advanceTimersByTimeAsync(5000);

    expect(mockGetEvents).toHaveBeenCalledTimes(3);
    expect(mockGetEvents).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ startLedger: 1 }),
      expect.anything(),
    );
    expect(mockGetEvents).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ startLedger: 2001 }),
      expect.anything(),
    );
    expect(mockGetEvents).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ startLedger: 4001 }),
      expect.anything(),
    );
  });

  it("updates cursor to chain tip after processing", async () => {
    mockFindOneAndUpdate.mockResolvedValue({
      lastIndexedLedger: 0,
      save: mockSave,
    });
    mockGetLatestLedger.mockResolvedValue({ sequence: 5000 });
    mockGetEvents.mockResolvedValue({ events: [] });

    startIndexer();
    await jest.advanceTimersByTimeAsync(5000);

    expect(mockSave).toHaveBeenCalled();
  });
});
