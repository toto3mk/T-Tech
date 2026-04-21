const bcrypt = require("bcryptjs");
const db = require("../db");

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.log("Usage: node add_user.js <username> <password>");
  process.exit(1);
}

bcrypt.hash(password, 10, (err, hash) => {
  db.run(
    `INSERT INTO users (username, passwordHash, role) VALUES (?, ?, ?)`,
    [username, hash, 'admin'],
    (err) => {
      if (err) console.error("Error:", err.message);
      else console.log(`User "${username}" created successfully`);
      db.close();
    }
  );
});