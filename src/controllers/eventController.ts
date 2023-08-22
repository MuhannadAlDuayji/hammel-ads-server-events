import { Request, Response } from "express";
import userSchema from "../models/UserSchema";
import { ValidationError, ValidationResult } from "../types/validation";
import { validationResult } from "express-validator";
import { isValidObjectId } from "mongoose";
import Event from "../types/event";
import { EventTypeId, EventTypeName } from "../types/event/EventType";
import Load from "../models/LoadSchema";
import { LoadStatusId, LoadStatusName } from "../types/load/LoadStatus";
import { MongoClient } from "mongodb";
import EventQueue from "../utils/EventQueue";
import { IP2Location } from "ip2location-nodejs";
import requestIP from "request-ip";
import Dataset from "../types/dataset";
import User from "../models/UserSchema";

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

            if (errors.length > 0 || true) {
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
            /*
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
            let country = "Unknown";
            if (clientIp) {
                city = ip2location.getCity(clientIp);
                country = ip2location.getCountryLong(clientIp);
            }

            const event: Event = {
                loadId,
                city: city,
                eventTypeId,
                eventTypeName,
                campaignId: load.campaignId,
                mobileRegion: load.country,
                country: country,
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

            // save event
            const client = new MongoClient(process.env.URI_STRING || "");
            const db = client.db();
            const timeSeriesCollection = db.collection("eventsTimeSeries");

            const { startHour, endHour } = this.getHour(event.createdAt);
            const existingDataset = await timeSeriesCollection.findOne({
                createdAt: { $gte: startHour, $lte: endHour },
                campaignId: event.campaignId,
                country: event.country,
                city: event.city,
            });

            if (!existingDataset) {
                const newDataset: Dataset = {
                    createdAt: new Date(),
                    campaignId: load.campaignId,
                    country,
                    city,
                    views: 0,
                    clicks: 0,
                    closes: 0,
                    averageClickWatchTime: null,
                    averageCloseWatchTime: null,
                };
                switch (event.eventTypeId) {
                    case 1:
                        newDataset.views = 1;
                        break;
                    case 2:
                        newDataset.clicks = 1;
                        newDataset.averageClickWatchTime = watchTime;
                        break;
                    case 3:
                        newDataset.closes = 1;
                        newDataset.averageCloseWatchTime = watchTime;
                        break;
                }
                await timeSeriesCollection.insertOne(newDataset);
            } else {
                switch (event.eventTypeId) {
                    case 1:
                        existingDataset.views += 1;
                        break;
                    case 2:
                        if (existingDataset.averageClickWatchTime === null) {
                            existingDataset.averageClickWatchTime = watchTime;
                        } else {
                            const newAverageWatchTime =
                                (existingDataset.averageClickWatchTime *
                                    existingDataset.clicks +
                                    Number(event.watchTime)) /
                                (existingDataset.clicks + 1);

                            existingDataset.averageClickWatchTime =
                                newAverageWatchTime;
                        }
                        existingDataset.clicks += 1;

                        break;
                    case 3:
                        if (existingDataset.averageCloseWatchTime === null) {
                            existingDataset.averageCloseWatchTime = watchTime;
                        } else {
                            const newAverageWatchTime =
                                (existingDataset.averageCloseWatchTime *
                                    existingDataset.closes +
                                    Number(event.watchTime)) /
                                (existingDataset.closes + 1);

                            existingDataset.averageCloseWatchTime =
                                newAverageWatchTime;
                        }
                        existingDataset.closes += 1;
                        break;
                }

                await timeSeriesCollection.updateOne(
                    { _id: existingDataset._id },
                    { $set: existingDataset }
                );
            }

            await client.close();

            return res.status(200).json({
                status: "success",
                message: "event saved",
            });*/
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
}

export default EventController;
