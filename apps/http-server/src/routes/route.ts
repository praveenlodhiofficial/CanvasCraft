import express, {Router} from "express";
import { authMiddleware } from "../middlewares/authMiddleware";

const appRouter: Router = express.Router();

// -------------------------------------------------> ROUTES

appRouter.post("/signup", async(req, res) => {

});

appRouter.post("/signin", async(req, res) => {

});

appRouter.post("/room", authMiddleware , async(req, res) => {

});

// -------------------------------------------------> EXPORT

export { appRouter };
