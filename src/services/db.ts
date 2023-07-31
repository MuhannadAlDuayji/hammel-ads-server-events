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
    const uri = process.env.URI_STRING || "";

    const client = new MongoClient(uri);

    try {
        await client.connect();

        const db = client.db();
        const timeSeriesCollection = db.collection("eventsTimeSeries");

        if (!timeSeriesCollection) {
            await db.createCollection("eventsTimeSeries", {
                timeseries: {
                    timeField: "createdAt",
                    //   metaField: 'tags',
                },
            });
        }

        console.log("Time series collection created");
    } catch (error) {
        console.error("Error creating time series collection", error);
    } finally {
        // Close the database connection in the 'finally' block to ensure it is always closed
        await client.close();
    }
}

async function insertTimeSeriesData(data: any[]) {
    const uri = process.env.URI_STRING || "";

    const client = new MongoClient(uri);

    try {
        await client.connect();

        const db = client.db();
        const timeSeriesCollection = db.collection("eventsTimeSeries");

        await timeSeriesCollection.insertMany(data);

        console.log("Time series data inserted");
    } catch (error) {
        console.error("Error inserting time series data", error);
    } finally {
        // Close the database connection in the 'finally' block to ensure it is always closed
        await client.close();
    }
}

export { connection, createTimeSeriesCollection, insertTimeSeriesData };
