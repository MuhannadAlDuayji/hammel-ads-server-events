import { Request, Response } from "express";
import userSchema from "../models/UserSchema";
import { ValidationError, ValidationResult } from "../types/validation";
import { validationResult } from "express-validator";
import { isValidObjectId } from "mongoose";
import Event from "../types/event";
import { EventTypeId, EventTypeName } from "../types/event/EventType";
import Load from "../models/LoadSchema";
import { LoadStatusId, LoadStatusName } from "../types/load/LoadStatus";
import EventQueue from "../utils/EventQueue";
import {
    IP2Location,
    IP2LocationWebService,
    IPTools,
    Country,
    Region,
} from "ip2location-nodejs";
import requestIP from "request-ip";
let ip2location = new IP2Location();

ip2location.open(`${__dirname}/../static/IP2LOCATION-LITE-DB3.BIN`);

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

            const clientIp = requestIP.getClientIp(req);

            let city = "Unknown";
            if (clientIp) {
                city = ip2location.getCity(clientIp);
                console.log("ip -> ", clientIp);
                console.log("city -> ", city);
            }

            const event: Event = {
                loadId,
                city: city,
                ip: clientIp || "none",
                eventTypeId,
                eventTypeName,
                campaignId: load.campaignId,
                country: load.country,
                userId: userId,
                placementId,
                watchTimeStart,
                watchTimeEnd,
                watchTime,
                createdAt: new Date(Date.now()),
            };

            EventQueue.enqueue(event);

            if (event.eventTypeId === EventTypeId.VIEW) {
                await load.updateOne({
                    loadStatusId: LoadStatusId.SERVED,
                    loadStatusName: LoadStatusName.SERVED,
                });
            }

            // Same as before
            return res.status(200).json({
                status: "success",
                message: "event saved",
            });
        } catch (err: any) {
            console.log("error", err);

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
