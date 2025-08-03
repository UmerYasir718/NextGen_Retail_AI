require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const routes = require("./routes");
const { scheduleCronJob } = require("./cron/forecastCron");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB (if needed)
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));
}

// Routes
app.use("/api", routes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "windsurf-ai-forecasting" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Windsurf AI Forecasting service running on port ${PORT}`);

  // Initialize cron job for automated forecasts
  scheduleCronJob();
  console.log("Automated forecast cron job scheduled");
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Implement proper error logging here
});

module.exports = app;
