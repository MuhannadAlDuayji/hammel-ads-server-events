import mongoose from "mongoose";
import { CampaignStatusId, CampaignStatusName } from "./CampaignStatus";

export interface Dataset {
    date: string;
    viewCount: number;
    clickCount: number;
    closeCount: number;
    averageClickWatchTime: number;
    averageCloseWatchTime: number;
}

export interface AnalyiticsItem {
    id: number;
    name: string;
    datasets: Dataset[];
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
    analytics: AnalyiticsItem[];
}
