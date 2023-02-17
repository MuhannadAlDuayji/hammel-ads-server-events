import express from "express";
import { body } from "express-validator";
import EventController from "../controllers/eventController";
import { EventType } from "../types/event/EventType";

const router = express.Router();

router.post(
    "/event",
    body("type").isIn(Object.values(EventType)),
    body("campaignId").notEmpty(),
    body("userId").notEmpty(),
    body("deviceId").notEmpty(),
    body("placementId").notEmpty(),
    EventController.save
);

// router.post("/login", AuthController.login);

// router.get("/confirm/:token", AuthController.confirmEmail);

// router.post("/reset", body("email").isEmail(), AuthController.resetPassword);

// router.post(
//     "/newPassword",
//     body("resetToken").notEmpty(),
//     body("newPassword").isStrongPassword({ minLength: 8 }),
//     AuthController.newPassword
// );

// router.post(
//     "/verifyToken",
//     body("resetToken").notEmpty(),
//     AuthController.verifyToken
// );

export default router;
