import { Request, Response } from "express";
import campaignSchema from "../models/CampaignSchema";
import eventSchema from "../models/EventSchema";
import userSchema from "../models/UserSchema";

import { ValidationError, ValidationResult } from "../types/validation";

import crypto from "crypto";
import { validationResult } from "express-validator";
import { isValidObjectId } from "mongoose";

class EventController {
    static save = async (req: Request, res: Response) => {
        try {
            const validationResults = validationResult(
                req
            ) as unknown as ValidationResult;
            const errors: ValidationError[] =
                (validationResults?.errors as ValidationError[]) || [];
            if (errors.length > 0) {
                return res.status(400).json({
                    status: "error",
                    message: `invalid ${errors[0]?.param} : ${errors[0]?.value}`,
                });
            }

            let {
                type,
                campaignId,
                userId,
                deviceId,
                placementId,
                watchTimeStart,
                watchTimeEnd,
                watchTime,
            } = req.body;

            if (!isValidObjectId(campaignId)) {
                return res.status(400).json({
                    status: "error",
                    message: "invalid campaignId",
                });
            }
            if (!isValidObjectId(userId)) {
                return res.status(400).json({
                    status: "error",
                    message: "invalid userId",
                });
            }

            const campaign = await campaignSchema.findById(campaignId);
            if (!campaign) {
                return res.status(400).json({
                    status: "error",
                    message:
                        "invalid campaignId: no such campaign with id: " +
                        campaignId,
                });
            }

            const user = await userSchema.findById(userId);
            if (!user) {
                return res.status(400).json({
                    status: "error",
                    message: "invalid userId: no such user with id: " + userId,
                });
            }

            const event = new eventSchema({
                type,
                campaignId,
                userId,
                deviceId,
                placementId,
                watchTimeStart,
                watchTimeEnd,
                watchTime,
            });

            await event.save();

            res.status(200).json({
                status: "success",
                message: "event saved",
                event,
            });
        } catch (err: any) {
            if (err?.keyValue) {
                return res.status(400).json({
                    status: "error",
                    message: `${Object.keys(err.keyValue)[0]} already in use`,
                });
            }
            console.log(err);

            res.status(500).json({
                status: "error",
                message: "internal server error",
            });
        }
    };
}

// events collection

/* 
each event will contain the following properties

- id: string
- type: "view", "click", "close"
- campaignId: string
- userId: string
- deviceId: string
- placementId: string
- watchTimeStart?: date in milliseconds
- watchTimeEnd?: date in milliseconds
- watchTime?: number

get all campaign analytics


get One campaign analytics


{
    views: number,
    clicks: number,
    clickRate: number,
    spent: number,
}


*/

export default EventController;
