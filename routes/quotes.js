const { getLatestQuotes, getAllQuotes } = require('../database');
const { fetchQuotes } = require('../scraper');

const getQuotes = async (req, res) => {
  try {
    let quotes = await getLatestQuotes();
    
    // If no recent quotes (within 60s), fetch new ones
    if (quotes.length === 0) {
      console.log('No recent quotes found, fetching fresh data...');
      quotes = await fetchQuotes();
    }
    
    // Format response
    const formattedQuotes = quotes.map(quote => ({
      buy_price: quote.buy_price,
      sell_price: quote.sell_price,
      source: quote.source,
      timestamp: quote.created_at || new Date().toISOString()
    }));
    
    res.json(formattedQuotes);
  } catch (error) {
    console.error('Error in /quotes:', error);
    res.status(500).json({ error: 'Failed to fetch quotes', message: error.message });
  }
};

const getAverage = async (req, res) => {
  try {
    let quotes = await getLatestQuotes();
    
    // If no recent quotes, fetch new ones
    if (quotes.length === 0) {
      console.log('No recent quotes found, fetching fresh data...');
      quotes = await fetchQuotes();
    }
    
    if (quotes.length === 0) {
      return res.status(503).json({ error: 'No quotes available' });
    }
    
    // Calculate averages
    const totalBuy = quotes.reduce((sum, q) => sum + q.buy_price, 0);
    const totalSell = quotes.reduce((sum, q) => sum + q.sell_price, 0);
    const count = quotes.length;
    
    const average_buy_price = parseFloat((totalBuy / count).toFixed(2));
    const average_sell_price = parseFloat((totalSell / count).toFixed(2));
    
    res.json({
      average_buy_price,
      average_sell_price,
      quote_count: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in /average:', error);
    res.status(500).json({ error: 'Failed to calculate average', message: error.message });
  }
};

const getSlippage = async (req, res) => {
  try {
    let quotes = await getLatestQuotes();
    
    // If no recent quotes, fetch new ones
    if (quotes.length === 0) {
      console.log('No recent quotes found, fetching fresh data...');
      quotes = await fetchQuotes();
    }
    
    if (quotes.length === 0) {
      return res.status(503).json({ error: 'No quotes available' });
    }
    
    // Calculate average first
    const totalBuy = quotes.reduce((sum, q) => sum + q.buy_price, 0);
    const totalSell = quotes.reduce((sum, q) => sum + q.sell_price, 0);
    const count = quotes.length;
    
    const average_buy_price = totalBuy / count;
    const average_sell_price = totalSell / count;
    
    // Calculate slippage for each quote
    const slippageData = quotes.map(quote => {
      const buy_price_slippage = parseFloat(
        (((quote.buy_price - average_buy_price) / average_buy_price) * 100).toFixed(2)
      );
      const sell_price_slippage = parseFloat(
        (((quote.sell_price - average_sell_price) / average_sell_price) * 100).toFixed(2)
      );
      
      return {
        buy_price_slippage,
        sell_price_slippage,
        source: quote.source,
        buy_price: quote.buy_price,
        sell_price: quote.sell_price,
        average_buy_price: parseFloat(average_buy_price.toFixed(2)),
        average_sell_price: parseFloat(average_sell_price.toFixed(2))
      };
    });
    
    res.json(slippageData);
  } catch (error) {
    console.error('Error in /slippage:', error);
    res.status(500).json({ error: 'Failed to calculate slippage', message: error.message });
  }
};

module.exports = {
  getQuotes,
  getAverage,
  getSlippage
};

