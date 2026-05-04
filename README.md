# Smart Exam Hall Verification System

A secure and smart exam hall entry verification system that uses face recognition to verify student identity before entering the examination hall. Replaces traditional hall ticket/manual verification with a digital automated process.

## Features

- **Face Recognition**: AI-powered face recognition for accurate student verification
- **Secure Access**: Role-based authentication with Supabase Auth
- **Student Management**: Easy registration and management of student records
- **Verification Logs**: Comprehensive logging with export capabilities
- **Real-time Dashboard**: Live statistics and analytics
- **Dark Mode**: Modern UI with light/dark theme support
- **Responsive Design**: Mobile-friendly interface

## Tech Stack

### Frontend
- React 19 with Vite
- React Router DOM
- Tailwind CSS
- Axios
- Lucide React Icons
- Recharts (for analytics)
- date-fns (for date formatting)

### Backend
- Python Flask
- Flask-CORS
- Supabase Python SDK
- face_recognition library
- OpenCV
- Pillow

### Database & Storage
- Supabase PostgreSQL
- Supabase Storage (for student images)
- Supabase Auth (for authentication)

## Project Structure

```
SmartExamHallVerification/
├── backend/
│   ├── routes/
│   │   ├── auth.py          # Authentication routes
│   │   ├── students.py      # Student management routes
│   │   ├── verification.py  # Face verification routes
│   │   └── logs.py          # Logs routes
│   ├── utils/
│   │   ├── supabase_client.py       # Supabase client setup
│   │   └── face_recognition_utils.py # Face recognition utilities
│   ├── uploads/             # Temporary upload directory
│   ├── app.py              # Flask application entry point
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example        # Environment variables template
│   └── supabase_schema.sql # Database schema
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── Toast.jsx
│   │   ├── context/        # React contexts
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── pages/          # Page components
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── RegisterStudent.jsx
│   │   │   ├── FaceVerification.jsx
│   │   │   ├── Logs.jsx
│   │   │   └── NotFound.jsx
│   │   ├── services/       # API services
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── .env.example
└── README.md
```

## Prerequisites

- Python 3.8 or higher
- Node.js 18 or higher
- npm or yarn
- Supabase account (free tier works fine)
- Webcam (for face capture)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd SmartExamHallVerification
```

### 2. Supabase Setup

1. Create a new project on [Supabase](https://supabase.com)
2. Go to SQL Editor and run the schema from `backend/supabase_schema.sql`
3. Go to Storage and create a new bucket named `student-images`
4. Set the bucket to public and configure RLS policies (see schema file for details)
5. Get your project credentials from Settings → API:
   - Project URL
   - Service Role Key (for backend)
   - Anon Key (for frontend)

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Note: Installing dlib may require additional system dependencies
# On Windows, you may need to install CMake and Visual C++ Build Tools
# On Ubuntu/Debian:
# sudo apt-get install cmake libopenblas-dev liblapack-dev libx11-dev

# Create environment file
cp .env.example .env

# Edit .env with your Supabase credentials
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your API URL and Supabase credentials
```

### 5. Create Admin User

1. Go to Supabase Dashboard → Authentication
2. Click "Add User" or use the API to create an admin user
3. Set the user's role to 'admin' in the profiles table

## Running the Application

### Start the Backend

```bash
cd backend

# Activate virtual environment (if not already activated)
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# Run Flask app
python app.py
```

The backend will run on `http://localhost:5000`

### Start the Frontend

```bash
cd frontend

# Run development server
npm run dev
```

The frontend will run on `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/login` - Admin login
- `POST /api/logout` - Logout
- `GET /api/me` - Get current user

### Students
- `POST /api/register-student` - Register new student
- `GET /api/students` - Get all students
- `GET /api/student/<id>` - Get student by ID
- `GET /api/student/by-register/<register_no>` - Get student by register number
- `PUT /api/student/<id>` - Update student
- `DELETE /api/student/<id>` - Delete student

### Verification
- `POST /api/verify-face` - Verify face
- `POST /api/check-face` - Check if face is present
- `GET /api/stats` - Get verification statistics

### Logs
- `GET /api/logs` - Get verification logs
- `GET /api/logs/export` - Export logs as CSV
- `GET /api/logs/<id>` - Get log by ID
- `GET /api/logs/summary` - Get logs summary

## Usage Guide

### 1. Admin Login
- Navigate to `/login`
- Enter your admin credentials
- You'll be redirected to the Dashboard

### 2. Register Students
- Go to "Register Student" page
- Fill in student details (Name, Register Number, Department, Year)
- Capture or upload a clear face photo
- Click "Register Student"

### 3. Verify Students
- Go to "Verify" page
- Enter the student's register number (optional)
- Position the student's face in front of the camera
- Click "Capture Photo"
- Click "Verify Face"
- View the verification result

### 4. View Logs
- Go to "Logs" page
- Search, filter, and view verification history
- Export logs as CSV for reporting

## Face Recognition Tips

For best results:
- Ensure good lighting (avoid backlight)
- Face should be clearly visible and centered
- Neutral expression with eyes open
- Remove glasses, hats, or face coverings
- Maintain consistent distance from camera

## Deployment

### Backend Deployment (Render/Railway/Heroku)

1. Create a `Procfile`:
```
web: gunicorn app:app
```

2. Set environment variables in your deployment platform

3. Deploy the backend

### Frontend Deployment (Vercel/Netlify)

1. Build the project:
```bash
npm run build
```

2. Deploy the `dist` folder to your hosting platform

3. Set environment variables for production API URL

## Troubleshooting

### Face Recognition Issues
- **dlib installation fails**: Install CMake and Visual C++ Build Tools (Windows) or `libopenblas-dev` (Linux)
- **Poor recognition accuracy**: Ensure good lighting and clear face visibility
- **No face detected**: Check camera permissions and face positioning

### Backend Issues
- **CORS errors**: Check `FRONTEND_URL` in backend `.env`
- **Supabase connection errors**: Verify credentials in `.env`

### Frontend Issues
- **API not found**: Check `VITE_API_URL` in frontend `.env`
- **Webcam not working**: Ensure browser permissions for camera access

## Security Considerations

- Never commit `.env` files to version control
- Use strong SECRET_KEY in production
- Enable RLS policies in Supabase
- Use HTTPS in production
- Regularly update dependencies
- Store student images securely with proper access controls

## License

MIT License - feel free to use this project for educational purposes.

## Support

For issues and feature requests, please create an issue in the repository.

---

Built with ❤️ for secure exam management
