import { Request, Response } from "express";
import campaignSchema from "../models/CampaignSchema";
import eventSchema from "../models/EventSchema";
import userSchema from "../models/UserSchema";

import { ValidationError, ValidationResult } from "../types/validation";

import crypto from "crypto";
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
            // if (!isValidObjectId(userId)) {
            //     return res.status(400).json({
            //         status: "error",
            //         message: "invalid userId",
            //     });
            // }

            const event: Event = {
                loadId,
                type,
                campaignId,
                // userId,
                deviceId,
                placementId,
                watchTimeStart,
                watchTimeEnd,
                watchTime,
                createdAt: new Date(Date.now()),
            };

            const campaign = await campaignSchema.findById(campaignId);

            if (!campaign)
                return res
                    .status(404)
                    .json({ status: "error", message: "campaign not found" });

            campaign.events.push(event);
            if (campaign.status === CampaignStatus.READY) {
                campaign.status = CampaignStatus.ACTIVE;
            }

            if (event.type === EventType.VIEW) {
                const cost =
                    (Number(process.env.THOUSAND_VIEWS_COST) || 1) / 1000;

                const currentBalance: number | null = await this.chargeUser(
                    campaign.userId,
                    cost
                );
                if (currentBalance === null)
                    return res.status(500).json({
                        status: "error",
                        message: "internal server error",
                    });
                campaign.moneySpent += cost;
                campaign.views = (campaign.views as number) + 1;

                if (campaign.moneySpent >= campaign.budget)
                    campaign.status = CampaignStatus.ENDED;
                if (cost > currentBalance)
                    campaign.status = CampaignStatus.WAITINGFORFUNDS;

                // make the load served
                campaign.loads = campaign.loads.map((load) => {
                    if (load.id === event.loadId) {
                        return {
                            ...load,
                            status: LoadStatus.SERVED,
                        };
                    }
                    return load;
                });

                await campaign.save();
            }

            if (event.type === EventType.CLICK) {
                campaign.clicks = (campaign.clicks as number) + 1;
            }

            campaign.clickRate =
                ((campaign.clicks as number) / (campaign.views as number)) *
                100;

            await campaign.save();

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
            console.log(user.balance);

            await user.save();
            return user.balance;
        } catch (err) {
            return null;
        }
    };
}

export default EventController;
