const axios = require("axios");

// Test data matching your specification
const testInventoryData = [
  {
    name: "Laptop Dell XPS 13",
    sku: "DELL-XPS-001",
    tagId: "TAG001",
    description: "High-performance laptop for professionals",
    category: "Electronics",
    quantity: 25,
    threshold: 5,
    warehouseId: "WH001",
    zoneId: "ZONE-A",
    shelfId: "SHELF-01",
    binId: "BIN-A1",
    status: "Available",
    inventoryStatus: "sale",
    costPrice: 899.99,
    retailPrice: 1299.99,
  },
  {
    name: "iPhone 14 Pro",
    sku: "APPLE-IPHONE-001",
    tagId: "TAG002",
    description: "Latest iPhone with advanced camera system",
    category: "Electronics",
    quantity: 15,
    threshold: 3,
    warehouseId: "WH001",
    zoneId: "ZONE-A",
    shelfId: "SHELF-01",
    binId: "BIN-A2",
    status: "Available",
    inventoryStatus: "sale",
    costPrice: 799.99,
    retailPrice: 1099.99,
  },
  {
    name: "Wireless Mouse",
    sku: "LOGITECH-MOUSE-001",
    tagId: "TAG003",
    description: "Ergonomic wireless mouse",
    category: "Accessories",
    quantity: 50,
    threshold: 10,
    warehouseId: "WH001",
    zoneId: "ZONE-B",
    shelfId: "SHELF-02",
    binId: "BIN-B1",
    status: "Available",
    inventoryStatus: "sale",
    costPrice: 19.99,
    retailPrice: 29.99,
  },
  {
    name: "Mechanical Keyboard",
    sku: "RAZER-KB-001",
    tagId: "TAG004",
    description: "Gaming mechanical keyboard with RGB",
    category: "Accessories",
    quantity: 30,
    threshold: 5,
    warehouseId: "WH001",
    zoneId: "ZONE-B",
    shelfId: "SHELF-02",
    binId: "BIN-B2",
    status: "Available",
    inventoryStatus: "sale",
    costPrice: 89.99,
    retailPrice: 129.99,
  },
  {
    name: 'Monitor 27" 4K',
    sku: "SAMSUNG-MON-001",
    tagId: "TAG005",
    description: "Ultra HD monitor for professional use",
    category: "Electronics",
    quantity: 10,
    threshold: 2,
    warehouseId: "WH001",
    zoneId: "ZONE-A",
    shelfId: "SHELF-03",
    binId: "BIN-A3",
    status: "Available",
    inventoryStatus: "sale",
    costPrice: 299.99,
    retailPrice: 399.99,
  },
];

async function testInventoryEndpoint() {
  try {
    console.log("Testing inventory forecast endpoint...");

    const response = await axios.post(
      "http://localhost:3000/api/forecast/inventory",
      {
        inventoryData: testInventoryData,
        jobId: `test-${Date.now()}`,
      }
    );

    console.log("✅ Success!");
    console.log("Response status:", response.status);
    console.log("Status:", response.data.status);
    console.log("Message:", response.data.message);
    console.log("Model:", response.data.model);
    console.log("Confidence:", response.data.confidence);
    console.log("Timestamp:", response.data.timestamp);

    console.log("\n📊 Forecast Data Structure:");
    console.log(
      "├── Sales Forecast:",
      response.data.data.salesForecast ? "✅" : "❌"
    );
    console.log(
      "├── Inventory Forecast:",
      response.data.data.inventoryForecast ? "✅" : "❌"
    );
    console.log(
      "├── Demand Forecast:",
      response.data.data.demandForecast ? "✅" : "❌"
    );
    console.log(
      "├── Product Forecast:",
      response.data.data.productForecast ? "✅" : "❌"
    );
    console.log(
      "└── Category Forecast:",
      response.data.data.categoryForecast ? "✅" : "❌"
    );

    console.log("\n📈 Sample Data:");
    if (response.data.data.salesForecast) {
      console.log(
        "Sales Forecast (Monthly 2024):",
        response.data.data.salesForecast.monthly["2024"].slice(0, 3)
      );
    }

    if (response.data.data.productForecast) {
      console.log(
        "Product Forecast (First 2 items):",
        response.data.data.productForecast.data.slice(0, 2)
      );
    }

    if (response.data.data.categoryForecast) {
      console.log("Category Forecast:", {
        labels: response.data.data.categoryForecast.labels,
        values: response.data.data.categoryForecast.values,
      });
    }

    console.log("\n🔧 Metadata:");
    console.log(
      "Training Data Points:",
      response.data.metadata.trainingDataPoints
    );
    console.log(
      "Prediction Horizon:",
      response.data.metadata.predictionHorizon
    );
    console.log("Algorithm:", response.data.metadata.algorithm);
    console.log("Accuracy:", response.data.metadata.accuracy);
    console.log("Processed Items:", response.data.metadata.processedItems);

    console.log("\n📄 CSV URL:", response.data.forecastCsvUrl || "None");
  } catch (error) {
    console.error("❌ Error testing inventory endpoint:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Error:", error.message);
    }
  }
}

// Run the test
testInventoryEndpoint();
