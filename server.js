const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./database');
const { fetchQuotes } = require('./scraper');
const { getQuotes, getAverage, getSlippage } = require('./routes/quotes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initDatabase();

// Routes
app.get('/quotes', getQuotes);
app.get('/average', getAverage);
app.get('/slippage', getSlippage);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: "Welcome to CurrencyHub API 👋",
    endpoints: {
      quotes: "/quotes",
      average: "/average",
      slippage: "/slippage",
      health: "/health"
    },
    author: "Likith G S",
    deployed_on: "Render",
    version: "1.0.0"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`CurrencyHub server running on port ${PORT}`);
});

// Fetch quotes periodically (every 50 seconds to stay under 60s limit)
setInterval(async () => {
  try {
    console.log('Fetching fresh quotes...');
    await fetchQuotes();
  } catch (error) {
    console.error('Error fetching quotes:', error.message);
  }
}, 50000); // 50 seconds

// Fetch initial quotes on startup
fetchQuotes().catch(err => console.error('Initial fetch error:', err.message));

