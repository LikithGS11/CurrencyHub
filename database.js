const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'currencyhub.db');
let db;

const initDatabase = () => {
  db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      return;
    }
    console.log('Connected to SQLite database');
    
    // Create quotes table
    db.run(`
      CREATE TABLE IF NOT EXISTS quotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        buy_price REAL NOT NULL,
        sell_price REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source, created_at)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
      } else {
        console.log('Quotes table ready');
      }
    });
  });
};

const saveQuotes = (quotes) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO quotes (source, buy_price, sell_price, currency, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    
    quotes.forEach((quote) => {
      stmt.run(quote.source, quote.buy_price, quote.sell_price, quote.currency || 'USD');
    });
    
    stmt.finalize((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const getLatestQuotes = () => {
  return new Promise((resolve, reject) => {
    // Get quotes from the last 60 seconds
    db.all(`
      SELECT source, buy_price, sell_price, currency, created_at
      FROM quotes
      WHERE datetime(created_at) > datetime('now', '-60 seconds')
      ORDER BY created_at DESC
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        // Get the latest quote from each source
        const latestBySource = {};
        rows.forEach(row => {
          if (!latestBySource[row.source] || 
              new Date(row.created_at) > new Date(latestBySource[row.source].created_at)) {
            latestBySource[row.source] = row;
          }
        });
        resolve(Object.values(latestBySource));
      }
    });
  });
};

const getAllQuotes = () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT source, buy_price, sell_price, currency, created_at
      FROM quotes
      WHERE datetime(created_at) > datetime('now', '-60 seconds')
      ORDER BY created_at DESC
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const closeDatabase = () => {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
    });
  }
};

module.exports = {
  initDatabase,
  saveQuotes,
  getLatestQuotes,
  getAllQuotes,
  closeDatabase
};

