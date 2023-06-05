import { Request, Response } from "express";
import campaignSchema from "../models/CampaignSchema";
import userSchema from "../models/UserSchema";

import { ValidationError, ValidationResult } from "../types/validation";

import { validationResult } from "express-validator";
import { isValidObjectId } from "mongoose";
import Event from "../types/event";
import EventSchema from "../models/EventSchema";
import { EventTypeId, EventTypeName } from "../types/event/EventType";
import {
    CampaignStatusId,
    CampaignStatusName,
} from "../types/campaign/CampaignStatus";
import Load from "../models/LoadSchema";
import { LoadStatusId, LoadStatusName } from "../types/load/LoadStatus";

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
                userId,
                deviceId,
                placementId,
                watchTimeStart,
                watchTimeEnd,
                watchTime,
            } = req.body;

            if (!isValidObjectId(loadId) || !isValidObjectId(userId)) {
                return res.status(400).json({
                    status: "error",
                    message: "invalid object Ids provided",
                });
            }

            const load = await Load.findById(loadId);
            if (!load) {
                return res.status(404).json({
                    status: "error",
                    message: "load not found",
                });
            }
            // Map the type string to the corresponding eventTypeName and eventTypeId
            let eventTypeName, eventTypeId;

            switch (type.toLowerCase()) {
                case EventTypeName.VIEW:
                    eventTypeName = EventTypeName.VIEW;
                    eventTypeId = EventTypeId.VIEW;
                    break;
                case EventTypeName.CLICK:
                    eventTypeName = EventTypeName.CLICK;
                    eventTypeId = EventTypeId.CLICK;
                    break;
                case EventTypeName.CLOSE:
                    eventTypeName = EventTypeName.CLOSE;
                    eventTypeId = EventTypeId.CLOSE;
                    break;
                default:
                    // Handle the case when an invalid type is provided
                    return res.status(400).json({
                        status: "error",
                        message: "Invalid type",
                    });
            }

            const event: Event = {
                loadId,
                eventTypeId,
                eventTypeName,
                campaignId: load.campaignId,
                userId: userId,
                deviceId,
                placementId,
                watchTimeStart,
                watchTimeEnd,
                watchTime,
                createdAt: new Date(Date.now()),
            };

            const newEvent = new EventSchema(event);
            newEvent.save();

            // Find the campaign by id and update it with the new event data
            const updatedCampaign = await campaignSchema.findByIdAndUpdate(
                load.campaignId,
                {
                    $set: {
                        campaignStatusName: CampaignStatusName.ACTIVE,
                        campaignStatusId: CampaignStatusId.ACTIVE,
                    },
                    $inc: {
                        clicks: event.eventTypeId === EventTypeId.CLICK ? 1 : 0,
                        views: event.eventTypeId === EventTypeId.VIEW ? 1 : 0,
                        moneySpent:
                            event.eventTypeId === EventTypeId.VIEW
                                ? (Number(process.env.THOUSAND_VIEWS_COST) ||
                                      1) / 1000
                                : 0,
                    },
                },
                { new: true }
            );

            if (!updatedCampaign) {
                return res.status(500).json({
                    status: "error",
                    message: "internal server error",
                });
            }

            if (newEvent.eventTypeId === EventTypeId.VIEW) {
                const cost =
                    (Number(process.env.THOUSAND_VIEWS_COST) || 1) / 1000;
                const currentBalance: number | null = await this.chargeUser(
                    updatedCampaign.userId,
                    cost
                );
                if (currentBalance === null) {
                    return res.status(500).json({
                        status: "error",
                        message: "internal server error",
                    });
                }

                if (updatedCampaign.moneySpent >= updatedCampaign.budget) {
                    // make status ended
                    await updatedCampaign.update({
                        campaignStatusName: CampaignStatusName.ENDED,
                        campaignStatusId: CampaignStatusId.ENDED,
                    });
                } else if (cost > currentBalance) {
                    // status waiting for funds
                    await updatedCampaign.update({
                        campaignStatusName: CampaignStatusName.WAITINGFORFUNDS,
                        campaignStatusId: CampaignStatusId.WAITINGFORFUNDS,
                    });
                }

                // make the load served
                await load.update({
                    loadStatusId: LoadStatusId.SERVED,
                    loadStatusName: LoadStatusName.SERVED,
                });

                await updatedCampaign.update({
                    $inc: {
                        pendingCount: -1,
                        servedCount: 1,
                    },
                });
            }

            // Same as before
            return res.status(200).json({
                status: "success",
                message: "event saved",
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
