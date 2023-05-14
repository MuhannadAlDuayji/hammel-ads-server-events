import { Request, Response } from "express";
import campaignSchema from "../models/CampaignSchema";
import userSchema from "../models/UserSchema";

import { ValidationError, ValidationResult } from "../types/validation";

import { validationResult } from "express-validator";
import { isValidObjectId } from "mongoose";
import Event from "../types/event";
import { EventType } from "../types/event/EventType";
import { CampaignStatus } from "../types/campaign/CampaignStatus";
import { LoadStatus } from "../types/load/LoadStatus";

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

            // Extract the event data from the request body
            const {
                loadId,
                type,
                campaignId,
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

            const event: Event = {
                loadId,
                type,
                campaignId,
                deviceId,
                placementId,
                watchTimeStart,
                watchTimeEnd,
                watchTime,
                createdAt: new Date(Date.now()),
            };

            // Find the campaign by id and update it with the new event data
            const updatedCampaign = await campaignSchema.findByIdAndUpdate(
                campaignId,
                {
                    $push: { events: event },
                    $set: { status: CampaignStatus.ACTIVE },
                    $inc: {
                        clicks: event.type === EventType.CLICK ? 1 : 0,
                        views: event.type === EventType.VIEW ? 1 : 0,
                        moneySpent:
                            event.type === EventType.VIEW
                                ? (Number(process.env.THOUSAND_VIEWS_COST) ||
                                      1) / 1000
                                : 0,
                        clickRate: event.type === EventType.CLICK ? 1 : 0,
                    },
                    $setOnInsert: {
                        userId: "", // Set the userId if you want to insert it
                        budget: 0, // Set the budget if you want to insert it
                        loads: [], // Set the loads if you want to insert it
                    },
                },
                { new: true } // Return the updated document instead of the old one
            );

            if (!updatedCampaign) {
                return res.status(404).json({
                    status: "error",
                    message: "campaign not found",
                });
            }

            // Same as before
            return res.status(200).json({
                status: "success",
                message: "event saved",
                event,
            });
        } catch (err: any) {
            console.log(err);

            res.status(500).json({
                status: "error",
                message: "internal server error",
            });
        }
    };

    private static chargeUser = async (userId: string, cost: number) => {
        try {
            const user = await userSchema.findById(userId);
            if (!user) return null;

            if (user.balance - cost < 0) {
                user.balance = 0;
            } else {
                user.balance -= cost;
            }

            await user.save();
            return user.balance;
        } catch (err) {
            return null;
        }
    };
}

export default EventController;
