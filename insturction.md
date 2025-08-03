# 🌊 Windsurf AI Forecasting - Use Cases

`windsurf` is a microservice built with Express.js that handles inventory forecasting using Groq Cloud AI. It receives inventory data (CSV or text), processes it with LLM prompts, and returns forecasting results in plain text and optionally CSV format. The results are saved to Cloudinary and linked to MongoDB jobs for user access.

---

## ✅ Use Case 1: Manual CSV Upload Forecasting

**📝 Description**  
A user uploads a CSV file containing inventory items. The `windsurf` service reads the file, sends the data to Groq AI for forecasting, and receives a text summary and optional CSV forecast. Results are uploaded to Cloudinary and linked to the job in the database.

**📥 Input**

- `fileUrl`: Cloudinary URL to uploaded inventory CSV
- `jobId`: Forecast job ID from the main backend

**📤 Output**

- `forecastText`: Text-based forecast per item
- `forecastCsvUrl`: Cloudinary URL to downloadable forecast CSV or pdf

**⚙️ Technologies Used**

- Express.js (API routing)
- csv-parser / fs (read CSV)
- Groq Cloud API (AI forecasting)
- Cloudinary (store output CSV)
- Mongoose (update forecast job record)

---

## ✅ Use Case 2: Chatbot-Based Forecasting (Text Input)

**📝 Description**  
User provides inventory information as plain text via chatbot (e.g., "Sold 30 units of Product X daily for the past week"). The service processes the message using Groq AI and replies with a human-readable forecast.

**📥 Input**

- `inputText`: Raw text describing inventory
- `jobId`: (optional) for storing result in DB

**📤 Output**

- `forecastText`: Short forecast summary
- `forecastCsv`: Optional CSV text (inline or downloadable)

**⚙️ Technologies Used**

- Express.js (API endpoint)
- Groq Cloud API (LLM forecasting)
- Mongoose (optional: log user chatbot requests)
- Cloudinary (optional: save forecast file)

---

## ✅ Use Case 3: Automated Daily Forecast via Cron

**📝 Description**  
The system auto-generates daily inventory snapshots (e.g., Day 1 to Day 20 sales), then sends the compiled data to the `windsurf` service. The forecast is shown on the dashboard or emailed.

**📥 Input**

- `inputText`: Aggregated sales data for a product (e.g., "Day 1: 20 units, ..., Day 20: 15 units")
- `jobId`: Associated dashboard/job reference

**📤 Output**

- `forecastText`: Forecast result for selected date range
- `forecastCsvUrl`: Optional link to exported forecast file

**⚙️ Technologies Used**

- Express.js (API endpoint)
- Groq Cloud API (generate forecast from historical pattern)
- Cloudinary (export CSV for graphs/export)
- Mongoose (record forecasts for historical analysis)

---

## 🧠 Prompting Strategy (All Use Cases)

Prompts sent to Groq include:

- Product name, SKU, category
- Quantity, threshold, retail price
- Sale or stock dates
- Optional historical trends (e.g., last 20 days)

**Example Prompt (internal use):**

---

## 📦 Optional Enhancements

- Add PDF export of forecast
- Real-time WebSocket updates to dashboard
- Support multiple languages via Groq prompt
- Telegram bot using this same API

---
