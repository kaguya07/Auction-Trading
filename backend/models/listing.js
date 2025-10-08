import mongoose from "mongoose";

const listingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    startPrice: { type: Number, required: true },
    currentBid: { type: Number, default: function() { return this.startPrice; } },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    highestBidder: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    image: { type: String, required: true },
    status: { type: String, enum: ['pending', 'active', 'ended'], default: 'pending' },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Listing", listingSchema);
