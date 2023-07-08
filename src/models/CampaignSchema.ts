import * as mongoose from "mongoose";
import { CampaignStatusName } from "../types/campaign/CampaignStatus";
import Campaign from "../types/campaign";
import countryList from "../static/countryList";

const datasetSchema = new mongoose.Schema({
    date: { type: String },
    viewCount: { type: Number },
    clickCount: { type: Number },
    closeCount: { type: Number },
    averageClickWatchTime: { type: Number },
    averageCloseWatchTime: { type: Number },
});

const analyticsItemSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    datasets: {
        type: [datasetSchema],
        default: [],
    },
});

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
        required: false,
        default: "",
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
    servedCount: {
        type: Number,
        default: 0,
    },
    pendingCount: {
        type: Number,
        default: 0,
    },
    // datasets: {
    //     type: [DataSet],
    //     default: [],
    // },
    analytics: {
        type: [analyticsItemSchema],
        default: function () {
            const countries = countryList.map((country: string, i: number) => ({
                id: i,
                name: country,
                datasets: [],
            }));
            return countries;
        },
    },
});

/*
analytics: [
    {name: "total", datasets: [{date: ...}]}
    {name: "saudi arabia", datasets: [{date: ...}]},
    ...
]
*/

const Campaign = mongoose.model<Campaign & mongoose.Document>(
    "Campaign",
    campaignSchema
);

export default Campaign;
