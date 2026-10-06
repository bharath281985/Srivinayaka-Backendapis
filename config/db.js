import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            console.error('Missing MongoDB connection string: set MONGODB_URI or MONGO_URI');
            process.exit(1);
        }

        const timeoutMs = Number(process.env.MONGODB_TIMEOUT_MS || 10000);
        const conn = await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: timeoutMs,
            connectTimeoutMS: timeoutMs,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
