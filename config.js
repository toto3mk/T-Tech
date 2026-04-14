require("dotenv").config();

const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  groqApiKey: process.env.GROQ_API_KEY,
  dataDir: require("fs").existsSync("/app/.data") ? "/app/.data" : require("path").join(__dirname, "backEnd"),
};

if (!config.jwtSecret) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
  process.exit(1);
}

module.exports = config;