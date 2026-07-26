import express from "express";
import { GetNotifications, MarkNotificationRead } from "../controllers/notificationControllers";

export const notificationRouter = express.Router();

notificationRouter.get("/", GetNotifications);
notificationRouter.patch("/:id/read", MarkNotificationRead);
