const Groq = require("groq-sdk");
require("dotenv").config();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
async function main() {
  try {
    const models = await groq.models.list();
    console.log(JSON.stringify(models, null, 2));
  } catch (e) {
    console.error("Error fetching models:", e.message);
  }
}
main();
