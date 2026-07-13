"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const connectDB = async () => {
    try {
        const conn = await mongoose_1.default.connect(process.env.MONGO_URI || '');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        // Migrate users without username
        try {
            const usersWithoutUsername = await User_1.default.find({ username: { $exists: false } });
            if (usersWithoutUsername.length > 0) {
                for (const u of usersWithoutUsername) {
                    if (u.email) {
                        u.username = u.email.split('@')[0];
                        await u.save();
                    }
                    else {
                        u.username = 'user_' + u._id.toString().slice(-4);
                        await u.save();
                    }
                }
                console.log(`Migrated ${usersWithoutUsername.length} user accounts with default usernames.`);
            }
        }
        catch (e) {
            console.error('Database user migration warning:', e);
        }
    }
    catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};
exports.default = connectDB;
