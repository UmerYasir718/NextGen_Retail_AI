const { Groq } = require('groq-sdk');

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Call Groq API for forecasting
 * @param {String} systemPrompt - System prompt for the AI
 * @param {String} userPrompt - User prompt containing data for forecasting
 * @returns {Object} Groq API response
 */
async function callGroqApi(systemPrompt, userPrompt) {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      model: "llama-3.3-70b-versatile",
    });
    
    return chatCompletion.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Groq API:', error);
    throw new Error('Failed to process forecast with Groq AI');
  }
}

/**
 * Generate system prompt for forecasting
 * @param {String} type - Type of forecast (csv, text, automated)
 * @returns {String} System prompt
 */
function generateSystemPrompt(type) {
  const basePrompt = `You are an AI inventory forecasting assistant. Your task is to analyze inventory data and provide accurate forecasts.
  
Please follow these guidelines:
1. Analyze the provided data carefully
2. Consider seasonal trends and patterns
3. Provide a clear, concise forecast summary
4. Include specific numbers and predictions
5. If appropriate, generate a CSV forecast with future predictions in the following format:
   \`\`\`csv
   date,product,predicted_quantity,confidence_level
   2023-08-01,ProductA,120,high
   2023-08-02,ProductA,125,high
   ...
   \`\`\``;

  switch (type) {
    case 'csv':
      return `${basePrompt}
      
You will receive CSV data with inventory information. Parse this data and generate both a text summary and a CSV forecast.
The forecast should include predictions for the next 7-30 days depending on the data provided.`;
      
    case 'text':
      return `${basePrompt}
      
You will receive a text description of inventory data. Extract the relevant information and generate a forecast based on this description.
Be sure to identify product names, quantities, and time periods from the text.`;
      
    case 'automated':
      return `${basePrompt}
      
You will receive aggregated sales data for a product over time. Analyze this historical data and predict future trends.
Focus on identifying patterns, seasonality, and growth/decline trends.`;
      
    default:
      return basePrompt;
  }
}

/**
 * Parse Groq response to extract text and CSV
 * @param {String} response - Groq API response
 * @returns {Object} Parsed forecast with text and CSV
 */
function parseGroqResponse(response) {
  // Check if response contains CSV
  const csvMatch = response.match(/```csv\n([\s\S]*?)\n```/);
  const forecastCsv = csvMatch ? csvMatch[1] : null;
  
  // Clean up response text (remove CSV block if present)
  let forecastText = response;
  if (csvMatch) {
    forecastText = forecastText.replace(/```csv\n[\s\S]*?\n```/, '').trim();
  }
  
  return {
    forecastText,
    forecastCsv
  };
}

module.exports = {
  callGroqApi,
  generateSystemPrompt,
  parseGroqResponse
};
