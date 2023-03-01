import express from "express";
import { body } from "express-validator";
import EventController from "../controllers/eventController";
import LoadController from "../controllers/loadController";
import { EventType } from "../types/event/EventType";

const router = express.Router();

router.post(
    "/",
    body("deviceID").notEmpty(),
    body("placementID").notEmpty(),
    LoadController.load
);

export default router;
