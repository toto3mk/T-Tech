const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const { port } = require("./config");
const db = require("./db");
const routes = require("./routes");

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// API Routes - must be before static files for priority
app.use(routes);

// Static file serving - serve React build if available, otherwise serve old frontend
const buildPath = path.join(__dirname, 'frontend', 'build');
const fs = require('fs');
if (fs.existsSync(buildPath)) {
  // Serve React production build
  app.use(express.static(buildPath));
  // SPA routing - serve index.html for all unknown routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  // Fallback to old frontend structure for development
  app.use(express.static(path.join(__dirname, 'frontEnd', 'pages')));
  app.use('/styles', express.static(path.join(__dirname, 'frontEnd', 'styles')));
  app.use('/scripts', express.static(path.join(__dirname, 'frontEnd', 'scripts')));
  app.use('/images', express.static(path.join(__dirname, 'frontEnd', 'pages', 'images')));
}

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) console.error('Error closing database:', err.message);
    else console.log('Database connection closed.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  db.close((err) => {
    if (err) console.error('Error closing database:', err.message);
    else console.log('Database connection closed.');
    process.exit(0);
  });
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});