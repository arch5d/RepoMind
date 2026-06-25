import express from "express";
import cors from "cors";
import { getConfig } from "@/config";
import { getDb, closeDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { router as healthRouter } from "@/routes/health";
import { router as reposRouter } from "@/routes/repos";
import { router as searchRouter } from "@/routes/search";
import { router as architectureRouter } from "@/routes/architecture";
import { router as dependenciesRouter } from "@/routes/dependencies";
import { router as docsRouter } from "@/routes/docs";
import { router as statsRouter } from "@/routes/stats";
import { router as settingsRouter } from "@/routes/settings";

const config = getConfig();
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "4mb" }));

app.use("/api/health", healthRouter);
app.use("/api/repos", reposRouter);
app.use("/api/search", searchRouter);
app.use("/api/repos/:repoId/architecture", architectureRouter);
app.use("/api/repos/:repoId/dependencies", dependenciesRouter);
app.use("/api/repos/:repoId/docs", docsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/settings", settingsRouter);

getDb();

app.listen(config.app.port, () => {
  logger.info("server", `Backend server running on port ${config.app.port}`);
  logger.info("server", `AI Provider: ${config.ai.provider}`);
});

process.on("SIGINT", () => {
  logger.info("server", "Shutting down...");
  closeDb();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("server", "Shutting down...");
  closeDb();
  process.exit(0);
});
