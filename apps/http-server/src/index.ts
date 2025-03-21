import express from "express";
import { appRouter } from "./routes/route";
import { HTTP_SERVER_PORT } from "@repo/configuration/config";
const app = express();

// -------------------------------------------------> ROUTES

app.use("/api/v1", appRouter);

// -------------------------------------------------> EXPORT

app.listen(HTTP_SERVER_PORT, async () => {
    console.log(`HTTP Server is running on port ${HTTP_SERVER_PORT}`);
})