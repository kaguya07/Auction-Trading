import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cron from "node-cron";
import Listing from "./models/listing.js";

import authRoutes from "./routes/auth.js";
import listingRoutes from "./routes/listings.js";
import auctionRoutes from "./routes/auctions.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ DB Connection Error:", err));

app.get("/", (req, res) => {
  res.send("Intelligent Auction Platform API is running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/auctions", auctionRoutes);

// Cron job to check for auction status changes every minute
cron.schedule('* * * * *', async () => {
  console.log('Running a check for auction status changes...');
  try {
    // Use UTC for all date comparisons to avoid timezone issues
    const now = new Date(new Date().toUTCString());
    
    // Start pending auctions
    const pendingAuctions = await Listing.find({ startTime: { $lte: now }, status: 'pending' });
    for (const auction of pendingAuctions) {
      auction.status = 'active';
      await auction.save();
      console.log(`Auction for "${auction.title}" has started.`);
    }

    // End active auctions
    const activeAuctions = await Listing.find({ endTime: { $lte: now }, status: 'active' });
    for (const auction of activeAuctions) {
      auction.status = 'ended';
      auction.winner = auction.highestBidder; // Set the winner
      await auction.save();
      console.log(`Auction for "${auction.title}" has ended. Winner: ${auction.winner}`);
    }
  } catch (error) {
    console.error('Error updating auction statuses:', error);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
