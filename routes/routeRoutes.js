const express = require("express");
const router = express.Router();

// Node 18+ has fetch built-in
// If below Node 18, install: npm install node-fetch
// const fetch = require("node-fetch");

router.get("/", async (req, res) => {
  const { origin, destination } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({
      error: "Origin and destination required",
    });
  }

  try {
    const googleUrl =
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${process.env.GOOGLE_KEY}`;

    const response = await fetch(googleUrl);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      return res.status(404).json({ error: "No route found" });
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    res.json({
      distanceKm: leg.distance.value / 1000,
      durationMin: leg.duration.value / 60,
      polyline: route.overview_polyline.points,
    });

  } catch (error) {
    console.error("Route error:", error);
    res.status(500).json({ error: "Route fetch failed" });
  }
});

module.exports = router;