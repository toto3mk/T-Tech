
-----

# T-Tech Solutions - Project Inquiry Portal

This is a full-stack web application built for **T-Tech Solutions** to streamline the project inquiry process. It provides a professional, client-facing portal for submitting new project details and a secure, private admin dashboard for employees to review, manage, and track the status of those submissions.

##  Features

### Client-Facing

  * **Portal Homepage (`index.html`):** A beautiful landing page that directs users to either the client form or the admin login. Includes a company description and a "What We Do" section.
  * **Project Inquiry Form (`project.html`):** A multi-step form for clients to submit detailed project information, including client details, project scope, budget, and due date.
  * **Form Validation:** The submission form features robust client-side validation to ensure all required fields are filled out correctly.
  * **Contact Modal:** A "Contact" button that opens a pop-up modal with your name and email address.

### Admin Dashboard

  * **Secure Login (`login.html`):** A token-based, secure authentication system. Passwords are **hashed** using `bcrypt` and are not stored in plain text.
  * **Project Management (`admin.html`):** A complete dashboard to manage all client submissions.
  * **Full CRUD:** Admins can **Read** all inquiries, **Update** them using an "Edit" modal, and **Delete** them from the database.
  * **Status Tracking:** Admins can change the status of any project (e.g., "New," "Reviewing," "In Progress," "Completed") directly from a dropdown in the table.

## Tech Stack

  * **Backend:**
      * **Node.js:** JavaScript runtime for the server.
      * **Express.js:** Web application framework for creating the API.
      * **SQLite3:** The file-based database used to store all inquiries and user data.
      * **jsonwebtoken (`jwt`):** For creating secure login tokens (sessions).
      * **bcryptjs:** For securely hashing all user passwords.
      * **dotenv:** For protecting secret keys (like `JWT_SECRET`) from being exposed in the code.
  * **Frontend:**
      * **HTML5**
      * **Tailwind CSS:** For all styling and layout.
      * **Vanilla JavaScript (ES6+):** For form validation, API calls (`fetch`), and DOM manipulation.

## Project Structure

```
/T-Tech-Project
|
|-- node_modules/     (Created by npm install)
|-- .env               (You must create this!)
|-- server.js          (The entire backend)
|-- projects.db        (Database - created automatically)
|-- package.json       (Manages dependencies)
|-- package-lock.json  (Manages dependencies)
|-- README.md          (This file)
|
|-- index.html         (The main portal/welcome page)
|-- project.html       (The client submission form)
|-- login.html         (The admin login page)
|-- admin.html         (The admin dashboard)
```

-----

## Installation & Setup

Follow these steps to run the project on your local machine.

### 1\. Install Dependencies

You must have [Node.js](https://nodejs.org/) installed. Open your terminal in the project folder and run:

```bash
npm install express cors sqlite3 jsonwebtoken bcryptjs dotenv
```

### 2\. Create Your Environment File (Critical\!)

This is the most important step for security.

1.  Create a new file in the project folder named exactly `.env`
2.  Copy and paste the following into that file:

<!-- end list -->

```env
# This is your secret key for creating login tokens
JWT_SECRET=your-own-super-secure-secret-key-goes-here

# The port your server will run on
PORT=3000
```

**Note:** The server **will not start** without this file.

### 3\. Run the Server

In your terminal, run:

```bash
node server.js
```

You should see the following output, which confirms the server is running and your database and default admin user have been created:

```
Connected to SQLite database.
Default admin user 'admin' (password123) created.
Server running on http://localhost:3000
```

### 4\. Access the Application

Your project is now live\!

  * **Main Portal:** [http://localhost:3000/](https://www.google.com/search?q=http://localhost:3000/)
  * **Admin Login:** [http://localhost:3000/login.html](https://www.google.com/search?q=http://localhost:3000/login.html)

-----

## How to Use

### Client Workflow

1.  Go to `http://localhost:3000`.
2.  Read the company description.
3.  Click **"I'm a Client"**.
4.  Fill out the project inquiry form and click "Submit Inquiry."

### Admin Workflow

1.  Go to `http://localhost:3000` and click **"Admin & Staff"**, or go directly to `http://localhost:3000/login.html`.
2.  Log in with your credentials. The default user is:
      * **Username:** `admin`
      * **Password:** `password123`
3.  You will be redirected to the `admin.html` dashboard.
4.  Here you can:
      * **View** all submissions.
      * **Change** a project's status using the dropdown.
      * **Edit** all of a project's details by clicking "Edit."
      * **Delete** a project by clicking "Delete."

### How to Manually Add a New Admin User

Since the User Management UI has been removed, new users must be added directly to the database.

1.  **Stop the server** (press `Ctrl+C` in your terminal).
2.  Go to an online `bcrypt` generator (like [bcrypt-generator.com](https://bcrypt-generator.com/)).
3.  Enter a new password (e.g., `new_pass_123`) and copy the generated **hash**.
4.  Open your `projects.db` file with a database tool (like [DB Browser for SQLite](https://sqlitebrowser.org/)).
5.  Go to the **Browse Data** tab and select the **`users`** table.
6.  Click **"New Record"** and enter the new user's info:
      * **`username`**: The new login name (e.g., `taha`).
      * **`passwordHash`**: The `bcrypt` hash you copied (e.g., `$2a$10$...`).
      * **`role`**: `admin`.
7.  Click **"Write Changes"** to save to the database.
8.  Close the database browser.
9.  **Restart your server** (`node server.js`).

The new user can now log in.
