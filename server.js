require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const { Pool } = require("pg");
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

// PostgreSQL Pool Setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

// Initialize Database Tables
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Create Inquiries Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id SERIAL PRIMARY KEY,
        "submissionDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'New',
        "clientName" TEXT,
        "contactPerson" TEXT,
        email TEXT,
        phone TEXT,
        "projectName" TEXT,
        "projectDescription" TEXT,
        "dueDate" TEXT,
        budget REAL,
        duration INTEGER
      )
    `);

    // Create Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        "passwordHash" TEXT NOT NULL,
        role TEXT DEFAULT 'admin'
      )
    `);

    // Create default admin user if not exists
    const { rows } = await client.query("SELECT * FROM users WHERE username = $1", ["admin"]);
    if (rows.length === 0) {
      const hash = await bcrypt.hash("password123", 10);
      await client.query(
        `INSERT INTO users (username, "passwordHash") VALUES ($1, $2)`,
        ["admin", hash]
      );
      console.log("Default admin user 'admin' (password123) created.");
    }

    console.log("Database initialized successfully.");
  } catch (err) {
    console.error("Database initialization error:", err.message);
  } finally {
    client.release();
  }
}

initializeDatabase();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Static file serving
app.use(express.static(path.join(__dirname, 'frontEnd', 'pages')));
app.use('/styles', express.static(path.join(__dirname, 'frontEnd', 'styles')));
app.use('/scripts', express.static(path.join(__dirname, 'frontEnd', 'scripts')));
app.use('/images', express.static(path.join(__dirname, 'frontEnd', 'pages', 'images')));

// Rate Limiting Configs
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests, please try again later." }
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
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

// AI Rephrase Endpoint
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
      model: "llama-3.3-70b-versatile",
    });

    const result = chatCompletion.choices[0]?.message?.content;
    res.json({ polishedText: result });
  } catch (error) {
    console.error("GROQ API ERROR:", error);
    res.status(500).json({
      polishedText: "Error: Could not connect to AI. Please check your API key."
    });
  }
});

// PUBLIC ROUTES

// Submit New Project
app.post("/api/project-submission", apiLimiter, async (req, res) => {
  const data = req.body;

  if (!data.clientName || !data.contactPerson || !data.email || !data.projectName || !data.dueDate || data.budget === undefined) {
    return res.status(400).json({ message: "Missing required fields." });
  }
  if (isNaN(data.budget) || data.budget <= 0) {
    return res.status(400).json({ message: "Budget must be a positive number." });
  }
  if (data.duration !== undefined && data.duration !== null && (isNaN(data.duration) || data.duration <= 0)) {
    return res.status(400).json({ message: "Duration must be a positive number." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO inquiries ("clientName", "contactPerson", email, phone, "projectName", "projectDescription", "dueDate", budget, duration)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [data.clientName, data.contactPerson, data.email, data.phone, data.projectName, data.projectDescription, data.dueDate, data.budget, data.duration]
    );
    const newId = result.rows[0].id;
    console.log(`New inquiry ID ${newId}: ${data.projectName}`);
    res.status(201).json({ message: "Inquiry received", id: newId });
  } catch (err) {
    res.status(500).json({ message: "Database error", error: err.message });
  }
});

// Admin Login
app.post("/api/login", authLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (rows.length === 0) return res.status(401).json({ message: "Invalid credentials" });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (isMatch) {
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "2h" }
      );
      res.json({ message: "Login successful", token, username: user.username });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
});

// PROTECTED PROJECT ROUTES

// GET all projects
app.get("/api/projects", authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM inquiries ORDER BY "submissionDate" DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE project
app.delete("/api/projects/:id", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM inquiries WHERE id = $1", [req.params.id]);
    res.json({ message: "Project deleted", changes: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE project details
app.put("/api/projects/:id", authenticateToken, async (req, res) => {
  const d = req.body;
  if (!d.clientName || !d.contactPerson || !d.email || !d.projectName || !d.dueDate || d.budget === undefined) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  if (isNaN(d.budget) || d.budget <= 0) {
    return res.status(400).json({ error: "Budget must be a positive number." });
  }
  if (d.duration !== undefined && d.duration !== null && (isNaN(d.duration) || d.duration <= 0)) {
    return res.status(400).json({ error: "Duration must be a positive number." });
  }

  try {
    const result = await pool.query(
      `UPDATE inquiries SET "clientName"=$1, "contactPerson"=$2, email=$3, phone=$4, "projectName"=$5, "projectDescription"=$6, "dueDate"=$7, budget=$8, duration=$9 WHERE id=$10`,
      [d.clientName, d.contactPerson, d.email, d.phone, d.projectName, d.projectDescription || null, d.dueDate, d.budget, d.duration, req.params.id]
    );
    res.json({ message: "Project updated", changes: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE project status
app.patch("/api/projects/:id/status", authenticateToken, async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status is required." });

  try {
    const result = await pool.query(
      "UPDATE inquiries SET status = $1 WHERE id = $2",
      [status, req.params.id]
    );
    res.json({ message: `Status updated to ${status}`, changes: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await pool.end();
  console.log('Database pool closed.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await pool.end();
  console.log('Database pool closed.');
  process.exit(0);
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});