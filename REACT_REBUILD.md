# T-Tech Solutions - React Rebuild

Your application has been successfully rebuilt with React while maintaining all existing functionality!

## Project Structure

```
/
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── pages/         # Page components
│   │   ├── styles/        # CSS files
│   │   ├── utils/         # API utilities
│   │   ├── App.js         # Main app with routing
│   │   └── index.js       # Entry point
│   ├── public/            # Static assets
│   ├── package.json
│   └── .env               # Frontend environment
├── server.js              # Express backend
├── config.js              # Backend config
├── db.js                  # Database setup
├── routes/                # API routes
├── middleware.js          # Auth middleware
├── package.json           # Backend dependencies
└── .env                   # Backend environment
```

## Development Setup

### 1. Install Backend Dependencies
```bash
npm install
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 3. Start Backend (Port 3000)
```bash
npm start
```
or
```bash
node server.js
```

The backend API will be available at `http://localhost:3000/api`

### 4. Start Frontend Development Server (in another terminal, Port 3000 proxy)
```bash
cd frontend
npm start
```

This will open the React app in your browser. The proxy in `frontend/package.json` automatically routes API calls to the backend.

## Pages & Routes

- **`/`** - Home page (landing)
- **`/project`** - Project inquiry form
- **`/login`** - Admin login
- **`/admin`** - Admin dashboard (protected)

## Building for Production

### Build the React App
```bash
cd frontend
npm run build
cd ..
```

This creates an optimized build in `frontend/build/`

### Run Production
```bash
npm start
```

The server will automatically serve the React production build from `frontend/build/` directory.

## Key Features Preserved

✅ Landing page with service cards
✅ Project submission form with validation
✅ AI-powered project description rephrasing
✅ Admin login with JWT authentication
✅ Admin dashboard for project management
✅ Project CRUD operations
✅ Status management
✅ Search and filtering
✅ Responsive design with Tailwind CSS
✅ Toast notifications

## Environment Variables

### Backend (.env)
```
PORT=3000
JWT_SECRET=your-secret-key-change-this-in-production
GROQ_API_KEY=your-groq-api-key
```

### Frontend (frontend/.env)
```
REACT_APP_API_BASE=http://localhost:3000/api
```

## Testing Login

Default credentials:
- **Username:** admin
- **Password:** password123

**Important:** Change these in production!

## API Endpoints

All existing API endpoints remain unchanged:

- `POST /api/login` - Admin login
- `POST /api/project-submission` - Submit project inquiry
- `POST /api/rephrase` - AI text rephrasing
- `GET /api/projects` - Get all projects (protected)
- `PUT /api/projects/:id` - Update project (protected)
- `DELETE /api/projects/:id` - Delete project (protected)
- `PATCH /api/projects/:id/status` - Update status (protected)

## Technologies Used

**Frontend:**
- React 18
- React Router v6
- Axios
- Tailwind CSS
- CSS Grid & Animations

**Backend:**
- Express.js
- SQLite3
- JWT Authentication
- Groq API (AI)
- Helmet (Security)
- CORS

## Notes

- The backend automatically detects whether to serve the React build or the old frontend structure
- All styling uses Tailwind CSS classes (configured via CDN)
- The app maintains a responsive, modern design with smooth animations
- Database uses SQLite and persists in `backEnd/` directory
- API rate limiting is applied to prevent abuse

## Troubleshooting

**Port 3000 already in use:**
```bash
# Find and kill the process using port 3000
lsof -i :3000
kill -9 <PID>
```

**Frontend not connecting to backend:**
- Ensure backend is running on port 3000
- Check `frontend/package.json` proxy setting
- Verify `.env` files are configured correctly

**React build issues:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

Enjoy your new React-powered T-Tech Solutions app! 🚀
