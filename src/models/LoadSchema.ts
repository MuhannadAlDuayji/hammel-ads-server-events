import * as mongoose from "mongoose";
import Event from "../types/event";
import { LoadStatusId, LoadStatusName } from "../types/load/LoadStatus";
import Load from "../types/load";

const loadSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
    },
    placementId: {
        type: String,
        required: true,
    },
    loadStatusName: {
        type: String,
        enum: Object.values(LoadStatusName),
        required: true,
    },
    loadStatusId: {
        type: Number,
        enum: [1, 2, 3],
        required: true,
    },
    campaignId: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

const Load = mongoose.model<Load & mongoose.Document>("Load", loadSchema);

export default Load;
