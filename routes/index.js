const express = require("express");
const router = express.Router();
const forecastController = require("../controllers/forecastController");
const uploadMiddleware = require("../middleware/uploadMiddleware");

// Use Case 1: Manual CSV Upload Forecasting
router.post(
  "/forecast/csv",
  uploadMiddleware.single("file"),
  forecastController.processCsvForecast
);

// Use Case 2: Chatbot-Based Forecasting (Text Input)
router.post("/forecast/text", forecastController.processTextForecast);

// Use Case 3: Automated Daily Forecast via Cron
router.post("/forecast/automated", forecastController.processAutomatedForecast);

// Use Case 4: Inventory Data JSON Forecasting
router.post("/forecast/inventory", forecastController.processInventoryForecast);

module.exports = router;
