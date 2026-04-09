require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Groq = require("groq-sdk");
const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
  process.exit(1);
}

// Database Setup
const db = new sqlite3.Database("./backEnd/projects.db", (err) => {
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
app.use(helmet()); // Add basic HTTP headers for security
app.use(cors());
app.use(express.json({ limit: "10kb" })); // Limit payload to 10kb
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Static file serving
app.use(express.static(path.join(__dirname, 'frontEnd', 'pages')));
app.use('/styles', express.static(path.join(__dirname, 'frontEnd', 'styles')));
app.use('/scripts', express.static(path.join(__dirname, 'frontEnd', 'scripts')));
app.use('/images', express.static(path.join(__dirname, 'frontEnd', 'pages', 'images')));

// Rate Limiting Configs
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  message: { message: "Too many requests, please try again later." }
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 login requests per window
  message: { message: "Too many login attempts, please try again later." }
});

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

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Endpoint to help clients phrase their project description
app.post("/api/rephrase", async (req, res) => {
  const { draftText } = req.body;

  if (!draftText) {
    return res.status(400).json({ polishedText: "Please provide some text to rephrase." });
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a technical project manager. Rephrase the user's input into professional technical requirements. DO NOT use ANY Markdown formatting (no asterisks `*` or `**` for bolding/lists). Use standard plain text formatting with clear paragraph breaks. For lists, explicitly use plain dashes (-) instead of bullets."
        },
        { role: "user", content: draftText }
      ],
      model: "llama-3.3-70b-versatile", // Make sure there is a comma after this line
    });

    const result = chatCompletion.choices[0]?.message?.content;
    res.json({ polishedText: result });
  } catch (error) {
    console.error("GROQ API ERROR:", error); // Check your terminal for this!
    res.status(500).json({
      polishedText: "Error: Could not connect to AI. Please check your API key."
    });
  }
});

//    PUBLIC ROUTES
// Submit New Project
app.post("/api/project-submission", apiLimiter, (req, res) => {
  const data = req.body;

  // Basic Server-Side Validation
  if (!data.clientName || !data.contactPerson || !data.email || !data.projectName || !data.dueDate || data.budget === undefined) {
    return res.status(400).json({ message: "Missing required fields." });
  }
  if (isNaN(data.budget) || data.budget <= 0) {
    return res.status(400).json({ message: "Budget must be a positive number." });
  }
  if (data.duration !== undefined && data.duration !== null && (isNaN(data.duration) || data.duration <= 0)) {
    return res.status(400).json({ message: "Duration must be a positive number." });
  }

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
app.post("/api/login", authLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }
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
  // Rigorous Validation for Updates
  if (!d.clientName || !d.contactPerson || !d.email || !d.projectName || !d.dueDate || d.budget === undefined) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  if (isNaN(d.budget) || d.budget <= 0) {
    return res.status(400).json({ error: "Budget must be a positive number." });
  }
  if (d.duration !== undefined && d.duration !== null && (isNaN(d.duration) || d.duration <= 0)) {
    return res.status(400).json({ error: "Duration must be a positive number." });
  }

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