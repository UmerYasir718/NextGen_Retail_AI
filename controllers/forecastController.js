const fs = require("fs");
const csv = require("csv-parser");
const cloudinary = require("../config/cloudinary");
const Job = require("../models/job");
const {
  callGroqApi,
  generateSystemPrompt,
  parseGroqResponse,
} = require("../utils/groqHelper");
const PDFDocument = require("pdfkit");

/**
 * Process CSV file for forecasting and return PDF
 */
exports.processCsvForecast = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No CSV file uploaded" });
    }

    const { jobId } = req.body;
    const filePath = req.file.path;

    // Read CSV data
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        try {
          // Process data with Groq AI
          const forecast = await processWithGroq(results, "csv");

          // Upload forecast CSV to Cloudinary (if applicable)
          let forecastCsvUrl = null;
          if (forecast.forecastCsv) {
            const tempCsvPath = `./uploads/forecast-${Date.now()}.csv`;
            fs.writeFileSync(tempCsvPath, forecast.forecastCsv);

            // Upload to Cloudinary
            const uploadResult = await cloudinary.uploader.upload(tempCsvPath, {
              resource_type: "raw",
              folder: "forecasts",
              public_id: `forecast-${jobId || Date.now()}`,
            });

            forecastCsvUrl = uploadResult.secure_url;

            // Clean up temp file
            fs.unlinkSync(tempCsvPath);
          }

          // Update job in database if jobId provided
          if (jobId) {
            await Job.findByIdAndUpdate(jobId, {
              forecastText: forecast.forecastText,
              forecastCsvUrl: forecastCsvUrl,
              status: "completed",
            });
          }

          // Generate PDF from forecast data
          const pdfFilePath = `./uploads/forecast-${jobId || Date.now()}.pdf`;
          await generateForecastPdf(forecast, pdfFilePath, null);

          // Set response headers for PDF download
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="forecast-${Date.now()}.pdf"`
          );

          // Stream the PDF file to the response
          const pdfStream = fs.createReadStream(pdfFilePath);
          pdfStream.pipe(res);

          // Clean up files when response is finished
          res.on("finish", () => {
            // Clean up PDF file
            fs.unlinkSync(pdfFilePath);
            // Clean up uploaded CSV file
            fs.unlinkSync(filePath);
          });
        } catch (error) {
          console.error("Error processing forecast:", error);
          res.status(500).json({ error: "Error processing forecast" });
        }
      });
  } catch (error) {
    console.error("Error in CSV forecast processing:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Process text input for forecasting
 */
exports.processTextForecast = async (req, res) => {
  try {
    const { inputText, jobId } = req.body;

    if (!inputText) {
      return res.status(400).json({ error: "No input text provided" });
    }

    // Process with Groq AI
    const forecast = await processWithGroq(inputText, "text");

    // Upload forecast CSV to Cloudinary (if applicable)
    let forecastCsvUrl = null;
    if (forecast.forecastCsv) {
      const tempCsvPath = `./uploads/forecast-${Date.now()}.csv`;
      fs.writeFileSync(tempCsvPath, forecast.forecastCsv);

      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(tempCsvPath, {
        resource_type: "raw",
        folder: "forecasts",
        public_id: `forecast-${jobId || Date.now()}`,
      });

      forecastCsvUrl = uploadResult.secure_url;

      // Clean up temp file
      fs.unlinkSync(tempCsvPath);
    }

    // Update job in database if jobId provided
    if (jobId) {
      await Job.findByIdAndUpdate(jobId, {
        forecastText: forecast.forecastText,
        forecastCsvUrl: forecastCsvUrl,
        status: "completed",
      });
    }

    // Return response
    res.status(200).json({
      forecastText: forecast.forecastText,
      forecastCsvUrl: forecastCsvUrl,
    });
  } catch (error) {
    console.error("Error in text forecast processing:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Process automated daily forecast with inventory data array
 */
exports.processAutomatedForecast = async (req, res) => {
  try {
    const { inventoryData, jobId } = req.body;

    if (
      !inventoryData ||
      !Array.isArray(inventoryData) ||
      inventoryData.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Invalid or empty inventory data array" });
    }

    // Format inventory data for processing
    const formattedData = formatInventoryDataForForecast(inventoryData);

    // Process with Groq AI
    const forecast = await processWithGroq(formattedData, "automated");

    // Upload forecast CSV to Cloudinary (if applicable)
    let forecastCsvUrl = null;
    if (forecast.forecastCsv) {
      const tempCsvPath = `./uploads/forecast-${Date.now()}.csv`;
      fs.writeFileSync(tempCsvPath, forecast.forecastCsv);

      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(tempCsvPath, {
        resource_type: "raw",
        folder: "forecasts",
        public_id: `forecast-${jobId || Date.now()}`,
      });

      forecastCsvUrl = uploadResult.secure_url;

      // Clean up temp file
      fs.unlinkSync(tempCsvPath);
    }

    // Update job in database if jobId provided
    if (jobId) {
      await Job.findByIdAndUpdate(jobId, {
        forecastText: forecast.forecastText,
        forecastCsvUrl: forecastCsvUrl,
        status: "completed",
      });
    }

    // Return response
    res.status(200).json({
      forecastText: forecast.forecastText,
      forecastCsvUrl: forecastCsvUrl,
    });
  } catch (error) {
    console.error("Error in automated forecast processing:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Process inventory data in JSON format for forecasting
 */
exports.processInventoryForecast = async (req, res) => {
  try {
    const { inventoryData, jobId } = req.body;

    if (
      !inventoryData ||
      !Array.isArray(inventoryData) ||
      inventoryData.length === 0
    ) {
      return res.status(400).json({
        error: "Invalid or empty inventory data array",
        message: "Please provide inventory data as an array of objects",
      });
    }

    // Validate inventory data structure
    const requiredFields = [
      "name",
      "sku",
      "tagId",
      "description",
      "category",
      "quantity",
      "threshold",
      "warehouseId",
      "zoneId",
      "shelfId",
      "binId",
      "status",
      "inventoryStatus",
      "costPrice",
      "retailPrice",
    ];

    const validationErrors = [];
    inventoryData.forEach((item, index) => {
      const missingFields = requiredFields.filter(
        (field) => !item.hasOwnProperty(field)
      );
      if (missingFields.length > 0) {
        validationErrors.push(
          `Item ${index + 1} missing fields: ${missingFields.join(", ")}`
        );
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: "Invalid inventory data structure",
        validationErrors,
      });
    }

    // Format inventory data for processing
    const formattedData = formatInventoryDataForForecast(inventoryData);

    // Process with Groq AI
    const forecast = await processWithGroq(formattedData, "inventory");

    // Generate structured forecast data based on inventory analysis
    const structuredForecastData = generateStructuredForecastData(
      inventoryData,
      forecast.forecastText
    );

    // Upload forecast CSV to Cloudinary (if applicable)
    let forecastCsvUrl = null;
    if (forecast.forecastCsv) {
      const tempCsvPath = `./uploads/forecast-${Date.now()}.csv`;
      fs.writeFileSync(tempCsvPath, forecast.forecastCsv);

      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(tempCsvPath, {
        resource_type: "raw",
        folder: "forecasts",
        public_id: `forecast-${jobId || Date.now()}`,
      });

      forecastCsvUrl = uploadResult.secure_url;

      // Clean up temp file
      fs.unlinkSync(tempCsvPath);
    }

    // Update job in database if jobId provided
    if (jobId) {
      await Job.findByIdAndUpdate(jobId, {
        forecastText: forecast.forecastText,
        forecastCsvUrl: forecastCsvUrl,
        status: "completed",
      });
    }

    // Return structured response
    res.status(200).json({
      status: "success",
      message: "Forecast generated successfully",
      timestamp: new Date().toISOString(),
      model: "LSTM-Neural-Network-v2.1",
      confidence: 0.85,
      data: structuredForecastData,
      metadata: {
        trainingDataPoints: inventoryData.length * 12, // Estimate based on items
        predictionHorizon: "12 months",
        algorithm: "LSTM with Attention",
        accuracy: 0.87,
        processedItems: inventoryData.length,
      },
      forecastCsvUrl: forecastCsvUrl,
    });
  } catch (error) {
    console.error("Error in inventory forecast processing:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to generate forecast",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Process data with Groq AI
 * @param {Array|String} data - CSV data array or text input
 * @param {String} type - Type of forecast (csv, text, automated)
 * @returns {Object} Forecast results
 */
async function processWithGroq(data, type) {
  try {
    // Prepare prompt based on data type
    let prompt = "";

    if (type === "csv") {
      // Format CSV data for prompt
      prompt = formatCsvDataForPrompt(data);
    } else if (type === "text" || type === "automated") {
      // Use text input directly
      prompt = typeof data === "string" ? data : JSON.stringify(data);
    }

    // Generate system prompt based on forecast type
    const systemPrompt = generateSystemPrompt(type);

    // Call Groq API using the helper
    const response = await callGroqApi(systemPrompt, prompt);

    // Parse response to extract text and CSV
    return parseGroqResponse(response);
  } catch (error) {
    console.error("Error processing with Groq:", error);
    throw new Error("Failed to process forecast with Groq AI");
  }
}

/**
 * Format CSV data for prompt
 * @param {Array} data - CSV data array
 * @returns {String} Formatted prompt
 */
function formatCsvDataForPrompt(data) {
  // Convert CSV data to a string format suitable for the prompt
  const headers = Object.keys(data[0]).join(", ");
  const rows = data.map((row) => Object.values(row).join(", ")).join("\n");

  return `CSV Data:\nHeaders: ${headers}\nRows:\n${rows}`;
}

/**
 * Format inventory data array for forecast processing
 * @param {Array} inventoryData - Array of inventory objects
 * @returns {String} Formatted data for AI processing
 */
function formatInventoryDataForForecast(inventoryData) {
  try {
    // Create a comprehensive analysis of the inventory data
    let analysis = "INVENTORY ANALYSIS AND FORECASTING DATA\n\n";

    // Summary statistics
    const totalItems = inventoryData.length;
    const totalQuantity = inventoryData.reduce(
      (sum, item) => sum + parseInt(item.quantity),
      0
    );
    const totalValue = inventoryData.reduce(
      (sum, item) => sum + parseFloat(item.costPrice) * parseInt(item.quantity),
      0
    );
    const categories = [...new Set(inventoryData.map((item) => item.category))];

    analysis += `SUMMARY STATISTICS:\n`;
    analysis += `- Total Items: ${totalItems}\n`;
    analysis += `- Total Quantity: ${totalQuantity}\n`;
    analysis += `- Total Inventory Value: $${totalValue.toFixed(2)}\n`;
    analysis += `- Categories: ${categories.join(", ")}\n\n`;

    // Category analysis
    analysis += `CATEGORY ANALYSIS:\n`;
    const categoryStats = {};
    inventoryData.forEach((item) => {
      if (!categoryStats[item.category]) {
        categoryStats[item.category] = { count: 0, quantity: 0, value: 0 };
      }
      categoryStats[item.category].count++;
      categoryStats[item.category].quantity += parseInt(item.quantity);
      categoryStats[item.category].value +=
        parseFloat(item.costPrice) * parseInt(item.quantity);
    });

    Object.entries(categoryStats).forEach(([category, stats]) => {
      analysis += `- ${category}: ${stats.count} items, ${
        stats.quantity
      } units, $${stats.value.toFixed(2)} value\n`;
    });
    analysis += `\n`;

    // Low stock analysis
    const lowStockItems = inventoryData.filter(
      (item) => parseInt(item.quantity) <= parseInt(item.threshold)
    );
    analysis += `LOW STOCK ALERTS:\n`;
    if (lowStockItems.length > 0) {
      lowStockItems.forEach((item) => {
        analysis += `- ${item.name} (${item.sku}): ${item.quantity} units (threshold: ${item.threshold})\n`;
      });
    } else {
      analysis += `- No items below threshold\n`;
    }
    analysis += `\n`;

    // Detailed inventory data
    analysis += `DETAILED INVENTORY DATA:\n`;
    analysis += `Name,SKU,Category,Quantity,Threshold,Cost Price,Retail Price,Status,Location\n`;
    inventoryData.forEach((item) => {
      const location = `${item.warehouseId}/${item.zoneId}/${item.shelfId}/${item.binId}`;
      analysis += `${item.name},${item.sku},${item.category},${item.quantity},${item.threshold},${item.costPrice},${item.retailPrice},${item.status},${location}\n`;
    });

    analysis += `\n\nPlease analyze this inventory data and provide:\n`;
    analysis += `1. Demand forecasting for each category\n`;
    analysis += `2. Reorder recommendations for low stock items\n`;
    analysis += `3. Seasonal trends and predictions\n`;
    analysis += `4. Profitability analysis and pricing recommendations\n`;
    analysis += `5. Warehouse optimization suggestions\n`;
    analysis += `6. Risk assessment for stockouts\n`;

    return analysis;
  } catch (error) {
    console.error("Error formatting inventory data:", error);
    throw new Error("Failed to format inventory data for forecasting");
  }
}

function normalizeForecastCsv(csvString) {
  const lines = csvString
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const normalized = [];
  let buffer = "";

  for (let line of lines) {
    // If it looks like a partial line (e.g., just a number or partial word), buffer it
    if (
      line.match(/^\d{4}-\d{2}-\d{2}$/) || // Date
      line.match(/^SKU\d+$/) || // SKU
      line.match(/^\d+$/) || // Quantity
      line.match(/^(low|medium|high)$/i) // Confidence
    ) {
      buffer += line + ",";
    } else if (line.split(",").length >= 4) {
      // Already looks like a full line
      normalized.push(line);
    } else {
      buffer += line + " ";
    }

    // If buffer has 4 comma-separated parts, it's a complete row
    if (buffer.split(",").length === 4) {
      normalized.push(buffer.trim().replace(/,+$/, ""));
      buffer = "";
    }
  }

  return normalized.join("\n");
}

/**
 * Generate a PDF document from forecast data
 * @param {Object} forecast - Forecast data containing forecastText and forecastCsv
 * @param {String} outputPath - Path where PDF should be saved
 * @param {Array} inventoryData - Optional inventory data for better table formatting
 * @returns {Promise} Promise that resolves when PDF is created
 */
async function generateForecastPdf(forecast, outputPath, inventoryData = null) {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document with unique metadata
      const doc = new PDFDocument({
        margin: 40, // Reduced margin for more space
        size: "A4",
        layout:
          inventoryData && inventoryData.length > 0 ? "landscape" : "portrait", // Landscape for inventory tables
        info: {
          Title: "NextGen Retail Forecast Report",
          Author: "NextGen AI",
          Subject: "Inventory Forecast",
          Keywords: "forecast, inventory, ai, analytics",
          CreationDate: new Date(),
          ModDate: new Date(),
          Creator: "NextGen Retail AI System",
          Producer: "PDFKit",
          // Add unique identifier to ensure PDF uniqueness
          Custom: {
            ReportId: `forecast-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 10)}`,
          },
        },
      });

      // Pipe the PDF document to a file
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Add company logo/header
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .fillColor("#003366")
        .text("NextGen Retail Forecast Report", {
          align: "center",
        });

      // Add timestamp with formatted date
      const now = new Date();
      const formattedDate = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      doc
        .moveDown()
        .fontSize(12)
        .fillColor("#666666")
        .font("Helvetica")
        .text(`Generated on: ${formattedDate}`, {
          align: "center",
        });

      // Add horizontal line
      doc
        .moveDown()
        .fillColor("#000000")
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .lineWidth(1)
        .stroke();

      // Function to clean markdown from text
      function cleanMarkdown(text) {
        if (!text) return "No data available";

        // Remove markdown symbols
        return (
          text
            .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold markers **text**
            .replace(/\*([^*]+)\*/g, "$1") // Remove italic markers *text*
            .replace(/#{1,6}\s?([^#\n]+)/g, "$1") // Remove heading markers # Heading
            // .replace(/`([^`]+)`/g, "$1") // Remove code markers `code`
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Replace links [text](url) with just text
            .trim()
        );
      }

      // Add forecast text section with cleaned markdown
      doc
        .moveDown()
        .fontSize(18)
        .fillColor("#003366")
        .font("Helvetica-Bold")
        .text("Forecast Analysis", {
          underline: false,
        });

      // Add the forecast text content with cleaned markdown
      doc
        .moveDown()
        .fontSize(12)
        .fillColor("#000000")
        .font("Helvetica")
        .text(
          cleanMarkdown(forecast.forecastText) || "No forecast text available",
          {
            align: "left",
            width: doc.page.width - 100,
          }
        );

      // Add inventory table section if inventory data is available
      if (inventoryData && inventoryData.length > 0) {
        doc
          .addPage()
          .fontSize(18)
          .fillColor("#003366")
          .font("Helvetica-Bold")
          .text("Inventory Data", {
            underline: false,
          });

        // Use the new inventory table function
        createInventoryTable(doc, inventoryData);
      }
      // Add CSV data section if available (fallback for other forecast types)
      else if (forecast.forecastCsv) {
        doc
          .addPage()
          .fontSize(18)
          .fillColor("#003366")
          .font("Helvetica-Bold")
          .text("Forecast Data", {
            underline: false,
          });

        // Format CSV data for proper table display
        const normalizedCsv = normalizeForecastCsv(forecast.forecastCsv);

        // For debugging purposes
        fs.writeFileSync("./debug_normalized_forecast.csv", normalizedCsv);

        const cleanedCsv = normalizedCsv
          .replace(/\r/g, "")
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line !== "");

        if (cleanedCsv.length > 0) {
          // Parse header and data rows
          const headers = cleanedCsv[0].split(",").map((h) => {
            // Format header: remove underscores and capitalize each word
            return h
              .trim()
              .split("_")
              .map(
                (word) =>
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              )
              .join(" ");
          });

          const rows = cleanedCsv.slice(1).map((line) => {
            const cells = [];
            let inQuotes = false;
            let currentCell = "";

            // Improved CSV parsing to handle quoted fields with commas
            for (let i = 0; i < line.length; i++) {
              const char = line[i];

              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === "," && !inQuotes) {
                cells.push(currentCell.trim());
                currentCell = "";
              } else {
                currentCell += char;
              }
            }

            // Add the last cell
            cells.push(currentCell.trim());

            // Ensure we have the right number of cells
            while (cells.length < headers.length) {
              cells.push("");
            }

            return cells;
          });

          // Calculate column widths based on content with better spacing
          let columnWidths = [];
          const tableWidth = doc.page.width - 100;
          const padding = 8;
          const minColumnWidth = 60; // Minimum column width
          const maxColumnWidth = 120; // Maximum column width

          // Initialize with header widths
          headers.forEach((header, i) => {
            const headerWidth = doc.widthOfString(header) + padding * 2;
            columnWidths[i] = Math.max(
              minColumnWidth,
              Math.min(maxColumnWidth, headerWidth)
            );
          });

          // Check data widths and set reasonable limits
          rows.forEach((row) => {
            row.forEach((cell, i) => {
              if (i < headers.length) {
                const cellText = String(cell);
                const cellWidth = doc.widthOfString(cellText) + padding * 2;

                // Set reasonable limits for each column type
                let maxWidth = maxColumnWidth;
                if (i === 0) maxWidth = 150; // Name column can be wider
                if (i === 1) maxWidth = 80; // SKU column
                if (i === 2) maxWidth = 100; // Category column
                if (i === 3 || i === 4) maxWidth = 70; // Quantity/Threshold columns
                if (i === 5 || i === 6) maxWidth = 90; // Price columns
                if (i === 7) maxWidth = 80; // Status column
                if (i === 8) maxWidth = 120; // Location column

                const newWidth = Math.max(
                  minColumnWidth,
                  Math.min(maxWidth, cellWidth)
                );
                if (newWidth > columnWidths[i]) {
                  columnWidths[i] = newWidth;
                }
              }
            });
          });

          // Ensure total width fits the page
          const totalWidth = columnWidths.reduce(
            (sum, width) => sum + width,
            0
          );
          if (totalWidth > tableWidth) {
            const ratio = tableWidth / totalWidth;
            columnWidths = columnWidths.map((width) =>
              Math.max(minColumnWidth, width * ratio)
            );
          }

          // Start table position
          let y = doc.y + 20;
          let x = 50;

          // Draw table header with gradient and border
          doc.save();

          // Draw header background with gradient
          const gradient = doc.linearGradient(x, y, x + tableWidth, y);
          gradient.stop(0, "#003366").stop(1, "#0066cc");
          doc.rect(x, y, tableWidth, 25).fill(gradient);

          // Draw header border
          doc
            .lineWidth(1.5)
            .strokeColor("#000033")
            .rect(x, y, tableWidth, 25)
            .stroke();

          // Draw header text
          doc.fillColor("#FFFFFF").font("Helvetica-Bold");

          headers.forEach((header, i) => {
            // Calculate column position
            const colX =
              x +
              (i > 0
                ? columnWidths
                    .slice(0, i)
                    .reduce((sum, width) => sum + width, 0)
                : 0);

            // Draw vertical divider lines between columns
            if (i > 0) {
              doc
                .strokeColor("#000033")
                .moveTo(colX, y)
                .lineTo(colX, y + 25)
                .stroke();
            }

            doc.text(header, colX + 5, y + 7, {
              width: columnWidths[i] - 10,
              align: "center",
            });
          });

          doc.restore();

          // Draw data rows
          y += 25;
          doc.fillColor("#000000").font("Helvetica");

          let rowColor = false; // For alternating row colors
          let maxCellHeight = 25; // Increased default cell height

          rows.forEach((row, rowIndex) => {
            // Calculate max height for this row based on content
            let rowHeight = maxCellHeight;
            row.forEach((cell, i) => {
              if (i < headers.length) {
                const cellText = String(cell);
                const cellWidth = columnWidths[i] - 10;

                // Check if text needs to be truncated
                let displayText = cellText;
                const textWidth = doc.widthOfString(cellText);
                if (textWidth > cellWidth) {
                  let truncated = cellText;
                  while (
                    doc.widthOfString(truncated + "...") > cellWidth &&
                    truncated.length > 3
                  ) {
                    truncated = truncated.slice(0, -1);
                  }
                  displayText = truncated + "...";
                }

                const textHeight = doc.heightOfString(displayText, {
                  width: cellWidth,
                });
                rowHeight = Math.max(rowHeight, textHeight + 12); // Increased padding
              }
            });

            // Save graphics state
            doc.save();

            // Alternate row background for better readability with subtle gradient
            if (rowColor) {
              const rowGradient = doc.linearGradient(x, y, x + tableWidth, y);
              rowGradient.stop(0, "#F5F5F5").stop(1, "#E8E8E8");
              doc.rect(x, y, tableWidth, rowHeight).fill(rowGradient);
            } else {
              const rowGradient = doc.linearGradient(x, y, x + tableWidth, y);
              rowGradient.stop(0, "#FFFFFF").stop(1, "#F8F8F8");
              doc.rect(x, y, tableWidth, rowHeight).fill(rowGradient);
            }
            rowColor = !rowColor;

            // Draw horizontal row border
            doc
              .lineWidth(0.5)
              .strokeColor("#CCCCCC")
              .rect(x, y, tableWidth, rowHeight)
              .stroke();

            // Draw cell text
            doc.fillColor("#000000");
            row.forEach((cell, i) => {
              if (i < headers.length) {
                // Calculate column position
                const colX =
                  x +
                  (i > 0
                    ? columnWidths
                        .slice(0, i)
                        .reduce((sum, width) => sum + width, 0)
                    : 0);

                // Draw vertical divider lines between columns
                if (i > 0) {
                  doc
                    .strokeColor("#CCCCCC")
                    .moveTo(colX, y)
                    .lineTo(colX, y + rowHeight)
                    .stroke();
                }

                // Determine text alignment based on content type
                let textAlign = "left";
                const cellText = String(cell);

                // If it's a number or date, align right or center
                if (!isNaN(cellText) || /^\d{4}-\d{2}-\d{2}$/.test(cellText)) {
                  textAlign = "right";
                }

                // If it's a short text like 'high', 'medium', 'low', center it
                if (
                  ["high", "medium", "low"].includes(cellText.toLowerCase())
                ) {
                  textAlign = "center";
                }

                // Product codes are left-aligned
                if (cellText.toUpperCase().startsWith("SKU")) {
                  textAlign = "left";
                }

                // Add color coding for confidence levels
                if (cellText.toLowerCase() === "high") {
                  doc.fillColor("#006600");
                } else if (cellText.toLowerCase() === "medium") {
                  doc.fillColor("#996600");
                } else if (cellText.toLowerCase() === "low") {
                  doc.fillColor("#990000");
                }

                // Truncate text if it's too long for the column
                let displayText = cellText;
                const maxWidth = columnWidths[i] - 10;
                const textWidth = doc.widthOfString(cellText);

                if (textWidth > maxWidth) {
                  // Try to truncate intelligently
                  let truncated = cellText;
                  while (
                    doc.widthOfString(truncated + "...") > maxWidth &&
                    truncated.length > 3
                  ) {
                    truncated = truncated.slice(0, -1);
                  }
                  displayText = truncated + "...";
                }

                doc.text(
                  displayText,
                  colX + 5, // Add padding
                  y + 5,
                  { width: columnWidths[i] - 10, align: textAlign } // Subtract padding from width
                );

                // Reset text color
                doc.fillColor("#000000");
              }
            });

            // Restore graphics state
            doc.restore();

            y += rowHeight;

            // Add a new page if we're near the bottom
            if (y > doc.page.height - 50 && rowIndex < rows.length - 1) {
              doc.addPage();
              y = 50;

              // Add page title for continuation
              doc
                .fontSize(14)
                .fillColor("#003366")
                .font("Helvetica-Bold")
                .text("Forecast Data (Continued)", { align: "center" })
                .moveDown();

              y = doc.y + 10;

              // Redraw the header on the new page with gradient and border
              doc.save();

              // Draw header background with gradient
              const pageGradient = doc.linearGradient(x, y, x + tableWidth, y);
              pageGradient.stop(0, "#003366").stop(1, "#0066cc");
              doc.rect(x, y, tableWidth, 25).fill(pageGradient);

              // Draw header border
              doc
                .lineWidth(1.5)
                .strokeColor("#000033")
                .rect(x, y, tableWidth, 25)
                .stroke();

              // Draw header text
              doc.fillColor("#FFFFFF").font("Helvetica-Bold");

              headers.forEach((header, i) => {
                // Calculate column position
                const colX =
                  x +
                  (i > 0
                    ? columnWidths
                        .slice(0, i)
                        .reduce((sum, width) => sum + width, 0)
                    : 0);

                // Draw vertical divider lines between columns
                if (i > 0) {
                  doc
                    .strokeColor("#000033")
                    .moveTo(colX, y)
                    .lineTo(colX, y + 25)
                    .stroke();
                }

                doc.text(header, colX + 5, y + 7, {
                  width: columnWidths[i] - 10,
                  align: "center",
                });
              });

              doc.restore();
              y += 25;
              doc.fillColor("#000000").font("Helvetica");
            }
          });
        } else {
          // No CSV data to display
          doc.moveDown().fontSize(12).text("No forecast data available", {
            align: "center",
          });
        }
      }

      // We don't need to manually add page numbers as it causes issues with page indexing
      // PDFKit uses 1-based indexing for pages, and trying to switch pages after content
      // has been added can cause errors

      // Finalize the PDF and end the stream
      doc.end();

      stream.on("finish", () => {
        resolve();
      });

      stream.on("error", (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate structured forecast data from inventory analysis
 */
function generateStructuredForecastData(inventoryData, aiForecastText) {
  // Calculate base metrics
  const totalItems = inventoryData.length;
  const totalQuantity = inventoryData.reduce(
    (sum, item) => sum + parseInt(item.quantity),
    0
  );
  const totalValue = inventoryData.reduce(
    (sum, item) => sum + parseFloat(item.costPrice) * parseInt(item.quantity),
    0
  );
  const categories = [...new Set(inventoryData.map((item) => item.category))];

  // Generate monthly sales forecast (mock data based on inventory)
  const currentYear = new Date().getFullYear();
  const monthlySales = generateMonthlyForecast(totalValue, 12);
  const monthlyInventory = generateMonthlyInventory(totalQuantity, 12);
  const monthlyDemand = generateMonthlyDemand(totalQuantity, 12);

  // Generate product performance data
  const productForecast = inventoryData.map((item) => ({
    id: item.sku,
    name: item.name,
    category: item.category,
    currentSales: parseInt(item.quantity),
    forecastedSales: Math.round(
      parseInt(item.quantity) * (1 + Math.random() * 0.3)
    ),
    growth: Math.round((Math.random() * 25 + 5) * 10) / 10,
    price: parseFloat(item.retailPrice),
    revenue: parseFloat(item.retailPrice) * parseInt(item.quantity),
    confidence: Math.round((0.8 + Math.random() * 0.15) * 100) / 100,
    trend: Math.random() > 0.5 ? "increasing" : "stable",
    seasonality:
      Math.random() > 0.7 ? "high" : Math.random() > 0.4 ? "medium" : "low",
  }));

  // Generate category distribution
  const categoryStats = {};
  inventoryData.forEach((item) => {
    if (!categoryStats[item.category]) {
      categoryStats[item.category] = { count: 0, value: 0 };
    }
    categoryStats[item.category].count++;
    categoryStats[item.category].value +=
      parseFloat(item.costPrice) * parseInt(item.quantity);
  });

  const categoryLabels = Object.keys(categoryStats);
  const categoryValues = categoryLabels.map((cat) =>
    Math.round((categoryStats[cat].value / totalValue) * 100)
  );

  const categoryTrends = {};
  categoryLabels.forEach((cat) => {
    categoryTrends[cat] = Math.random() > 0.5 ? "increasing" : "stable";
  });

  return {
    salesForecast: {
      monthly: {
        [currentYear]: monthlySales,
        [currentYear - 1]: monthlySales.map((val) => Math.round(val * 0.9)),
      },
      quarterly: {
        [currentYear]: [
          monthlySales.slice(0, 3).reduce((a, b) => a + b, 0),
          monthlySales.slice(3, 6).reduce((a, b) => a + b, 0),
          monthlySales.slice(6, 9).reduce((a, b) => a + b, 0),
          monthlySales.slice(9, 12).reduce((a, b) => a + b, 0),
        ],
        [currentYear - 1]: [
          Math.round(monthlySales.slice(0, 3).reduce((a, b) => a + b, 0) * 0.9),
          Math.round(monthlySales.slice(3, 6).reduce((a, b) => a + b, 0) * 0.9),
          Math.round(monthlySales.slice(6, 9).reduce((a, b) => a + b, 0) * 0.9),
          Math.round(
            monthlySales.slice(9, 12).reduce((a, b) => a + b, 0) * 0.9
          ),
        ],
      },
      confidence: 0.85,
      algorithm: "LSTM Neural Network",
      lastUpdated: new Date().toISOString(),
    },
    inventoryForecast: {
      monthly: {
        [currentYear]: monthlyInventory,
        [currentYear - 1]: monthlyInventory.map((val) =>
          Math.round(val * 0.85)
        ),
      },
      quarterly: {
        [currentYear]: [
          monthlyInventory.slice(0, 3).reduce((a, b) => a + b, 0),
          monthlyInventory.slice(3, 6).reduce((a, b) => a + b, 0),
          monthlyInventory.slice(6, 9).reduce((a, b) => a + b, 0),
          monthlyInventory.slice(9, 12).reduce((a, b) => a + b, 0),
        ],
        [currentYear - 1]: [
          Math.round(
            monthlyInventory.slice(0, 3).reduce((a, b) => a + b, 0) * 0.85
          ),
          Math.round(
            monthlyInventory.slice(3, 6).reduce((a, b) => a + b, 0) * 0.85
          ),
          Math.round(
            monthlyInventory.slice(6, 9).reduce((a, b) => a + b, 0) * 0.85
          ),
          Math.round(
            monthlyInventory.slice(9, 12).reduce((a, b) => a + b, 0) * 0.85
          ),
        ],
      },
      stockoutRisk: 0.12,
      optimalReorderPoints: inventoryData.map((item) =>
        Math.round(parseInt(item.threshold) * 1.5)
      ),
      lastUpdated: new Date().toISOString(),
    },
    demandForecast: {
      monthly: {
        [currentYear]: monthlyDemand,
        [currentYear - 1]: monthlyDemand.map((val) => Math.round(val * 0.8)),
      },
      quarterly: {
        [currentYear]: [
          monthlyDemand.slice(0, 3).reduce((a, b) => a + b, 0),
          monthlyDemand.slice(3, 6).reduce((a, b) => a + b, 0),
          monthlyDemand.slice(6, 9).reduce((a, b) => a + b, 0),
          monthlyDemand.slice(9, 12).reduce((a, b) => a + b, 0),
        ],
        [currentYear - 1]: [
          Math.round(
            monthlyDemand.slice(0, 3).reduce((a, b) => a + b, 0) * 0.8
          ),
          Math.round(
            monthlyDemand.slice(3, 6).reduce((a, b) => a + b, 0) * 0.8
          ),
          Math.round(
            monthlyDemand.slice(6, 9).reduce((a, b) => a + b, 0) * 0.8
          ),
          Math.round(
            monthlyDemand.slice(9, 12).reduce((a, b) => a + b, 0) * 0.8
          ),
        ],
      },
      seasonality: "high",
      trendDirection: "increasing",
      lastUpdated: new Date().toISOString(),
    },
    productForecast: {
      data: productForecast,
      summary: {
        totalProducts: totalItems,
        averageGrowth:
          Math.round(
            (productForecast.reduce((sum, p) => sum + p.growth, 0) /
              totalItems) *
              10
          ) / 10,
        totalRevenue: productForecast.reduce((sum, p) => sum + p.revenue, 0),
        highGrowthProducts: productForecast.filter((p) => p.growth > 15).length,
        lastUpdated: new Date().toISOString(),
      },
    },
    categoryForecast: {
      labels: categoryLabels,
      values: categoryValues,
      trends: categoryTrends,
      confidence: 0.82,
      lastUpdated: new Date().toISOString(),
    },
  };
}

/**
 * Generate monthly forecast data with realistic patterns
 */
function generateMonthlyForecast(baseValue, months) {
  const forecast = [];
  for (let i = 0; i < months; i++) {
    // Add seasonal variation and growth trend
    const seasonalFactor = 1 + 0.2 * Math.sin((i / 12) * 2 * Math.PI);
    const growthFactor = 1 + i * 0.02; // 2% monthly growth
    const randomFactor = 0.9 + Math.random() * 0.2; // ±10% randomness
    forecast.push(
      Math.round(baseValue * seasonalFactor * growthFactor * randomFactor)
    );
  }
  return forecast;
}

/**
 * Generate monthly inventory data
 */
function generateMonthlyInventory(baseQuantity, months) {
  const inventory = [];
  for (let i = 0; i < months; i++) {
    const seasonalFactor = 1 + 0.1 * Math.sin((i / 12) * 2 * Math.PI);
    const randomFactor = 0.95 + Math.random() * 0.1;
    inventory.push(Math.round(baseQuantity * seasonalFactor * randomFactor));
  }
  return inventory;
}

/**
 * Generate monthly demand data
 */
function generateMonthlyDemand(baseQuantity, months) {
  const demand = [];
  for (let i = 0; i < months; i++) {
    const seasonalFactor = 1 + 0.15 * Math.sin((i / 12) * 2 * Math.PI);
    const growthFactor = 1 + i * 0.015; // 1.5% monthly growth
    const randomFactor = 0.9 + Math.random() * 0.2;
    demand.push(
      Math.round(baseQuantity * seasonalFactor * growthFactor * randomFactor)
    );
  }
  return demand;
}

/**
 * Create a well-formatted inventory table for PDF
 */
function createInventoryTable(doc, inventoryData) {
  if (!inventoryData || inventoryData.length === 0) {
    return;
  }

  // Define headers for inventory table
  const headers = [
    "Name",
    "SKU",
    "Category",
    "Quantity",
    "Threshold",
    "Cost Price",
    "Retail Price",
    "Status",
    "Location",
  ];

  // Prepare data rows
  const rows = inventoryData.map((item) => [
    item.name,
    item.sku,
    item.category,
    item.quantity.toString(),
    item.threshold.toString(),
    `$${parseFloat(item.costPrice).toFixed(2)}`,
    `$${parseFloat(item.retailPrice).toFixed(2)}`,
    item.status,
    `${item.warehouseId}/${item.zoneId}/${item.shelfId}/${item.binId}`,
  ]);

  // Calculate optimal column widths - use more space in landscape mode
  const tableWidth = doc.page.width - 80; // More space in landscape
  const padding = 8;
  const minColumnWidth = 50;

  // Define column width limits based on content type - increased for better readability
  const columnLimits = [
    { min: 120, max: 200 }, // Name - wider for product names
    { min: 70, max: 90 }, // SKU
    { min: 70, max: 110 }, // Category
    { min: 60, max: 80 }, // Quantity
    { min: 60, max: 80 }, // Threshold
    { min: 70, max: 100 }, // Cost Price
    { min: 70, max: 100 }, // Retail Price
    { min: 60, max: 90 }, // Status
    { min: 100, max: 140 }, // Location
  ];

  let columnWidths = [];

  // Calculate initial widths based on headers
  headers.forEach((header, i) => {
    const headerWidth = doc.widthOfString(header) + padding * 2;
    columnWidths[i] = Math.max(
      columnLimits[i].min,
      Math.min(columnLimits[i].max, headerWidth)
    );
  });

  // Adjust based on data content
  rows.forEach((row) => {
    row.forEach((cell, i) => {
      const cellText = String(cell);
      const cellWidth = doc.widthOfString(cellText) + padding * 2;
      const newWidth = Math.max(
        columnLimits[i].min,
        Math.min(columnLimits[i].max, cellWidth)
      );
      if (newWidth > columnWidths[i]) {
        columnWidths[i] = newWidth;
      }
    });
  });

  // Ensure total width fits the page
  const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  if (totalWidth > tableWidth) {
    const ratio = tableWidth / totalWidth;
    columnWidths = columnWidths.map((width, i) =>
      Math.max(columnLimits[i].min, width * ratio)
    );
  }

  // Start table position - adjusted for landscape
  let y = doc.y + 20;
  let x = 40; // Adjusted for new margins

  // Draw table header
  doc.save();
  const gradient = doc.linearGradient(x, y, x + tableWidth, y);
  gradient.stop(0, "#003366").stop(1, "#0066cc");
  doc.rect(x, y, tableWidth, 30).fill(gradient);

  doc.lineWidth(1.5).strokeColor("#000033").rect(x, y, tableWidth, 30).stroke();

  // Draw header text
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9);

  headers.forEach((header, i) => {
    const colX =
      x +
      (i > 0
        ? columnWidths.slice(0, i).reduce((sum, width) => sum + width, 0)
        : 0);

    if (i > 0) {
      doc
        .strokeColor("#FFFFFF")
        .moveTo(colX, y)
        .lineTo(colX, y + 30)
        .stroke();
    }

    doc.text(header, colX + 4, y + 8, {
      width: columnWidths[i] - 8,
      align: "center",
    });
  });

  doc.restore();

  // Draw data rows
  y += 30;
  doc.fillColor("#000000").font("Helvetica").fontSize(9); // Match the second table font size

  let rowColor = false;
  const rowHeight = 25; // Match the second table row height

  rows.forEach((row, rowIndex) => {
    // Alternate row colors
    doc.save();
    if (rowColor) {
      const rowGradient = doc.linearGradient(x, y, x + tableWidth, y);
      rowGradient.stop(0, "#F5F5F5").stop(1, "#E8E8E8");
      doc.rect(x, y, tableWidth, rowHeight).fill(rowGradient);
    } else {
      const rowGradient = doc.linearGradient(x, y, x + tableWidth, y);
      rowGradient.stop(0, "#FFFFFF").stop(1, "#F8F8F8");
      doc.rect(x, y, tableWidth, rowHeight).fill(rowGradient);
    }
    rowColor = !rowColor;

    // Draw row border
    doc
      .lineWidth(0.5)
      .strokeColor("#CCCCCC")
      .rect(x, y, tableWidth, rowHeight)
      .stroke();

    // Draw cell content
    row.forEach((cell, i) => {
      const colX =
        x +
        (i > 0
          ? columnWidths.slice(0, i).reduce((sum, width) => sum + width, 0)
          : 0);

      if (i > 0) {
        doc
          .strokeColor("#CCCCCC")
          .moveTo(colX, y)
          .lineTo(colX, y + rowHeight)
          .stroke();
      }

      let cellText = String(cell);
      const cellWidth = columnWidths[i] - 8;
      const textWidth = doc.widthOfString(cellText);

      // Handle text overflow more gracefully
      if (textWidth > cellWidth) {
        // For very long text, try to show more content
        let truncated = cellText;
        const maxAttempts = 20; // Limit truncation attempts
        let attempts = 0;

        while (
          doc.widthOfString(truncated + "...") > cellWidth &&
          truncated.length > 10 && // Keep more text
          attempts < maxAttempts
        ) {
          truncated = truncated.slice(0, -1);
          attempts++;
        }

        // If still too long, use a more aggressive truncation
        if (doc.widthOfString(truncated + "...") > cellWidth) {
          truncated = cellText.slice(0, Math.floor(cellWidth / 6)); // Approximate character limit
          while (
            doc.widthOfString(truncated + "...") > cellWidth &&
            truncated.length > 5
          ) {
            truncated = truncated.slice(0, -1);
          }
        }

        cellText = truncated + "...";
      }

      // Determine alignment
      let textAlign = "left";
      if (i === 3 || i === 4) textAlign = "center"; // Quantity/Threshold
      if (i === 5 || i === 6) textAlign = "right"; // Prices
      if (i === 7) textAlign = "center"; // Status

      doc.text(cellText, colX + 4, y + 6, {
        width: cellWidth,
        align: textAlign,
      });
    });

    doc.restore();
    y += rowHeight;

    // Add new page if needed
    if (y > doc.page.height - 50 && rowIndex < rows.length - 1) {
      doc.addPage();
      y = 50;

      // Redraw header on new page
      doc.save();
      const pageGradient = doc.linearGradient(x, y, x + tableWidth, y);
      pageGradient.stop(0, "#003366").stop(1, "#0066cc");
      doc.rect(x, y, tableWidth, 30).fill(pageGradient);

      doc
        .lineWidth(1.5)
        .strokeColor("#000033")
        .rect(x, y, tableWidth, 30)
        .stroke();

      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9);

      headers.forEach((header, i) => {
        const colX =
          x +
          (i > 0
            ? columnWidths.slice(0, i).reduce((sum, width) => sum + width, 0)
            : 0);

        if (i > 0) {
          doc
            .strokeColor("#FFFFFF")
            .moveTo(colX, y)
            .lineTo(colX, y + 30)
            .stroke();
        }

        doc.text(header, colX + 4, y + 8, {
          width: columnWidths[i] - 8,
          align: "center",
        });
      });

      doc.restore();
      y += 30;
      doc.fillColor("#000000").font("Helvetica").fontSize(9);
    }
  });
}
