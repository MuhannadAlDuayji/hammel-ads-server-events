import mongoose from "mongoose";
import { CampaignStatusId, CampaignStatusName } from "./CampaignStatus";

export interface Dataset {
    date: String;
    viewCount: number;
    clickCount: number;
    closeCount: number;
    averageClickWatchTime: number;
    averageCloseWatchTime: number;
}
export default interface Campaign {
    title: string;
    userId: string;
    startDate: Date;
    endDate: Date;
    budget: number;
    country: string;
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
    datasets: dataset[];
}
