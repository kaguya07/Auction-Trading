import express from "express";
import Bid from "../models/bid.js";
import Listing from "../models/listing.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Place a bid on a listing
router.post("/:listingId/bids", auth, async (req, res) => {
  try {
    const { listingId } = req.params;
    const { amount } = req.body;
    const bidderId = req.user.id;

    const listing = await Listing.findById(listingId);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({ message: "This auction is not active." });
    }

    // Prevent user from bidding on their own listing
    if (listing.seller.toString() === bidderId) {
      return res.status(403).json({ message: "You cannot bid on your own listing" });
    }

    if (amount <= listing.currentBid) {
      return res.status(400).json({ message: "Your bid must be higher than the current bid" });
    }

    const newBid = new Bid({
      amount,
      bidder: bidderId,
      listing: listingId,
    });

    await newBid.save();

    listing.currentBid = amount;
    listing.highestBidder = bidderId;
    await listing.save();

    res.status(201).json({ message: "Bid placed successfully", listing });
  } catch (err) {
    console.error("Bidding Error:", err);
    res.status(500).json({ message: "Server error while placing bid" });
  }
});

export default router;
