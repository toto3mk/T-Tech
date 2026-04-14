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

// Static file serving
app.use(express.static(path.join(__dirname, 'frontEnd', 'pages')));
app.use('/styles', express.static(path.join(__dirname, 'frontEnd', 'styles')));
app.use('/scripts', express.static(path.join(__dirname, 'frontEnd', 'scripts')));
app.use('/images', express.static(path.join(__dirname, 'frontEnd', 'pages', 'images')));

// Routes
app.use(routes);

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