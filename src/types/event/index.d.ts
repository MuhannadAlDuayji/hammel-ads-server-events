import mongoose from "mongoose";
import { EventTypeId, EventTypeName } from "./EventType";
export default interface Event {
    loadId: string;
    eventTypeName: EventTypeName;
    eventTypeId: EventTypeId;
    campaignId: string;
    country: string;
    city: string;
    userId: string;
    placementId: string;
    watchTimeStart: number | null;
    watchTimeEnd: number | null;
    watchTime: number | null;
    createdAt: Date;
    isTest: boolean;
    discount: number;
}
