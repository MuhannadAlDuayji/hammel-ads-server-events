import express from "express";
import { body } from "express-validator";
import LoadController from "../controllers/loadController";

const router = express.Router();

router.post(
    "/",
    body("deviceId").notEmpty(),
    body("placementId").notEmpty(),
    body("region").notEmpty(),
    LoadController.load
);

export default router;
