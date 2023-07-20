import Event from "../types/event";
import EventSchema from "../models/EventSchema";
import CampaignSchema from "../models/CampaignSchema";
import {
    CampaignStatusId,
    CampaignStatusName,
} from "../types/campaign/CampaignStatus";
import { EventTypeId, EventTypeName } from "../types/event/EventType";
import Campaign, { AnalyiticsItem, Dataset } from "../types/campaign";
import User from "../models/UserSchema";
import { insertTimeSeriesData } from "../services/db";

class EventQueue {
    private events: Event[];
    private timer: NodeJS.Timeout | null;

    constructor() {
        this.events = [];
        this.timer = null;
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
            const campaigns = [
                ...new Set(eventsToSave.map((event) => event.campaignId)),
            ];
            for (let i = 0; i < campaigns.length; i++) {
                const campaignEvents: Event[] = eventsToSave.filter(
                    (event: Event) => event.campaignId === campaigns[i]
                );
                await this.updateCampaign(campaigns[i], campaignEvents);
            }

            await EventSchema.insertMany(eventsToSave);
            await insertTimeSeriesData(eventsToSave);
            console.log(`${eventsToSave.length} events saved to the database.`);
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
            // const closes: Event[] = campaignEvents.filter(
            //     (event: Event) => event.eventTypeId === EventTypeId.CLOSE
            // );

            const campaign = await CampaignSchema.findByIdAndUpdate(
                campaignId,
                {
                    $set: {
                        campaignStatusName: CampaignStatusName.ACTIVE,
                        campaignStatusId: CampaignStatusId.ACTIVE,
                    },
                    $inc: {
                        clicks: clicks.length,
                        views: views.length,
                        moneySpent:
                            views.length *
                            ((Number(process.env.THOUSAND_VIEWS_COST) || 1) /
                                1000),
                    },
                },
                { new: true }
            );

            if (!campaign) {
                return false;
            }

            // get today date string
            const todayDate = new Date();
            const todayDateString = todayDate.toISOString().slice(0, 10); // ex: '2023-06-23'
            const totalStats = campaign.analytics.find(
                (item: AnalyiticsItem) => item.id === 0
            );
            if (!totalStats) return false;

            campaignEvents.forEach((event: Event) => {
                const country = event.country;
                const targetCountry = campaign.analytics.find(
                    (item: AnalyiticsItem) =>
                        item.name.toLowerCase() === country.toLowerCase()
                );

                const datasetIndex = totalStats.datasets.findIndex(
                    (dataset: Dataset) => dataset.date === todayDateString
                );

                // update data in total

                if (datasetIndex === -1) {
                    // if it doesn't create a new dataset with the date of today and 0 counters and averages and add the value current event
                    const newDataset: Dataset = {
                        date: todayDateString,
                        viewCount: 0,
                        clickCount: 0,
                        closeCount: 0,
                        averageClickWatchTime: 0,
                        averageCloseWatchTime: 0,
                    };

                    switch (event.eventTypeName.toLowerCase()) {
                        case EventTypeName.VIEW:
                            newDataset.viewCount++;
                            break;
                        case EventTypeName.CLICK:
                            newDataset.clickCount++;
                            newDataset.averageClickWatchTime =
                                event.watchTime || 0;
                            break;
                        case EventTypeName.CLOSE:
                            newDataset.closeCount++;
                            newDataset.averageCloseWatchTime =
                                event.watchTime || 0;
                            break;
                    }

                    totalStats.datasets.push(newDataset);
                } else {
                    // check if today's dataset exists on the campaign {date: '2023-06-23'}  .date === todayDateString
                    // it it exists update the dataset with the new value of event
                    switch (event.eventTypeName.toLowerCase()) {
                        case EventTypeName.VIEW:
                            totalStats.datasets[datasetIndex].viewCount++;
                            break;
                        case EventTypeName.CLICK:
                            if (event.watchTime) {
                                const currentAverageWatchTime =
                                    totalStats.datasets[datasetIndex]
                                        .averageClickWatchTime;
                                const numberOfClicks =
                                    totalStats.datasets[datasetIndex]
                                        .clickCount;
                                totalStats.datasets[
                                    datasetIndex
                                ].averageClickWatchTime =
                                    (currentAverageWatchTime * numberOfClicks +
                                        event.watchTime) /
                                    (numberOfClicks + 1);
                            }
                            totalStats.datasets[datasetIndex].clickCount++;
                            break;
                        case EventTypeName.CLOSE:
                            if (event.watchTime) {
                                const currentAverageWatchTime =
                                    totalStats.datasets[datasetIndex]
                                        .averageCloseWatchTime;
                                const numberOfCloses =
                                    totalStats.datasets[datasetIndex]
                                        .closeCount;
                                totalStats.datasets[
                                    datasetIndex
                                ].averageCloseWatchTime =
                                    (currentAverageWatchTime * numberOfCloses +
                                        event.watchTime) /
                                    (numberOfCloses + 1);
                            }
                            totalStats.datasets[datasetIndex].closeCount++;
                            break;
                    }
                }

                // update data in target country if exists

                if (targetCountry) {
                    const datasetIndexTarget = targetCountry.datasets.findIndex(
                        (dataset: Dataset) => dataset.date === todayDateString
                    );
                    if (datasetIndexTarget === -1) {
                        // if it doesn't create a new dataset with the date of today and 0 counters and averages and add the value current event
                        const newDataset: Dataset = {
                            date: todayDateString,
                            viewCount: 0,
                            clickCount: 0,
                            closeCount: 0,
                            averageClickWatchTime: 0,
                            averageCloseWatchTime: 0,
                        };

                        switch (event.eventTypeName.toLowerCase()) {
                            case EventTypeName.VIEW:
                                newDataset.viewCount++;
                                break;
                            case EventTypeName.CLICK:
                                newDataset.clickCount++;
                                newDataset.averageClickWatchTime =
                                    event.watchTime || 0;
                                break;
                            case EventTypeName.CLOSE:
                                newDataset.closeCount++;
                                newDataset.averageCloseWatchTime =
                                    event.watchTime || 0;
                                break;
                        }

                        targetCountry.datasets.push(newDataset);
                    } else {
                        // check if today's dataset exists on the campaign {date: '2023-06-23'}  .date === todayDateString
                        // it it exists update the dataset with the new value of event
                        switch (event.eventTypeName.toLowerCase()) {
                            case EventTypeName.VIEW:
                                targetCountry.datasets[datasetIndexTarget]
                                    .viewCount++;
                                break;
                            case EventTypeName.CLICK:
                                if (event.watchTime) {
                                    const currentAverageWatchTime =
                                        targetCountry.datasets[
                                            datasetIndexTarget
                                        ].averageClickWatchTime;
                                    const numberOfClicks =
                                        targetCountry.datasets[
                                            datasetIndexTarget
                                        ].clickCount;
                                    targetCountry.datasets[
                                        datasetIndexTarget
                                    ].averageClickWatchTime =
                                        (currentAverageWatchTime *
                                            numberOfClicks +
                                            event.watchTime) /
                                        (numberOfClicks + 1);
                                }
                                targetCountry.datasets[datasetIndexTarget]
                                    .clickCount++;
                                break;
                            case EventTypeName.CLOSE:
                                if (event.watchTime) {
                                    const currentAverageWatchTime =
                                        targetCountry.datasets[
                                            datasetIndexTarget
                                        ].averageCloseWatchTime;
                                    const numberOfCloses =
                                        targetCountry.datasets[
                                            datasetIndexTarget
                                        ].closeCount;
                                    targetCountry.datasets[
                                        datasetIndexTarget
                                    ].averageCloseWatchTime =
                                        (currentAverageWatchTime *
                                            numberOfCloses +
                                            event.watchTime) /
                                        (numberOfCloses + 1);
                                }
                                targetCountry.datasets[datasetIndexTarget]
                                    .closeCount++;
                                break;
                        }
                    }
                }
            });

            campaign.markModified("analytics");
            const cost =
                views.length *
                ((Number(process.env.THOUSAND_VIEWS_COST) || 1) / 1000);
            const currentBalance: number | null = await this.chargeUser(
                campaign.userId,
                cost
            );
            if (currentBalance === null) {
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
            }

            // // make the load served
            // await load.updateOne({
            //     loadStatusId: LoadStatusId.SERVED,
            //     loadStatusName: LoadStatusName.SERVED,
            // });

            await campaign.updateOne({
                $inc: {
                    pendingCount: -views.length,
                    servedCount: views.length,
                },
            });
            await campaign.save();
        } catch (err) {
            return false;
        }
    }

    private async chargeUser(userId: string, cost: number) {
        try {
            const user = await User.findById(userId);
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
    }
}

export default new EventQueue();
