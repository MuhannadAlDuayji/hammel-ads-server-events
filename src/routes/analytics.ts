import express from "express";
import { body } from "express-validator";
import EventController from "../controllers/eventController";
import { EventType } from "../types/event/EventType";

const router = express.Router();

router.get(
    "/UserEvents",
    body("type").isIn(Object.values(EventType)),
    body("campaignId").notEmpty(),
    body("userId").notEmpty(),
    body("deviceId").notEmpty(),
    body("placementId").notEmpty(),
    EventController.save
);
router.get(
    "/CampaignEvents",
    body("type").isIn(Object.values(EventType)),
    body("campaignId").notEmpty(),
    body("userId").notEmpty(),
    body("deviceId").notEmpty(),
    body("placementId").notEmpty(),
    EventController.save
);

export default router;
