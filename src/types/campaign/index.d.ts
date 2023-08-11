import mongoose from "mongoose";
import { CampaignStatusId, CampaignStatusName } from "./CampaignStatus";
export default interface Campaign {
    title: string;
    userId: string;
    startDate: Date;
    endDate: Date;
    budget: number;
    country: string;
    targetedCities: string[];
    photoPath: string;
    link: string;
    campaignStatusName: CampaignStatusName;
    campaignStatusId: CampaignStatusId;
    createdAt: Date;
    clicks: number;
    views: number;
    moneySpent: number;
    adminMessage: string;
    servedCount: number;
    pendingCount: number;
    testDeviceId: string;
}
