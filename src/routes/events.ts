import express from "express";
import { body } from "express-validator";
import EventController from "../controllers/eventController";
import { EventTypeName } from "../types/event/EventType";

const router = express.Router();

router.post(
    "/",
    body("loadId").notEmpty(),
    body("type").isIn(Object.values(EventTypeName)),
    body("deviceId").notEmpty(),
    body("placementId").notEmpty(),
    EventController.save
);

export default router;
