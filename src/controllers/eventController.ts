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
import { AnalyiticsItem, Dataset } from "../types/campaign";
import EventQueue from "../utils/EventQueue";

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
                country: load.country,
                userId: userId,
                deviceId,
                placementId,
                watchTimeStart,
                watchTimeEnd,
                watchTime,
                createdAt: new Date(Date.now()),
            };

            // const newEvent = new EventSchema(event);
            // await newEvent.save();

            EventQueue.enqueue(event);
            // Find the campaign by id and update it with the new event data
            // const campaign = await campaignSchema.findByIdAndUpdate(
            //     load.campaignId,
            //     {
            //         $set: {
            //             campaignStatusName: CampaignStatusName.ACTIVE,
            //             campaignStatusId: CampaignStatusId.ACTIVE,
            //         },
            //         $inc: {
            //             clicks: event.eventTypeId === EventTypeId.CLICK ? 1 : 0,
            //             views: event.eventTypeId === EventTypeId.VIEW ? 1 : 0,
            //             moneySpent:
            //                 event.eventTypeId === EventTypeId.VIEW
            //                     ? (Number(process.env.THOUSAND_VIEWS_COST) ||
            //                           1) / 1000
            //                     : 0,
            //         },
            //     },
            //     { new: true }
            // );

            // if (!campaign) {
            //     return res.status(500).json({
            //         status: "error",
            //         message: "internal server error",
            //     });
            // }

            // // get today date string
            // const todayDate = new Date();
            // const todayDateString = todayDate.toISOString().slice(0, 10); // ex: '2023-06-23'
            // const country = load.country;

            // const targetCountry = campaign.analytics.find(
            //     (item: AnalyiticsItem) =>
            //         item.name.toLowerCase() === country.toLowerCase()
            // );

            // const totalStats = campaign.analytics.find(
            //     (item: AnalyiticsItem) => item.id === 0
            // );
            // if (!totalStats) return res.status(500);

            // const datasetIndex = totalStats.datasets.findIndex(
            //     (dataset: Dataset) => dataset.date === todayDateString
            // );

            // // update data in total

            // if (datasetIndex === -1) {
            //     // if it doesn't create a new dataset with the date of today and 0 counters and averages and add the value current event
            //     const newDataset: Dataset = {
            //         date: todayDateString,
            //         viewCount: 0,
            //         clickCount: 0,
            //         closeCount: 0,
            //         averageClickWatchTime: 0,
            //         averageCloseWatchTime: 0,
            //     };

            //     switch (type.toLowerCase()) {
            //         case EventTypeName.VIEW:
            //             newDataset.viewCount++;
            //             break;
            //         case EventTypeName.CLICK:
            //             newDataset.clickCount++;
            //             newDataset.averageClickWatchTime = event.watchTime || 0;
            //             break;
            //         case EventTypeName.CLOSE:
            //             newDataset.closeCount++;
            //             newDataset.averageCloseWatchTime = event.watchTime || 0;
            //             break;
            //     }

            //     const totalStats = campaign.analytics.find(
            //         (item: any) => item.id === 0
            //     );
            //     if (!totalStats) return res.status(500);

            //     totalStats.datasets.push(newDataset);
            // } else {
            //     // check if today's dataset exists on the campaign {date: '2023-06-23'}  .date === todayDateString
            //     // it it exists update the dataset with the new value of event
            //     switch (type.toLowerCase()) {
            //         case EventTypeName.VIEW:
            //             totalStats.datasets[datasetIndex].viewCount++;
            //             break;
            //         case EventTypeName.CLICK:
            //             if (event.watchTime) {
            //                 const currentAverageWatchTime =
            //                     totalStats.datasets[datasetIndex]
            //                         .averageClickWatchTime;
            //                 const numberOfClicks =
            //                     totalStats.datasets[datasetIndex].clickCount;
            //                 totalStats.datasets[
            //                     datasetIndex
            //                 ].averageClickWatchTime =
            //                     (currentAverageWatchTime * numberOfClicks +
            //                         event.watchTime) /
            //                     (numberOfClicks + 1);
            //             }
            //             totalStats.datasets[datasetIndex].clickCount++;
            //             break;
            //         case EventTypeName.CLOSE:
            //             if (event.watchTime) {
            //                 const currentAverageWatchTime =
            //                     totalStats.datasets[datasetIndex]
            //                         .averageCloseWatchTime;
            //                 const numberOfCloses =
            //                     totalStats.datasets[datasetIndex].closeCount;
            //                 totalStats.datasets[
            //                     datasetIndex
            //                 ].averageCloseWatchTime =
            //                     (currentAverageWatchTime * numberOfCloses +
            //                         event.watchTime) /
            //                     (numberOfCloses + 1);
            //             }
            //             totalStats.datasets[datasetIndex].closeCount++;
            //             break;
            //     }
            // }

            // // update data in target country if exists

            // if (targetCountry) {
            //     const datasetIndexTarget = targetCountry.datasets.findIndex(
            //         (dataset: Dataset) => dataset.date === todayDateString
            //     );
            //     if (datasetIndexTarget === -1) {
            //         // if it doesn't create a new dataset with the date of today and 0 counters and averages and add the value current event
            //         const newDataset: Dataset = {
            //             date: todayDateString,
            //             viewCount: 0,
            //             clickCount: 0,
            //             closeCount: 0,
            //             averageClickWatchTime: 0,
            //             averageCloseWatchTime: 0,
            //         };

            //         switch (type.toLowerCase()) {
            //             case EventTypeName.VIEW:
            //                 newDataset.viewCount++;
            //                 break;
            //             case EventTypeName.CLICK:
            //                 newDataset.clickCount++;
            //                 newDataset.averageClickWatchTime =
            //                     event.watchTime || 0;
            //                 break;
            //             case EventTypeName.CLOSE:
            //                 newDataset.closeCount++;
            //                 newDataset.averageCloseWatchTime =
            //                     event.watchTime || 0;
            //                 break;
            //         }

            //         targetCountry.datasets.push(newDataset);
            //     } else {
            //         // check if today's dataset exists on the campaign {date: '2023-06-23'}  .date === todayDateString
            //         // it it exists update the dataset with the new value of event
            //         switch (type.toLowerCase()) {
            //             case EventTypeName.VIEW:
            //                 targetCountry.datasets[datasetIndexTarget]
            //                     .viewCount++;
            //                 break;
            //             case EventTypeName.CLICK:
            //                 if (event.watchTime) {
            //                     const currentAverageWatchTime =
            //                         targetCountry.datasets[datasetIndexTarget]
            //                             .averageClickWatchTime;
            //                     const numberOfClicks =
            //                         targetCountry.datasets[datasetIndexTarget]
            //                             .clickCount;
            //                     targetCountry.datasets[
            //                         datasetIndexTarget
            //                     ].averageClickWatchTime =
            //                         (currentAverageWatchTime * numberOfClicks +
            //                             event.watchTime) /
            //                         (numberOfClicks + 1);
            //                 }
            //                 targetCountry.datasets[datasetIndexTarget]
            //                     .clickCount++;
            //                 break;
            //             case EventTypeName.CLOSE:
            //                 if (event.watchTime) {
            //                     const currentAverageWatchTime =
            //                         targetCountry.datasets[datasetIndexTarget]
            //                             .averageCloseWatchTime;
            //                     const numberOfCloses =
            //                         targetCountry.datasets[datasetIndexTarget]
            //                             .closeCount;
            //                     targetCountry.datasets[
            //                         datasetIndexTarget
            //                     ].averageCloseWatchTime =
            //                         (currentAverageWatchTime * numberOfCloses +
            //                             event.watchTime) /
            //                         (numberOfCloses + 1);
            //                 }
            //                 targetCountry.datasets[datasetIndexTarget]
            //                     .closeCount++;
            //                 break;
            //         }
            //     }
            // }

            // campaign.markModified("analytics");
            // await campaign.save();
            // charge user
            // if campaign moneyspent >= budget campaign ended
            // if cost > currentBalance campaign waiting for funds

            if (event.eventTypeId === EventTypeId.VIEW) {
                // const cost =
                //     (Number(process.env.THOUSAND_VIEWS_COST) || 1) / 1000;
                // const currentBalance: number | null = await this.chargeUser(
                //     campaign.userId,
                //     cost
                // );
                // if (currentBalance === null) {
                //     return res.status(500).json({
                //         status: "error",
                //         message: "internal server error",
                //     });
                // }

                // if (campaign.moneySpent >= campaign.budget) {
                //     // make status ended
                //     await campaign.updateOne({
                //         campaignStatusName: CampaignStatusName.ENDED,
                //         campaignStatusId: CampaignStatusId.ENDED,
                //     });
                // } else if (cost > currentBalance) {
                //     // status waiting for funds
                //     await campaign.updateOne({
                //         campaignStatusName: CampaignStatusName.WAITINGFORFUNDS,
                //         campaignStatusId: CampaignStatusId.WAITINGFORFUNDS,
                //     });
                // }

                // make the load served
                await load.updateOne({
                    loadStatusId: LoadStatusId.SERVED,
                    loadStatusName: LoadStatusName.SERVED,
                });

                // await campaign.updateOne({
                //     $inc: {
                //         pendingCount: -1,
                //         servedCount: 1,
                //     },
                // });
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
