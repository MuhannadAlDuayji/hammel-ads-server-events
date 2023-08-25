import { Request, Response } from "express";
import { ValidationError, ValidationResult } from "../types/validation";
import { validationResult } from "express-validator";
import { isValidObjectId } from "mongoose";
import Event from "../types/event";
import { EventTypeId, EventTypeName } from "../types/event/EventType";
import Load from "../models/LoadSchema";
import { LoadStatusId, LoadStatusName } from "../types/load/LoadStatus";
import { MongoClient } from "mongodb";
import EventQueue from "../utils/EventQueue";
import Dataset from "../types/dataset";
import User from "../models/UserSchema";

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

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    status: "error",
                    message: "user not found",
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
                city: load.city,
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
                isTest: load.isTest,
                discount: user.discount,
            };

            if (Number(event.watchTime) > 1000) {
                console.log(event);
            }

            EventQueue.enqueue(event);
            if (event.eventTypeId === EventTypeId.VIEW) {
                await load.updateOne({
                    loadStatusId: LoadStatusId.SERVED,
                    loadStatusName: LoadStatusName.SERVED,
                });
            }

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
    static getHour = (createdAt: Date) => {
        const startHour = new Date(createdAt);
        startHour.setMinutes(0);
        startHour.setSeconds(0);
        startHour.setMilliseconds(0);

        const endHour = new Date(createdAt);
        endHour.setMinutes(59);
        endHour.setSeconds(59);
        endHour.setMilliseconds(999);

        return { startHour, endHour };
    };
    static getDay = (date: Date) => {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return { startOfDay, endOfDay };
    };
}

export default EventController;
