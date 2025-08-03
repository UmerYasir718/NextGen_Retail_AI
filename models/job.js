const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    forecastText: {
      type: String,
      required: false,
    },
    forecastCsvUrl: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    type: {
      type: String,
      enum: ["csv", "text", "automated", "inventory"],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Job = mongoose.model("Job", jobSchema);

module.exports = Job;
