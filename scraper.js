const axios = require('axios');
const cheerio = require('cheerio');
const { saveQuotes } = require('./database');

// Default to ARS, but can be changed via environment variable
const CURRENCY = process.env.CURRENCY || 'ARS';

const ARS_SOURCES = [
  {
    name: 'Ambito',
    url: 'https://www.ambito.com/contenidos/dolar.html',
    scraper: async (html) => {
      const $ = cheerio.load(html);
      // Try to find buy and sell prices in the HTML
      // This is a simplified example - actual selectors need to be adjusted based on the site structure
      const buyText = $('.value, .compra, [class*="buy"], [class*="compra"]').first().text().trim();
      const sellText = $('.value, .venta, [class*="sell"], [class*="venta"]').first().text().trim();
      
      // Extract numbers from text
      const buyMatch = buyText.match(/[\d,]+\.?\d*/);
      const sellMatch = sellText.match(/[\d,]+\.?\d*/);
      
      if (buyMatch && sellMatch) {
        return {
          buy_price: parseFloat(buyMatch[0].replace(/,/g, '')),
          sell_price: parseFloat(sellMatch[0].replace(/,/g, ''))
        };
      }
      
      // Fallback: try to find any price patterns
      const prices = html.match(/\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g);
      if (prices && prices.length >= 2) {
        return {
          buy_price: parseFloat(prices[0].replace(/[$,.\s]/g, '')) / 100,
          sell_price: parseFloat(prices[1].replace(/[$,.\s]/g, '')) / 100
        };
      }
      
      throw new Error('Could not parse prices from Ambito');
    }
  },
  {
    name: 'DolarHoy',
    url: 'https://www.dolarhoy.com',
    scraper: async (html) => {
      const $ = cheerio.load(html);
      // Common patterns for dolarhoy.com
      const buyElement = $('.compra .val, .buy .val, [class*="compra"] .val').first();
      const sellElement = $('.venta .val, .sell .val, [class*="venta"] .val').first();
      
      const buyText = buyElement.text().trim();
      const sellText = sellElement.text().trim();
      
      const buyMatch = buyText.match(/[\d,]+\.?\d*/);
      const sellMatch = sellText.match(/[\d,]+\.?\d*/);
      
      if (buyMatch && sellMatch) {
        return {
          buy_price: parseFloat(buyMatch[0].replace(/,/g, '')),
          sell_price: parseFloat(sellMatch[0].replace(/,/g, ''))
        };
      }
      
      throw new Error('Could not parse prices from DolarHoy');
    }
  },
  {
    name: 'Cronista',
    url: 'https://www.cronista.com/MercadosOnline/moneda.html?id=ARSB',
    scraper: async (html) => {
      const $ = cheerio.load(html);
      // Cronista uses .buy and .sell classes
      const buyText = $('.buy').first().text().trim();
      const sellText = $('.sell').first().text().trim();
      
      // Extract prices from text like "Valor de compra$1.430,00" or "$1.430,00"
      const buyMatch = buyText.match(/[\$]?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/);
      const sellMatch = sellText.match(/[\$]?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/);
      
      if (buyMatch && sellMatch) {
        // Handle both comma and dot as decimal separator
        const buyPrice = parseFloat(buyMatch[1].replace(/\./g, '').replace(',', '.'));
        const sellPrice = parseFloat(sellMatch[1].replace(/\./g, '').replace(',', '.'));
        
        return {
          buy_price: buyPrice,
          sell_price: sellPrice
        };
      }
      
      throw new Error('Could not parse prices from Cronista');
    }
  }
];

const BRL_SOURCES = [
  {
    name: 'Wise',
    url: 'https://wise.com/es/currency-converter/brl-to-usd-rate',
    scraper: async (html) => {
      const $ = cheerio.load(html);
      // Wise usually shows a conversion rate
      const rateText = $('.rate, .conversion-rate, [class*="rate"]').first().text().trim();
      const match = rateText.match(/[\d,]+\.?\d*/);
      
      if (match) {
        const rate = parseFloat(match[0].replace(/,/g, ''));
        // For Wise, buy and sell might be the same or slightly different
        // Assuming a small spread
        return {
          buy_price: rate * 0.9995, // Slightly lower for buy
          sell_price: rate * 1.0005  // Slightly higher for sell
        };
      }
      
      throw new Error('Could not parse rate from Wise');
    }
  },
  {
    name: 'Nubank',
    url: 'https://nubank.com.br/taxas-conversao/',
    scraper: async (html) => {
      const $ = cheerio.load(html);
      // Nubank conversion rates
      const rateElements = $('.rate, .taxa, [class*="rate"], [class*="taxa"]');
      
      const rates = [];
      rateElements.each((i, el) => {
        const text = $(el).text().trim();
        const match = text.match(/[\d,]+\.?\d*/);
        if (match) {
          rates.push(parseFloat(match[0].replace(/,/g, '')));
        }
      });
      
      if (rates.length >= 1) {
        const rate = rates[0];
        return {
          buy_price: rate * 0.999,
          sell_price: rate * 1.001
        };
      }
      
      throw new Error('Could not parse rates from Nubank');
    }
  },
  {
    name: 'Nomad',
    url: 'https://www.nomadglobal.com',
    scraper: async (html) => {
      const $ = cheerio.load(html);
      // Nomad exchange rates
      const priceElements = $('.price, .exchange-rate, [class*="rate"]');
      
      const prices = [];
      priceElements.each((i, el) => {
        const text = $(el).text().trim();
        const match = text.match(/[\d,]+\.?\d*/);
        if (match) {
          prices.push(parseFloat(match[0].replace(/,/g, '')));
        }
      });
      
      if (prices.length >= 2) {
        return {
          buy_price: prices[0],
          sell_price: prices[1]
        };
      } else if (prices.length === 1) {
        return {
          buy_price: prices[0] * 0.999,
          sell_price: prices[0] * 1.001
        };
      }
      
      throw new Error('Could not parse rates from Nomad');
    }
  }
];

const fetchQuote = async (source) => {
  try {
    // Clear proxy settings that might cause "Invalid URL" errors
    const axiosConfig = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000,
      maxRedirects: 5,
      // Explicitly set proxy to false to avoid proxy issues
      proxy: false,
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    };
    
    const response = await axios.get(source.url, axiosConfig);
    
    if (!response.data) {
      throw new Error('Empty response');
    }
    
    const { buy_price, sell_price } = await source.scraper(response.data);
    
    // Validate prices
    if (!buy_price || !sell_price || isNaN(buy_price) || isNaN(sell_price)) {
      throw new Error('Invalid price values');
    }
    
    if (buy_price <= 0 || sell_price <= 0) {
      throw new Error('Prices must be positive');
    }
    
    return {
      source: source.url,
      buy_price: parseFloat(buy_price.toFixed(2)),
      sell_price: parseFloat(sell_price.toFixed(2)),
      currency: CURRENCY
    };
  } catch (error) {
    console.error(`Error fetching from ${source.name} (${source.url}):`, error.message);
    // Return null - we'll filter these out
    return null;
  }
};

const fetchQuotes = async () => {
  const sources = CURRENCY === 'BRL' ? BRL_SOURCES : ARS_SOURCES;
  const promises = sources.map(source => fetchQuote(source));
  
  const results = await Promise.allSettled(promises);
  const quotes = results
    .filter(result => result.status === 'fulfilled' && result.value !== null)
    .map(result => result.value);
  
  if (quotes.length > 0) {
    await saveQuotes(quotes);
    console.log(`Saved ${quotes.length} quotes to database`);
  } else {
    console.warn('No quotes were successfully fetched');
  }
  
  return quotes;
};

module.exports = {
  fetchQuotes,
  fetchQuote
};

