import mongoose from 'mongoose';
import User from '../models/User';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || '');
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Migrate users without username
        try {
            const usersWithoutUsername = await User.find({ username: { $exists: false } });
            if (usersWithoutUsername.length > 0) {
                for (const u of usersWithoutUsername) {
                    if (u.email) {
                        u.username = u.email.split('@')[0];
                        await u.save();
                    } else {
                        u.username = 'user_' + u._id.toString().slice(-4);
                        await u.save();
                    }
                }
                console.log(`Migrated ${usersWithoutUsername.length} user accounts with default usernames.`);
            }
        } catch (e) {
            console.error('Database user migration warning:', e);
        }
    } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
