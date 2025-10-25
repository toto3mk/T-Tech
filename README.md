# T-Tech
A Software Solution Company

T-Tech Project Inquiry Portal

This is a full-stack web application that serves a professional project inquiry form for a tech consultancy. It captures user data, saves it to a local SQLite database, and includes an optional AI-powered feature to help users generate a project brief.

🚀 Features

    Responsive Frontend: A clean, single-page inquiry form built with Tailwind CSS.

    Node.js Backend: An Express.js server to handle API requests.

    Persistent Storage: All form submissions are saved to a server-side SQLite database file (projects.db).

    Client-Side Validation: JavaScript ensures all required fields are filled and correctly formatted before submission.

    AI Integration: A (currently disabled) "Generate Project Brief" button that can call the Gemini API to help users write their project description.

🛠️ Tech Stack

    Frontend: HTML, Tailwind CSS, JavaScript (Fetch API)

    Backend: Node.js, Express.js

    Database: SQLite (using the sqlite3 npm package)

    Utilities: cors

🚦 How to Run

Follow these instructions to get the project running on your local machine.

1. Prerequisites

You must have Node.js (which includes npm) installed on your system.

2. Installation

    Clone the repository:
    Bash

git clone https://github.com/toto3mk/T-Tech.git
cd T-Tech

Install backend dependencies: This will install express, sqlite3, and cors.
Bash

    npm install

    (Note: You may need to create a package.json first with npm init -y if you don't have one.)

3. Running the Application

    Start the server:
    Bash

    node server.js

    View the application: Open your web browser and navigate to: http://localhost:3000

The server will start, automatically create the projects.db file, and serve the in.html page.

📂 Project Structure

/my_website_node
│
├── in.html                 # The main HTML frontend file
├── server.js               # The Node.js / Express backend server
├── projects.db             # The SQLite database (auto-generated)
├── package.json            # Node.js project dependencies
└── package-lock.json

🔌 API Endpoint

    GET /

        Description: Serves the main in.html page.

    POST /api/project-submission

        Description: Receives the new project inquiry as a JSON payload.

        Action: Saves the data to the inquiries table in the projects.db database.
