# 🌊 Windsurf AI Forecasting

A microservice built with Express.js that handles inventory forecasting using Groq Cloud AI. It receives inventory data (CSV or text), processes it with LLM prompts, and returns forecasting results in plain text and optionally CSV format.

## Features

- **Manual CSV Upload Forecasting**: Process inventory data from CSV files
- **Chatbot-Based Forecasting**: Generate forecasts from text descriptions
- **Automated Daily Forecasting**: Schedule regular forecasts via cron jobs

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example` and add your API keys:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   MONGODB_URI=your_mongodb_connection_string
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   PORT=3000
   ```
4. Start the server:
   ```
   npm start
   ```

## API Endpoints

### 1. CSV Upload Forecasting

```
POST /api/forecast/csv
```

- **Input**: CSV file upload (multipart/form-data)
- **Optional**: `jobId` for database tracking
- **Output**: Forecast text and optional CSV URL

### 2. Text-Based Forecasting

```
POST /api/forecast/text
```

- **Input**: `inputText` containing inventory description
- **Optional**: `jobId` for database tracking
- **Output**: Forecast text and optional CSV URL

### 3. Automated Forecasting

```
POST /api/forecast/automated
```

- **Input**: `inputText` containing historical data
- **Optional**: `jobId` for database tracking
- **Output**: Forecast text and optional CSV URL

### 4. Inventory Data Forecasting

```
POST /api/forecast/inventory
```

- **Input**: `inventoryData` array with detailed inventory information
- **Required Fields**: name, sku, tagId, description, category, quantity, threshold, warehouseId, zoneId, shelfId, binId, status, inventoryStatus, costPrice, retailPrice
- **Optional**: `jobId` for database tracking
- **Output**: Comprehensive forecast analysis with text and optional CSV URL

## Groq AI Integration

This service uses Groq's LLM API to generate intelligent forecasts based on inventory data. The system prompt is tailored to each use case to provide accurate and relevant predictions.

## Technologies Used

- Express.js (API routing)
- Groq Cloud API (AI forecasting)
- MongoDB/Mongoose (data storage)
- Cloudinary (file storage)
- Node-cron (scheduled tasks)

## Optional Enhancements

- PDF export of forecasts
- Real-time WebSocket updates
- Multi-language support
- Telegram bot integration
