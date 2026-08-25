import express from "express";
import {
  DeleteWebhook,
  GetWebhook,
  GetWebhookDeadLetters,
  GetWebhookDeliveries,
  RegisterWebhook,
  ReplayWebhookDeadLetter,
  RotateWebhookSecret,
  TestWebhook,
} from "../controllers/webhookControllers";

export const webhookRouter = express.Router();

webhookRouter.post("/", RegisterWebhook);
webhookRouter.get("/", GetWebhook);
webhookRouter.delete("/", DeleteWebhook);
webhookRouter.post("/rotate-secret", RotateWebhookSecret);
webhookRouter.post("/test", TestWebhook);
webhookRouter.get("/deliveries", GetWebhookDeliveries);
webhookRouter.get("/dead-letters", GetWebhookDeadLetters);
webhookRouter.post("/dead-letters/:id/replay", ReplayWebhookDeadLetter);
