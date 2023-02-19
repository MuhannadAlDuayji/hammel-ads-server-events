import express, { Application } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import connection from "./services/db";
import eventRoutes from "./routes/events";
// import userRoutes from "./routes/user";
// import campaignRoutes from "./routes/campaigns";
// import paymentRoutes from "./routes/payments";
import helmet from "helmet";
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
app.use("/api/events", eventRoutes);

// port
const port: number = Number(process.env.PORT) || 3501;

// start server
app.listen(port, () => {
    console.log(`server started on port ${port}...`);
});
