import mongoose from "mongoose";

const bidSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    bidder: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Bid", bidSchema);
