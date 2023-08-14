import mongoose from "mongoose";

export default interface Dataset {
    createdAt: Date;
    campaignId: string;
    country: string;
    city: string;
    views: number;
    clicks: number;
    closes: number;
    averageClickWatchTime: number | null;
    averageCloseWatchTime: number | null;
}
