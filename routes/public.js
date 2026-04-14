const express = require("express");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Groq = require("groq-sdk");
const { jwtSecret, groqApiKey } = require("../config");
const db = require("../db");

const router = express.Router();

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

const groq = new Groq({ apiKey: groqApiKey });

// AI Rephrase Endpoint
router.post("/rephrase", async (req, res) => {
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
    res.status(500).json({ polishedText: "Error: Could not connect to AI. Please check your API key." });
  }
});

// Submit New Project
router.post("/project-submission", apiLimiter, (req, res) => {
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

  const sql = `INSERT INTO inquiries (clientName, contactPerson, email, phone, projectName, projectDescription, dueDate, budget, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [data.clientName, data.contactPerson, data.email, data.phone, data.projectName, data.projectDescription, data.dueDate, data.budget, data.duration];

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ message: "Database error", error: err.message });
    console.log(`New inquiry ID ${this.lastID}: ${data.projectName}`);
    res.status(201).json({ message: "Inquiry received", id: this.lastID });
  });
});

// Admin Login
router.post("/login", authLimiter, (req, res) => {
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
          jwtSecret,
          { expiresIn: "2h" }
        );
        res.json({ message: "Login successful", token, username: user.username });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    });
  });
});

module.exports = router;