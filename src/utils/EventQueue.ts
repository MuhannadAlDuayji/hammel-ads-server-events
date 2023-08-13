import Event from "../types/event";
import CampaignSchema from "../models/CampaignSchema";
import {
    CampaignStatusId,
    CampaignStatusName,
} from "../types/campaign/CampaignStatus";
import { EventTypeId } from "../types/event/EventType";
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
            // await EventSchema.insertMany(eventsToSave);
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
                            views.filter((event) => event.isTest === false)
                                .length *
                            ((Number(process.env.THOUSAND_VIEWS_COST) || 1) /
                                1000),
                    },
                },
                { new: true }
            );

            if (!campaign) {
                return false;
            }
            const cost =
                views.filter((event) => event.isTest === false).length *
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
