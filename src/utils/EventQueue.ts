import Event from "../types/event";
import CampaignSchema from "../models/CampaignSchema";
import {
    CampaignStatusId,
    CampaignStatusName,
} from "../types/campaign/CampaignStatus";
import { EventTypeId, EventTypeName } from "../types/event/EventType";
import User from "../models/UserSchema";
import { MongoClient } from "mongodb";
import Dataset from "../types/dataset";

class EventQueue {
    private events: Event[];
    private timer: NodeJS.Timeout | null;
    private client: MongoClient;

    constructor() {
        this.events = [];
        this.timer = null;
        this.client = new MongoClient(process.env.URI_STRING || ""); // Initialize MongoClient
    }

    enqueue(event: Event) {
        this.events.push(event);
        this.startTimer();
    }
    private startTimer() {
        if (!this.timer) {
            this.timer = setInterval(() => this.saveEvents(), 10000); // Save events every 1 minute
        }
    }

    private async saveEvents() {
        if (this.events.length === 0) {
            return;
        }

        const eventsToSave = this.events.slice();
        this.events = [];

        try {
            // -------------- save datasets --------------
            const db = this.client.db(); // Reuse the existing MongoClient instance
            const timeSeriesCollection = db.collection("eventsTimeSeries");

            const groupedEvents: Event[][] = this.groupEvents(eventsToSave);
            const now = new Date();
            const { startOfDay, endOfDay } = this.getDay(now);

            const newDatasetsToInsert: Dataset[] = [];
            for (let i = 0; i < groupedEvents.length; i++) {
                const group: Event[] = groupedEvents[i];
                const views: Event[] = group.filter(
                    (event: Event) => event.eventTypeId === EventTypeId.VIEW
                );
                const clicks: Event[] = group.filter(
                    (event: Event) => event.eventTypeId === EventTypeId.CLICK
                );

                const closes: Event[] = group.filter(
                    (event: Event) => event.eventTypeId === EventTypeId.CLOSE
                );
                const groupProprities = {
                    campaignId: group[0].campaignId,
                    country: group[0].country,
                    city: group[0].city,
                };
                const existingDataset = await timeSeriesCollection.findOne({
                    createdAt: { $gte: startOfDay, $lte: endOfDay },
                    campaignId: groupProprities.campaignId,
                    country: groupProprities.country,
                    city: groupProprities.city,
                });

                if (!existingDataset) {
                    const newDataset: Dataset = {
                        createdAt: new Date(),
                        campaignId: groupProprities.campaignId,
                        country: groupProprities.country,
                        city: groupProprities.city,
                        views: 0,
                        clicks: 0,
                        closes: 0,
                        averageClickWatchTime: null,
                        averageCloseWatchTime: null,
                    };

                    newDataset.views += views.length;
                    newDataset.clicks += clicks.length;
                    newDataset.closes += closes.length;

                    newDataset.averageClickWatchTime =
                        this.getAverageWatchTime(clicks);
                    newDataset.averageCloseWatchTime =
                        this.getAverageWatchTime(closes);

                    newDatasetsToInsert.push(newDataset);
                } else {
                    existingDataset.views += views.length;

                    if (existingDataset.averageClickWatchTime === null) {
                        existingDataset.averageClickWatchTime =
                            this.getAverageWatchTime(clicks);
                    } else {
                        const newAverageWatchTime =
                            (existingDataset.averageClickWatchTime *
                                existingDataset.clicks +
                                (this.getAverageWatchTime(clicks) || 0)) /
                            (existingDataset.clicks + clicks.length);

                        existingDataset.averageClickWatchTime =
                            newAverageWatchTime;
                    }
                    existingDataset.clicks += clicks.length;
                    if (existingDataset.averageCloseWatchTime === null) {
                        existingDataset.averageCloseWatchTime =
                            this.getAverageWatchTime(closes);
                    } else {
                        const newAverageWatchTime =
                            (existingDataset.averageCloseWatchTime *
                                existingDataset.closes +
                                (this.getAverageWatchTime(closes) || 0)) /
                            (existingDataset.closes + closes.length);

                        existingDataset.averageCloseWatchTime =
                            newAverageWatchTime;
                    }
                    existingDataset.closes += closes.length;

                    await timeSeriesCollection.updateOne(
                        { _id: existingDataset._id },
                        { $set: existingDataset }
                    );
                }
            }

            if (newDatasetsToInsert.length > 0) {
                await timeSeriesCollection.insertMany(newDatasetsToInsert);
            }
            // -------------- update campaign information ------------
            const campaigns = [
                ...new Set(eventsToSave.map((event) => event.campaignId)),
            ];
            for (let i = 0; i < campaigns.length; i++) {
                const campaignEvents: Event[] = eventsToSave.filter(
                    (event: Event) => event.campaignId === campaigns[i]
                );
                const result = await this.updateCampaign(
                    campaigns[i],
                    campaignEvents
                );
                if (!result) {
                    console.error("errorrrrrrrrrrrr happeneddddddddddd");
                }
            }
            console.log(
                `${eventsToSave.length} events information updated in the database.`
            );
        } catch (error) {
            console.error("Error saving events:", error);
            this.events.unshift(...eventsToSave); // Put the unsaved events back to the front of the queue
        }
    }

    private async updateCampaign(campaignId: string, campaignEvents: Event[]) {
        try {
            // Find the campaign by id and update it with the new event data
            const views: Event[] = campaignEvents.filter(
                (event: Event) => event.eventTypeId === EventTypeId.VIEW
            );
            const clicks: Event[] = campaignEvents.filter(
                (event: Event) => event.eventTypeId === EventTypeId.CLICK
            );

            let cost = 0;

            for (let i = 0; i < views.length; i++) {
                const view = views[i];
                const oneViewCost =
                    (Number(process.env.THOUSAND_VIEWS_COST) || 1) / 1000;
                if (!view.isTest) {
                    cost += oneViewCost - oneViewCost * view.discount;
                }
            }
            const campaign = await CampaignSchema.findByIdAndUpdate(
                campaignId,
                {
                    $inc: {
                        clicks: clicks.length,
                        views: views.length,
                        moneySpent: cost,
                    },
                },
                { new: true }
            );
            if (!campaign) {
                return false;
            }
            const currentBalance: number | null = await this.chargeUser(
                campaign.userId,
                cost
            );
            if (currentBalance === null) {
                console.log("error chargin balance");
                return false;
            }

            if (campaign.moneySpent >= campaign.budget) {
                // make status ended
                await campaign.updateOne({
                    campaignStatusName: CampaignStatusName.ENDED,
                    campaignStatusId: CampaignStatusId.ENDED,
                });
            } else if (cost > currentBalance) {
                // status waiting for funds
                await campaign.updateOne({
                    campaignStatusName: CampaignStatusName.WAITINGFORFUNDS,
                    campaignStatusId: CampaignStatusId.WAITINGFORFUNDS,
                });
            } else if (campaign.campaignStatusId === CampaignStatusId.READY) {
                await campaign.updateOne({
                    campaignStatusName: CampaignStatusName.ACTIVE,
                    campaignStatusId: CampaignStatusId.ACTIVE,
                });
            }

            await campaign.updateOne({
                $inc: {
                    pendingCount: -views.length,
                    servedCount: views.length,
                },
            });
            await campaign.save();
            return true;
        } catch (err) {
            console.log("errorr ", err);
            return null;
        }
    }

    private async chargeUser(userId: string, cost: number) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                console.log("user not found");
                return null;
            }

            if (user.balance - cost < 0) {
                user.balance = 0;
            } else {
                user.balance -= cost;
            }

            await user.save();
            return user.balance;
        } catch (err) {
            console.log(err);
            return null;
        }
    }

    private groupEvents(events: Event[]) {
        const groupedEvents: any = {};
        for (const event of events) {
            const { campaignId, country, city } = event;
            const key = `${campaignId}-${country}-${city}`;

            if (!groupedEvents[key]) {
                groupedEvents[key] = [];
            }

            groupedEvents[key].push(event);
        }
        const result: Event[][] = Object.values(groupedEvents);

        return result;
    }
    private getDay = (date: Date) => {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return { startOfDay, endOfDay };
    };

    private getAverageWatchTime = (events: Event[]) => {
        if (events.length === 0) return null;
        let totalWatchTime = 0;
        for (const event of events) {
            totalWatchTime += event.watchTime || 0; // Ensure you handle null values
        }

        const numberOfEvents = events.length;
        const averageWatchTime = totalWatchTime / numberOfEvents;

        return averageWatchTime;
    };
}

export default new EventQueue();
