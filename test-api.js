/**
 * Simple test script to verify API endpoints
 * Run with: node test-api.js
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function testEndpoints() {
  console.log('Testing CurrencyHub API...\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  
  try {
    // Test health endpoint
    console.log('1. Testing GET /health');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check:', health.data);
    console.log();
    
    // Test quotes endpoint
    console.log('2. Testing GET /quotes');
    const quotes = await axios.get(`${BASE_URL}/quotes`);
    console.log(`✅ Quotes retrieved: ${quotes.data.length} sources`);
    quotes.data.forEach((quote, i) => {
      console.log(`   ${i + 1}. ${quote.source}`);
      console.log(`      Buy: ${quote.buy_price}, Sell: ${quote.sell_price}`);
    });
    console.log();
    
    // Test average endpoint
    console.log('3. Testing GET /average');
    const average = await axios.get(`${BASE_URL}/average`);
    console.log('✅ Average prices:');
    console.log(`   Buy: ${average.data.average_buy_price}`);
    console.log(`   Sell: ${average.data.average_sell_price}`);
    console.log(`   Sources: ${average.data.quote_count}`);
    console.log();
    
    // Test slippage endpoint
    console.log('4. Testing GET /slippage');
    const slippage = await axios.get(`${BASE_URL}/slippage`);
    console.log(`✅ Slippage data: ${slippage.data.length} sources`);
    slippage.data.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.source}`);
      console.log(`      Buy slippage: ${item.buy_price_slippage}%`);
      console.log(`      Sell slippage: ${item.sell_price_slippage}%`);
    });
    console.log();
    
    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

testEndpoints();

