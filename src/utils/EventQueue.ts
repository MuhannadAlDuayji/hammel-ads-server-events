import Event from "../types/event";
import EventSchema from "../models/EventSchema";

class EventQueue {
    private events: Event[];
    private timer: NodeJS.Timeout | null;

    constructor() {
        this.events = [];
        this.timer = null;
    }

    enqueue(event: Event) {
        this.events.push(event);
        console.log(this.events);
        this.startTimer();
    }

    private startTimer() {
        if (!this.timer) {
            this.timer = setInterval(() => this.saveEvents(), 60000); // Save events every 3 minutes
        }
    }

    private async saveEvents() {
        if (this.events.length === 0) {
            return;
        }

        const eventsToSave = this.events.slice();
        this.events = [];

        try {
            await EventSchema.insertMany(eventsToSave);
            console.log(`${eventsToSave.length} events saved to the database.`);
        } catch (error) {
            console.error("Error saving events:", error);
            this.events.unshift(...eventsToSave); // Put the unsaved events back to the front of the queue
        }
    }
}

export default new EventQueue();
