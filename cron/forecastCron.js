const cron = require("node-cron");
const Job = require("../models/job");

// Function to run automated forecasts
// const runAutomatedForecasts = async () => {
//   try {
//     console.log("Running automated forecasts...");

//     // Get products that need daily forecasting
//     // This would typically come from your database
//     // For demonstration, we'll use a placeholder implementation
//     const productsToForecast = await getProductsForDailyForecast();

//     for (const product of productsToForecast) {
//       try {
//         // Create a job record
//         const job = await Job.create({
//           type: "automated",
//           status: "processing",
//         });

//         // Format the historical data
//         const inputText = formatHistoricalData(product);

//         // Call the forecast API
//         await axios.post(
//           "http://localhost:" +
//             (process.env.PORT || 3000) +
//             "/api/forecast/automated",
//           {
//             inputText,
//             jobId: job._id,
//           }
//         );

//         console.log(`Automated forecast completed for product ${product.id}`);
//       } catch (error) {
//         console.error(`Error forecasting product ${product.id}:`, error);
//       }
//     }

//     console.log("Automated forecasting completed");
//   } catch (error) {
//     console.error("Error in automated forecasting cron job:", error);
//   }
// };

// Helper function to get products that need forecasting
// This is a placeholder - implement according to your data structure
async function getProductsForDailyForecast() {
  // In a real implementation, this would query your database
  // for products that need daily forecasting
  return [
    // Sample product data
    { id: "product1", name: "Sample Product 1", historicalData: [] },
    { id: "product2", name: "Sample Product 2", historicalData: [] },
  ];
}

// Helper function to format historical data for the forecast
function formatHistoricalData(product) {
  // In a real implementation, this would format the historical data
  // in a way that's suitable for the forecast API
  return `Product: ${product.name}\nHistorical data for the past 20 days:\nDay 1: 20 units\nDay 2: 22 units\nDay 3: 19 units\n...`;
}

// // Schedule the cron job to run daily at midnight
//  const scheduleCronJob = () => {
//   cron.schedule("0 0 * * *", runAutomatedForecasts);
//   console.log("Automated forecast cron job scheduled");
// };

// module.exports = {
//   scheduleCronJob,
// };
