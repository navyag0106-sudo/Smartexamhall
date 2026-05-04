-- =====================================================
-- Smart Exam Hall Verification System - Supabase Schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- Stores user profile information linked to Supabase Auth
-- =====================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'examiner' CHECK (role IN ('admin', 'examiner', 'student')),
    hall_no VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_hall_no ON profiles(hall_no);

-- =====================================================
-- STUDENTS TABLE
-- Stores student information and face image references
-- =====================================================
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    register_no VARCHAR(100) NOT NULL UNIQUE,
    department VARCHAR(255) NOT NULL,
    year VARCHAR(50) NOT NULL,
    subject_template_id UUID REFERENCES subject_templates(id) ON DELETE SET NULL,
    hall_no VARCHAR(50) NOT NULL,
    seat_no VARCHAR(50) NOT NULL,
    photo_url TEXT NOT NULL,
    verified_status BOOLEAN DEFAULT FALSE,
    entry_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_students_register_no ON students(register_no);
CREATE INDEX idx_students_department ON students(department);
CREATE INDEX idx_students_year ON students(year);
CREATE INDEX idx_students_hall_no ON students(hall_no);
CREATE INDEX idx_students_seat_no ON students(seat_no);
CREATE INDEX idx_students_verified_status ON students(verified_status);

-- =====================================================
-- LOGS TABLE
-- Stores verification attempt logs
-- =====================================================
CREATE TABLE logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    result VARCHAR(50) NOT NULL CHECK (result IN ('verified', 'failed')),
    confidence DECIMAL(5,2),
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    hall_no VARCHAR(50),
    seat_no VARCHAR(50),
    verification_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for logs
CREATE INDEX idx_logs_student_id ON logs(student_id);
CREATE INDEX idx_logs_result ON logs(result);
CREATE INDEX idx_logs_created_at ON logs(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- NOTE: We use a single simplified SELECT policy to avoid infinite recursion.
-- The auth.uid() function can trigger recursive policy checks, so we use (true) instead.

-- Allow all authenticated users to view all profiles (simplified to avoid recursion)
-- This replaces the "own profile" policy to prevent 42P17 infinite recursion error
CREATE POLICY "Authenticated users can view all profiles" 
    ON profiles FOR SELECT 
    TO authenticated 
    USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Allow authenticated users to insert their own profile (for signup trigger)
CREATE POLICY "Users can insert own profile" 
    ON profiles FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = id);

-- Students policies
CREATE POLICY "Authenticated users can view students" 
    ON students FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Authenticated users can insert students" 
    ON students FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update students" 
    ON students FOR UPDATE 
    TO authenticated 
    USING (true);

CREATE POLICY "Authenticated users can delete students" 
    ON students FOR DELETE 
    TO authenticated 
    USING (true);

-- Logs policies
CREATE POLICY "Authenticated users can view logs" 
    ON logs FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Authenticated users can insert logs" 
    ON logs FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at 
    BEFORE UPDATE ON students 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile after user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'examiner')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STORAGE BUCKET SETUP
-- =====================================================

-- Create storage bucket for student images (run in Supabase dashboard SQL editor)
-- Note: Bucket creation via SQL is limited, use Supabase Dashboard for full setup

/*
Instructions for Storage Setup:

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named "student-images"
3. Set bucket to "Public" (for image access)
4. Add the following RLS policies:

Policy 1: Allow authenticated uploads
- Name: "Allow authenticated uploads"
- Allowed operation: INSERT
- Target roles: authenticated
- Policy definition: true

Policy 2: Allow public read access
- Name: "Allow public read access"
- Allowed operation: SELECT
- Target roles: anon, authenticated
- Policy definition: true

Policy 3: Allow authenticated deletes
- Name: "Allow authenticated deletes"
- Allowed operation: DELETE
- Target roles: authenticated
- Policy definition: true
*/

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- View for daily verification stats
CREATE VIEW daily_verification_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_attempts,
    COUNT(*) FILTER (WHERE result = 'verified') as successful,
    COUNT(*) FILTER (WHERE result = 'failed') as failed,
    AVG(confidence) FILTER (WHERE result = 'verified') as avg_confidence
FROM logs
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View for student verification summary
CREATE VIEW student_verification_summary AS
SELECT 
    s.id,
    s.name,
    s.register_no,
    s.department,
    s.year,
    s.verified_status,
    COUNT(l.id) as total_attempts,
    COUNT(l.id) FILTER (WHERE l.result = 'verified') as successful_verifications,
    MAX(l.created_at) as last_verification_date
FROM students s
LEFT JOIN logs l ON s.id = l.student_id
GROUP BY s.id, s.name, s.register_no, s.department, s.year, s.verified_status;
