import * as mongoose from "mongoose";
import Event from "../types/event";
import { EventTypeId, EventTypeName } from "../types/event/EventType";

const eventSchema = new mongoose.Schema({
    loadId: {
        type: String,
        required: true,
    },
    eventTypeName: {
        type: String,
        enum: Object.values(EventTypeName),
        required: true,
    },
    eventTypeId: {
        type: Number,
        enum: [1, 2, 3],
        required: true,
    },
    campaignId: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        required: true,
    },
    deviceId: {
        type: String,
        required: true,
    },
    placementId: {
        type: String,
        required: true,
    },
    watchTimeStart: {
        type: Number,
        default: null,
    },
    watchTimeEnd: {
        type: Number,
        default: null,
    },
    watchTime: {
        type: Number,
        default: null,
    },
    createdAt: {
        type: Date,
        default: new Date(Date.now()),
    },
});

const Event = mongoose.model<Event & mongoose.Document>("Event", eventSchema);

export default Event;
