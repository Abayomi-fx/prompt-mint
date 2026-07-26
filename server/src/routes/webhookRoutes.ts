import express from "express";
import {
  DeleteWebhook,
  GetWebhook,
  GetWebhookDeliveries,
  RegisterWebhook,
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
