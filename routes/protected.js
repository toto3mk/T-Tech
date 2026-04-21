const express = require("express");
const { authenticateToken } = require("../middleware");
const db = require("../db");
const bcrypt = require("bcryptjs");

const router = express.Router();

// GET all projects
router.get("/projects", authenticateToken, (req, res) => {
  db.all("SELECT * FROM inquiries ORDER BY submissionDate DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// DELETE project
router.delete("/projects/:id", authenticateToken, (req, res) => {
  db.run("DELETE FROM inquiries WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Project deleted", changes: this.changes });
  });
});

// UPDATE project details
router.put("/projects/:id", authenticateToken, (req, res) => {
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

  const sql = `UPDATE inquiries SET clientName=?, contactPerson=?, email=?, phone=?, projectName=?, projectDescription=?, dueDate=?, budget=?, duration=? WHERE id=?`;
  const params = [d.clientName, d.contactPerson, d.email, d.phone, d.projectName, d.projectDescription || null, d.dueDate, d.budget, d.duration, req.params.id];

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Project updated", changes: this.changes });
  });
});

// UPDATE project status
router.patch("/projects/:id/status", authenticateToken, (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status is required." });

  db.run("UPDATE inquiries SET status = ? WHERE id = ?", [status, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: `Status updated to ${status}`, changes: this.changes });
  });
});

// CREATE new user (admin only)
router.post("/users", authenticateToken, (req, res) => {
  const { username, password, role } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: "Error hashing password" });
    
    db.run(
      `INSERT INTO users (username, passwordHash, role) VALUES (?, ?, ?)`,
      [username, hash, role || 'admin'],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: "Username already exists" });
          }
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: "User created", userId: this.lastID });
      }
    );
  });
});

module.exports = router;