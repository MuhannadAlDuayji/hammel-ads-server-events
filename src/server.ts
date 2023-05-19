import express, { Application } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import connection from "./services/db";
import eventRoutes from "./routes/events";
import loadRoutes from "./routes/loads";
import loadSchema from "./models/LoadSchema";

import cron from "node-cron";

// import userRoutes from "./routes/user";
// import campaignRoutes from "./routes/campaigns";
// import paymentRoutes from "./routes/payments";
import helmet from "helmet";
import CampaignSchema from "./models/CampaignSchema";
import { LoadStatusId, LoadStatusName } from "./types/load/LoadStatus";

require("dotenv").config();

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

cron.schedule("0 * * * *", async () => {
    try {
        const filter = {
            loadStatusId: LoadStatusId.PENDING,
            createdAt: { $lt: new Date(Date.now() - 36 * 60 * 60 * 1000) },
        };
        const update = {
            $set: {
                loadStatusId: LoadStatusId.UNVALID,
                loadStatusName: LoadStatusName.UNVALID,
            },
        };

        const result = await loadSchema.updateMany(filter, update);

        console.log(`${result.modifiedCount} loads updated to "unvalid".`);
    } catch (error) {
        console.error(error);
    }
});

// start server
app.listen(port, () => {
    console.log(`server started on port ${port}...`);
});
