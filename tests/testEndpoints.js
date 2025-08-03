const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

// Configuration
const API_URL = 'http://localhost:3000/api';
const TEST_CSV_PATH = path.join(__dirname, 'test-data.csv');

// Create test CSV file if it doesn't exist
if (!fs.existsSync(TEST_CSV_PATH)) {
  const csvContent = `date,product,quantity,sales
2023-01-01,ProductA,100,5000
2023-01-02,ProductA,95,4750
2023-01-03,ProductA,105,5250
2023-01-04,ProductA,110,5500
2023-01-05,ProductA,90,4500
2023-01-06,ProductA,85,4250
2023-01-07,ProductA,115,5750`;
  
  fs.writeFileSync(TEST_CSV_PATH, csvContent);
  console.log('Created test CSV file');
}

// Test functions
async function testTextForecast() {
  try {
    console.log('\n--- Testing Text Forecast Endpoint ---');
    
    const inputText = 'Product X has been selling at an average of 50 units per day for the past week. ' +
                      'The week before that, it was selling at 45 units per day. ' +
                      'We need to forecast for the next two weeks.';
    
    const response = await axios.post(`${API_URL}/forecast/text`, {
      inputText
    });
    
    console.log('Status:', response.status);
    console.log('Forecast Text:', response.data.forecastText);
    console.log('Forecast CSV URL:', response.data.forecastCsvUrl || 'None');
    
    return true;
  } catch (error) {
    console.error('Error testing text forecast:', error.response?.data || error.message);
    return false;
  }
}

async function testCsvForecast() {
  try {
    console.log('\n--- Testing CSV Forecast Endpoint ---');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_CSV_PATH));
    
    const response = await axios.post(`${API_URL}/forecast/csv`, formData, {
      headers: formData.getHeaders()
    });
    
    console.log('Status:', response.status);
    console.log('Forecast Text:', response.data.forecastText);
    console.log('Forecast CSV URL:', response.data.forecastCsvUrl || 'None');
    
    return true;
  } catch (error) {
    console.error('Error testing CSV forecast:', error.response?.data || error.message);
    return false;
  }
}

async function testAutomatedForecast() {
  try {
    console.log('\n--- Testing Automated Forecast Endpoint ---');
    
    const inputText = 'Product Y historical data:\n' +
                      'Day 1: 20 units\n' +
                      'Day 2: 22 units\n' +
                      'Day 3: 19 units\n' +
                      'Day 4: 25 units\n' +
                      'Day 5: 18 units\n' +
                      'Day 6: 21 units\n' +
                      'Day 7: 23 units';
    
    const response = await axios.post(`${API_URL}/forecast/automated`, {
      inputText
    });
    
    console.log('Status:', response.status);
    console.log('Forecast Text:', response.data.forecastText);
    console.log('Forecast CSV URL:', response.data.forecastCsvUrl || 'None');
    
    return true;
  } catch (error) {
    console.error('Error testing automated forecast:', error.response?.data || error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting API endpoint tests...');
  
  let results = {
    text: false,
    csv: false,
    automated: false
  };
  
  try {
    // Test text forecast
    results.text = await testTextForecast();
    
    // Test CSV forecast
    results.csv = await testCsvForecast();
    
    // Test automated forecast
    results.automated = await testAutomatedForecast();
    
    // Summary
    console.log('\n--- Test Results Summary ---');
    console.log('Text Forecast:', results.text ? 'PASSED' : 'FAILED');
    console.log('CSV Forecast:', results.csv ? 'PASSED' : 'FAILED');
    console.log('Automated Forecast:', results.automated ? 'PASSED' : 'FAILED');
    
    const allPassed = results.text && results.csv && results.automated;
    console.log('\nOverall:', allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testTextForecast,
  testCsvForecast,
  testAutomatedForecast,
  runTests
};
