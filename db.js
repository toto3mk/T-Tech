const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { dataDir } = require("./config");

const dbPath = path.join(dataDir, "projects.db");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Error connecting to database:", err.message);
  else console.log(`Connected to SQLite database at: ${dbPath}`);
});

// Initialize tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submissionDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'New',
    clientName TEXT,
    contactPerson TEXT,
    email TEXT,
    phone TEXT,
    projectName TEXT,
    projectDescription TEXT,
    dueDate TEXT,
    budget REAL,
    duration INTEGER
  )`);

  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT DEFAULT 'admin'
    )`,
    (err) => {
      if (!err) {
        db.get(`SELECT * FROM users WHERE username = 'admin'`, (err, row) => {
          if (!row) {
            bcrypt.hash("password123", 10, (err, hash) => {
              if (err) console.error("Error hashing password:", err.message);
              if (hash) {
                db.run(`INSERT INTO users (username, passwordHash) VALUES (?, ?)`, ["admin", hash], (insertErr) => {
                  if (insertErr) console.error("Error creating default admin:", insertErr.message);
                  else console.log("Default admin user 'admin' (password123) created.");
                });
              }
            });
          }
        });
      }
    }
  );
});

module.exports = db;