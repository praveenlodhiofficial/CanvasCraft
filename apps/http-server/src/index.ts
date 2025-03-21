import express from "express";
import { appRouter } from "./routes/route";
import config from "@repo/configuration/config";
const app = express();

// -------------------------------------------------> ROUTES

app.use("/api/v1", appRouter);

// -------------------------------------------------> EXPORT

app.listen(config.HTTP_SERVER_PORT, async () => {
    console.log(`HTTP Server is running on port ${config.HTTP_SERVER_PORT}`);
})