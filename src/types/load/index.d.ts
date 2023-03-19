import mongoose from "mongoose";
import { LoadStatus } from "./LoadStatus";
export default interface Load {
    id: string;
    deviceId: string;
    placementId: string;
    status: LoadStatus;
    createdAt: Date;
}
