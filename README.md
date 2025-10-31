# CurrencyHub

CurrencyHub – central hub for exchange rates

A Node.js backend API that aggregates currency exchange rates from multiple sources and provides endpoints for quotes, averages, and slippage analysis.

## Features

- **GET /quotes** - Returns array of USD quotes from 3 different sources
- **GET /average** - Returns average buy/sell prices from all sources
- **GET /slippage** - Returns slippage percentage between each source and the average
- Automatic data refresh (max 60 seconds between updates)
- Support for ARS (Argentine Peso) and BRL (Brazilian Real)

## Currency Sources

### ARS (Argentine Peso)
- https://www.ambito.com/contenidos/dolar.html
- https://www.dolarhoy.com
- https://www.cronista.com/MercadosOnline/moneda.html?id=ARSB

### BRL (Brazilian Real)
- https://wise.com/es/currency-converter/brl-to-usd-rate
- https://nubank.com.br/taxas-conversao/
- https://www.nomadglobal.com

## Tech Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **SQLite** - Database (can be easily switched to PostgreSQL/MySQL)
- **Cheerio** - HTML parsing for web scraping
- **Axios** - HTTP client

## Installation

1. Clone the repository:
```bash
git clone https://github.com/LikithGS11/CurrencyHub.git
cd CurrencyHub
```

2. Install dependencies:
```bash
npm install
```

3. Set environment variables (optional):
```bash
# Default currency is ARS, change to BRL for Brazilian Real
export CURRENCY=ARS  # or BRL
export PORT=3000
```

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### GET /quotes

Returns an array of objects with USD quotes from different sources.

**Response:**
```json
[
  {
    "buy_price": 140.3,
    "sell_price": 144.0,
    "source": "https://www.ambito.com/contenidos/dolar.html",
    "timestamp": "2025-10-31T23:19:00.000Z"
  },
  ...
]
```

### GET /average

Returns average buy and sell prices from all sources.

**Response:**
```json
{
  "average_buy_price": 142.3,
  "average_sell_price": 147.4,
  "quote_count": 3,
  "timestamp": "2025-10-31T23:19:00.000Z"
}
```

### GET /slippage

Returns slippage percentage between each source and the average.

**Response:**
```json
[
  {
    "buy_price_slippage": 0.04,
    "sell_price_slippage": -0.06,
    "source": "https://www.ambito.com/contenidos/dolar.html",
    "buy_price": 140.3,
    "sell_price": 144.0,
    "average_buy_price": 142.3,
    "average_sell_price": 147.4
  },
  ...
]
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-31T23:19:00.000Z"
}
```

## Deployment

### Using Docker

1. Build the Docker image:
```bash
docker build -t currencyhub .
```

2. Run the container:
```bash
docker run -p 3000:3000 -e CURRENCY=ARS currencyhub
```

### Using Docker Compose

```bash
docker-compose up -d
```

### Deploy to Cloud Platforms

#### Railway
1. Connect your GitHub repository to Railway
2. Set environment variables (CURRENCY, PORT)
3. Deploy

#### Heroku
1. Create a `Procfile`:
```
web: node server.js
```
2. Deploy:
```bash
heroku create your-app-name
git push heroku main
heroku config:set CURRENCY=ARS
```

#### Render
1. Connect your GitHub repository
2. Set build command: `npm install`
3. Set start command: `node server.js`
4. Add environment variables

#### Vercel / Netlify
Note: These platforms are optimized for serverless functions. For a persistent Node.js server, consider Railway, Render, or Heroku.

## Configuration

### Environment Variables

- `CURRENCY` - Currency to fetch (default: `ARS`, options: `ARS`, `BRL`)
- `PORT` - Server port (default: `3000`)

## Data Freshness

The API ensures data is always fresh:
- Quotes are automatically fetched every 50 seconds
- Database only returns quotes from the last 60 seconds
- If no recent quotes are found, fresh data is fetched on-demand

## Database

The application uses SQLite by default. The database file (`currencyhub.db`) is automatically created on first run.

To switch to PostgreSQL or MySQL, modify `database.js` to use the appropriate database driver.

## Project Structure

```
CurrencyHub/
├── server.js           # Main server file
├── database.js         # Database operations
├── scraper.js          # Web scraping logic
├── routes/
│   └── quotes.js       # API route handlers
├── package.json        # Dependencies
├── Dockerfile          # Docker configuration
└── README.md          # This file
```

## Development Notes

### Web Scraping
- Web scraping selectors may need adjustment based on website structure changes
- Some sites may require JavaScript rendering (consider using Puppeteer/Playwright for production)
- The scraper includes error handling for failed requests
- The application gracefully handles missing data from some sources
- If a source fails, the API will still work with available sources

### Note on Ambito Source

The Ambito site currently blocks automated requests (403 Forbidden) due to anti-scraping protection.

The integration can be extended using a headless browser (Puppeteer or Playwright) to bypass this.

For the current version, the system retrieves quotes successfully from 2 live sources, ensuring functional averages and slippage calculations.

### Testing the API
Run the test script to verify all endpoints:
```bash
npm test
# Or manually:
node test-api.js
```

You can also test with curl:
```bash
# Get quotes
curl http://localhost:3000/quotes

# Get average
curl http://localhost:3000/average

# Get slippage
curl http://localhost:3000/slippage
```

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
