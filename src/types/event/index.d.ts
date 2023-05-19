import mongoose from "mongoose";
import { EventTypeId, EventTypeName } from "./EventType";
export default interface Event {
    loadId: string;
    eventTypeName: EventTypeName;
    eventTypeId: EventTypeId;
    campaignId: string;
    // userId: string;
    deviceId: string;
    placementId: string;
    watchTimeStart: number | null;
    watchTimeEnd: number | null;
    watchTime: number | null;
    createdAt: Date;
}
