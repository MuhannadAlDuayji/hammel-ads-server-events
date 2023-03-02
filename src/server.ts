import express, { Application } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import connection from "./services/db";
import eventRoutes from "./routes/events";
import loadRoutes from "./routes/loads";
import cron from "node-cron";

// import userRoutes from "./routes/user";
// import campaignRoutes from "./routes/campaigns";
// import paymentRoutes from "./routes/payments";
import helmet from "helmet";
import CampaignSchema from "./models/CampaignSchema";
import { LoadStatus } from "./types/load/LoadStatus";
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
app.use("/api/event", eventRoutes);
app.use("/api/load", loadRoutes);

// port
const port: number = Number(process.env.PORT) || 3501;

cron.schedule("0 * * * *", async () => {
    try {
        console.log("cron job");

        // Get all campaigns from the database
        const campaigns = await CampaignSchema.find();

        // Loop through all campaigns and their loads
        for (const campaign of campaigns) {
            for (const load of campaign.loads) {
                // Check if the load is pending and has been pending for more than 36 hours
                if (
                    load.status === LoadStatus.PENDING &&
                    Date.now() - load.createdAt.getTime() > 36 * 60 * 60 * 1000
                ) {
                    // Update the load status to unvalid
                    load.status = LoadStatus.UNVALID;
                    campaign.markModified("loads"); // Mark the campaign as modified
                }
            }

            // Save the updated campaign to the database
            await campaign.save();
        }
    } catch (error) {
        console.error(error);
    }
});

// start server
app.listen(port, () => {
    console.log(`server started on port ${port}...`);
});
