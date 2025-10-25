const express = require('express');
const path = require('path');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose(); 
const app = express();
const port = 3000;

// --- Database Setup ---

const db = new sqlite3.Database('./projects.db', (err) => {
    if (err) {
        console.error("Error connecting to database:", err.message);
    } else {
        console.log('Connected to the projects SQLite database.');
    }
});

// (only if it doesn't exist)
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS inquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        submissionDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        clientName TEXT,
        contactPerson TEXT,
        email TEXT,
        phone TEXT,
        projectName TEXT,
        projectDescription TEXT,
        dueDate TEXT,
        budget REAL,
        duration INTEGER
    )`, (err) => {
        if (err) {
            console.error("Error creating table:", err.message);
        } else {
            console.log("Table 'inquiries' is ready.");
        }
    });
});

//  Middleware 
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//  Route 1: HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); 
});

//  Route 2: Handle the form data 
app.post('/api/project-submission', (req, res) => {
    const data = req.body;

    // Log it (still useful for debugging)
    console.log(`--- New PROJECT INQUIRY Received ---`);
    console.log(`Client: ${data.clientName}, Project: ${data.projectName}`);

    //  Insert into Database 
    const sql = `INSERT INTO inquiries (
        clientName, contactPerson, email, phone, 
        projectName, projectDescription, dueDate, budget, duration
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        data.clientName,
        data.contactPerson,
        data.email,
        data.phone,
        data.projectName,
        data.projectDescription, 
        data.dueDate,
        data.budget,
        data.duration
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error("Database insert error:", err.message);
            res.status(500).json({ message: "Error saving to database", error: err.message });
            return;
        }

        // True
        console.log(`New inquiry saved to database with ID: ${this.lastID}`);
        res.status(200).json({ 
            message: `Inquiry for '${data.projectName}' received and stored successfully.`,
            databaseId: this.lastID 
        });
    });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running! Open http://YourServerPublicIp:${port} in your browser.`);
});
