import mongoose from "mongoose";
import { MongoClient } from "mongodb";

console.log(process.env.URI_STRING);
const connection = () => {
    try {
        mongoose.set("strictQuery", false);
        mongoose.connect(process.env.URI_STRING || "");

        console.log("connected");
    } catch (err) {
        console.error(err);
    }
};

async function createTimeSeriesCollection() {
    try {
        const client = new MongoClient(process.env.URI_STRING || "");
        const db = client.db();
        await db.createCollection("eventsTimeSeries", {
            timeseries: {
                timeField: "createdAt",
                //   metaField: 'tags',
            },
        });
        console.log("Time series collection created");
    } catch (error) {
        console.error("Error creating time series collection", error);
    }
}

async function insertTimeSeriesData(data: any[]) {
    try {
        const client = new MongoClient(process.env.URI_STRING || "");
        const db = client.db();
        const timeSeriesCollection = db.collection("eventsTimeSeries");

        await timeSeriesCollection.insertMany(data);
        console.log("Time series data inserted");
    } catch (error) {
        console.error("Error inserting time series data", error);
    }
}

export { connection, createTimeSeriesCollection, insertTimeSeriesData };
