require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
  process.exit(1);
}

// Database Setup
const db = new sqlite3.Database("./projects.db", (err) => {
  if (err) console.error("Error connecting to database:", err.message);
  else console.log("Connected to SQLite database.");
});

// Initialize Database Tables
db.serialize(() => {
  // Inquiries Table (Includes 'projectDescription' and 'status')
  db.run(`CREATE TABLE IF NOT EXISTS inquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        submissionDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'New',
        clientName TEXT,
        contactPerson TEXT,
        email TEXT,
        phone TEXT,
        projectName TEXT,
        projectDescription TEXT,  -- Field for project description
        dueDate TEXT,
        budget REAL,
        duration INTEGER
    )`);

  // 2. Users Table
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        role TEXT DEFAULT 'admin'
    )`,
    (err) => {
      if (!err) {
        // Check for default admin on startup
        db.get(`SELECT * FROM users WHERE username = 'admin'`, (err, row) => {
          if (!row) {
            bcrypt.hash("password123", 10, (err, hash) => {
              if (err) {
                console.error("Error hashing password:", err.message);
                return;
              }
              if (hash) {
                db.run(
                  `INSERT INTO users (username, passwordHash) VALUES (?, ?)`,
                  ["admin", hash],
                  (insertErr) => {
                    if (insertErr) {
                      console.error("Error creating default admin:", insertErr.message);
                    } else {
                      console.log(
                        "Default admin user 'admin' (password123) created."
                      );
                    }
                  }
                );
              }
            });
          }
        });
      }
    }
  );
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null)
    return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token invalid/expired" });
    req.user = user;
    next();
  });
}

//    PUBLIC ROUTES
// Submit New Project
app.post("/api/project-submission", (req, res) => {
  const data = req.body;
  // Ensure the query includes projectDescription
  const sql = `INSERT INTO inquiries (clientName, contactPerson, email, phone, projectName, projectDescription, dueDate, budget, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [
    data.clientName,
    data.contactPerson,
    data.email,
    data.phone,
    data.projectName,
    data.projectDescription, // <-- Included data parameter
    data.dueDate,
    data.budget,
    data.duration,
  ];

  db.run(sql, params, function (err) {
    if (err)
      return res
        .status(500)
        .json({ message: "Database error", error: err.message });
    console.log(`New inquiry ID ${this.lastID}: ${data.projectName}`);
    res.status(201).json({ message: "Inquiry received", id: this.lastID });
  });
});

// Admin Login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    bcrypt.compare(password, user.passwordHash, (err, isMatch) => {
      if (isMatch) {
        const token = jwt.sign(
          { id: user.id, username: user.username, role: user.role },
          JWT_SECRET,
          { expiresIn: "2h" }
        );
        // Send back the username to be stored in localStorage
        res.json({
          message: "Login successful",
          token,
          username: user.username,
        });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    });
  });
});

//   PROTECTED PROJECT ROUTES

// GET all projects
app.get("/api/projects", authenticateToken, (req, res) => {
  db.all(
    "SELECT * FROM inquiries ORDER BY submissionDate DESC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// DELETE project
app.delete("/api/projects/:id", authenticateToken, (req, res) => {
  db.run("DELETE FROM inquiries WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Project deleted", changes: this.changes });
  });
});

// project details
app.put("/api/projects/:id", authenticateToken, (req, res) => {
  const d = req.body;
  // Ensure the update query includes projectDescription
  const sql = `UPDATE inquiries SET clientName=?, contactPerson=?, email=?, phone=?, projectName=?, projectDescription=?, dueDate=?, budget=?, duration=? WHERE id=?`;
  const params = [
    d.clientName,
    d.contactPerson,
    d.email,
    d.phone,
    d.projectName,
    d.projectDescription || null, // <-- Included data parameter
    d.dueDate,
    d.budget,
    d.duration,
    req.params.id,
  ];
  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Project updated", changes: this.changes });
  });
});

app.patch("/api/projects/:id/status", authenticateToken, (req, res) => {
  const { status } = req.body;
  db.run(
    "UPDATE inquiries SET status = ? WHERE id = ?",
    [status, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        message: `Status updated to ${status}`,
        changes: this.changes,
      });
    }
  );
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
