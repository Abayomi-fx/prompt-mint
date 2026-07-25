import "dotenv/config";
import express from "express";
import { TestPromptProxy } from "./controllers/controllers";
import { proxyrouter } from "./routes/proxyRoutes";
import { promptRouter } from "./routes/promptRoutes";
import { userRouter } from "./routes/userRoutes";
import { chatRouter } from "./routes/chatRoutes";
import { webhookRouter } from "./routes/webhookRoutes";
import { versioningRouter } from "./routes/versioningRoutes";
import { governanceRouter } from "./routes/governanceRoutes"; // Issue #113
import { appealRouter } from "./routes/appealRoutes";
import { robotsRouter } from "./routes/robotsRoutes";
import { licenseTermsRouter } from "./routes/licenseTermsRoutes";
import { runBackup, getBackupHealth } from "./services/backupService";
import { runRestoreDrill } from "./services/restoreService";
import { IndexerState } from "./models/IndexerState";
import cron from "node-cron";
import { JSON_BODY_LIMIT, jsonBodyTooLargeHandler } from "./middleware/bodySizeLimit";
 