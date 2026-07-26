import httpMocks from "node-mocks-http";
import connectDb from "../db/connectDb";
import Notification from "../models/Notification";
import Purchase from "../models/Purchase";
import User from "../models/User";
import { createPromptUpdateNotifications } from "../services/notificationService";
import { GetNotifications, MarkNotificationRead } from "../controllers/notificationControllers";

jest.mock("../db/connectDb");
jest.mock("../models/Notification");
jest.mock("../models/Purchase");
jest.mock("../models/User");

const mockConnectDb = connectDb as jest.Mock;
const mockNotification = Notification as jest.Mocked<any>;
const mockPurchase = Purchase as jest.Mocked<any>;
const mockUser = User as jest.Mocked<any>;

describe("Notification flow", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockConnectDb.mockResolvedValue(true);
  });

  it("creates notifications for buyers when a new version is published", async () => {
    mockPurchase.find.mockResolvedValue([
      { buyerWallet: "gbuyer1" },
      { buyerWallet: "gbuyer2" },
      { buyerWallet: "gbuyer1" },
    ]);
    mockUser.find.mockResolvedValue([
      { _id: "user1", walletAddress: "gbuyer1" },
      { _id: "user2", walletAddress: "gbuyer2" },
    ]);
    mockNotification.create.mockResolvedValue({});

    await createPromptUpdateNotifications({
      promptId: "abc123",
      promptTitle: "Launch Pack",
      versionIndex: 2,
      changelog: "This is a new update with a long explanation.",
    });

    expect(mockNotification.create).toHaveBeenCalledTimes(2);
    expect(mockNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        promptId: "abc123",
        versionIndex: 2,
        walletAddress: "gbuyer1",
        message: expect.stringContaining("New version of Launch Pack is available (v2):"),
      }),
    );
  });

  it("does not fail when notification delivery fails", async () => {
    mockPurchase.find.mockResolvedValue([{ buyerWallet: "gbuyer1" }]);
    mockUser.find.mockResolvedValue([{ _id: "user1", walletAddress: "gbuyer1" }]);
    mockNotification.create.mockRejectedValue(new Error("database failure"));

    await expect(
      createPromptUpdateNotifications({
        promptId: "abc123",
        promptTitle: "Launch Pack",
        versionIndex: 2,
        changelog: "An update",
      }),
    ).resolves.not.toThrow();
    expect(mockNotification.create).toHaveBeenCalledTimes(1);
  });

  it("returns unread notifications for an authenticated user", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      url: "/api/notifications",
      query: { walletAddress: "GBUYER" },
    });
    const res = httpMocks.createResponse();
    mockUser.findOne.mockResolvedValue({ _id: "user1", walletAddress: "gbuyer" });
    mockNotification.find.mockResolvedValue([
      { _id: "note1", promptId: "abc123", message: "Test", read: false },
    ]);

    await GetNotifications(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData().notifications).toHaveLength(1);
    expect(res._getJSONData().notifications[0].message).toBe("Test");
  });

  it("marks a notification as read", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      url: "/api/notifications/note1/read",
      params: { id: "note1" },
      body: { walletAddress: "GBUYER" },
    });
    const res = httpMocks.createResponse();
    mockUser.findOne.mockResolvedValue({ _id: "user1", walletAddress: "gbuyer" });
    mockNotification.findOneAndUpdate.mockResolvedValue({ _id: "note1", read: true });

    await MarkNotificationRead(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData().notification.read).toBe(true);
  });
});
