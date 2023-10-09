import express, { Application } from "express";
require("dotenv").config();
import cors from "cors";
import bodyParser from "body-parser";
import { connection, createTimeSeriesCollection } from "./services/db";
import eventRoutes from "./routes/events";
import loadRoutes from "./routes/loads";
import LoadSchema from "./models/LoadSchema";
import EventSchema from "./models/EventSchema";

import cron from "node-cron";

import helmet from "helmet";
import Campaign from "./models/CampaignSchema";
import { LoadStatusId } from "./types/load/LoadStatus";

const app: Application = express();

// database connection
connection();

// middlewares
app.use(bodyParser.json());
app.use(express.json());
app.use(cors());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.disable("x-powered-by");

// routes
app.use("/events/v1/event", eventRoutes);
app.use("/events/v1/load", loadRoutes);

const port: number = Number(process.env.PORT) || 3501;

cron.schedule("* * * * *", async () => {
    try {
        // const filter = {
        //     loadStatusId: LoadStatusId.PENDING,
        //     createdAt: { $lt: new Date(Date.now() - 36 * 60 * 60 * 1000) },
        // };
        // const update = {
        //     $set: {
        //         loadStatusId: LoadStatusId.UNVALID,
        //         loadStatusName: LoadStatusName.UNVALID,
        //     },
        // };

        // const result = await LoadSchema.updateMany(filter, update);

        // console.log(`${result.modifiedCount} loads updated to "unvalid".`);

        // const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const twentyfourhoursago = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const campaigns = await Campaign.find();
        for (const campaign of campaigns) {
            const resultLoad = await LoadSchema.deleteMany({
                createdAt: { $lte: twentyfourhoursago },
                loadStatusId: LoadStatusId.PENDING,
                campaignId: campaign._id,
            });

            const newPendingCount =
                campaign.pendingCount - resultLoad.deletedCount;

            campaign.pendingCount = newPendingCount;

            await campaign.save();
        }

        await EventSchema.deleteMany({
            createdAt: { $lte: twentyfourhoursago },
        });

        // console.log(`${resultEvent.deletedCount} events deleted.`);
    } catch (error) {
        console.error(error);
    }
});

// start server
app.listen(port, async () => {
    await createTimeSeriesCollection();
    console.log(`server started on port ${port}...`);
});
