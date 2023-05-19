import mongoose from "mongoose";
import { LoadStatusId, LoadStatusName } from "./LoadStatus";
export default interface Load {
    _id: string;
    deviceId: string;
    placementId: string;
    loadStatusId: LoadStatusId;
    loadStatusName: LoadStatusName;
    campaignId: string;
    createdAt: Date;
}
