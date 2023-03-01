import mongoose from "mongoose";
import { LoadStatus } from "./LoadStatus";
export default interface Load {
    deviceID: string;
    placementID: string;
    status: LoadStatus;
    createdAt: Date;
}
