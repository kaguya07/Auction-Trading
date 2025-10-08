import express from "express";
import Listing from "../models/listing.js";
import auth from '../middleware/auth.js';

const router = express.Router();

// Get all listings
router.get("/", async (req, res) => {
  try {
    const listings = await Listing.find()
      .populate("seller", "name")
      .populate("highestBidder", "name")
      .populate("winner", "name");
    
    // Custom sort logic to prioritize active auctions
    const statusOrder = { 'active': 1, 'pending': 2, 'ended': 3 };
    listings.sort((a, b) => {
        const orderA = statusOrder[a.status] || 4;
        const orderB = statusOrder[b.status] || 4;
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        // If status is the same, sort by creation date descending
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new listing
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, startPrice, startTime, endTime, image } = req.body;
    
    const newListing = new Listing({
      title,
      description,
      startPrice,
      startTime,
      endTime,
      image,
      seller: req.user.id, 
    });

    const savedListing = await newListing.save();
    res.status(201).json(savedListing);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get a single listing
router.get("/:id", async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate("seller", "name")
      .populate("highestBidder", "name")
      .populate("winner", "name");
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a listing
router.put("/:id", auth, async (req, res) => {
  try {
    const { title, description, startPrice, startTime, endTime } = req.body;
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to edit this listing" });
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      { title, description, startPrice, startTime, endTime },
      { new: true }
    );

    res.json(updatedListing);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a listing
router.delete("/:id", auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Ensure the user owns the listing
    if (listing.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to delete this listing" });
    }

    await Listing.findByIdAndDelete(req.params.id);

    res.json({ message: "Listing deleted successfully" });
  } catch (err) {
    console.error("Delete Listing Error:", err);
    res.status(500).json({ message: "Server error while deleting the listing" });
  }
});

export default router;
