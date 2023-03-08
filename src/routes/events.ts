import express from "express";
import { body } from "express-validator";
import EventController from "../controllers/eventController";
import { EventType } from "../types/event/EventType";

const router = express.Router();

router.post(
    "/",
    body("type").isIn(Object.values(EventType)),
    body("campaignId").notEmpty(),
    body("deviceId").notEmpty(),
    body("placementId").notEmpty(),
    EventController.save
);

export default router;
