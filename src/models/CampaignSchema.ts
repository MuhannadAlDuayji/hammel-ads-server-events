import * as mongoose from "mongoose";
import {
    CampaignStatusId,
    CampaignStatusName,
} from "../types/campaign/CampaignStatus";
import Campaign from "../types/campaign";

const campaignSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },

    budget: {
        type: Number,
        required: true,
    },
    country: {
        type: String,
        required: true,
    },
    photoPath: {
        type: String,
        required: true,
    },
    link: {
        type: String,
        required: true,
    },
    campaignStatusName: {
        type: String,
        enum: Object.values(CampaignStatusName),
        required: true,
    },
    campaignStatusId: {
        type: Number,
        enum: [1, 2, 3, 4, 5, 6, 7, 8],
        required: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
    clicks: {
        type: Number,
        default: 0,
    },
    views: {
        type: Number,
        default: 0,
    },
    moneySpent: {
        type: Number,
        default: 0,
    },
    adminMessage: {
        type: String,
        default: null,
    },
});

const Campaign = mongoose.model<Campaign & mongoose.Document>(
    "Campaign",
    campaignSchema
);

export default Campaign;
