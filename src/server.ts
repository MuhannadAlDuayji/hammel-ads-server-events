import express, { Application } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import connection from "./services/db";
// import authRoutes from "./routes/auth";
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
// app.use("/api/auth", authRoutes);
// app.use("/api/users", userRoutes);
// app.use("/api/campaigns", campaignRoutes);
// app.use("/api/payments", paymentRoutes);
// app.use("/uploads", express.static("uploads"));

// port
const port: number = Number(process.env.PORT) || 3500;

// start server
app.listen(port, () => {
    console.log(`server started on port ${port}...`);
});
