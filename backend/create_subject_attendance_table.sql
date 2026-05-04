-- =====================================================
-- CREATE SUBJECT ATTENDANCE TABLE
-- Run this in Supabase SQL Editor to fix the 500 error
-- =====================================================

-- Create subject_attendance table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subject_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id BIGINT REFERENCES public.students(id) ON DELETE CASCADE,
    subject_name VARCHAR(255) NOT NULL,
    exam_date DATE NOT NULL,
    exam_time TIME NOT NULL DEFAULT '09:00',
    status VARCHAR(50) NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'verified')),
    verification_time TIMESTAMP WITH TIME ZONE,
    confidence DECIMAL(5,2),
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    hall_no VARCHAR(50),
    seat_no VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, subject_name, exam_date)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.subject_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_exam_date ON public.subject_attendance(exam_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.subject_attendance(status);

-- Enable RLS
ALTER TABLE public.subject_attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to view attendance" ON public.subject_attendance;
DROP POLICY IF EXISTS "Allow authenticated users to insert attendance" ON public.subject_attendance;
DROP POLICY IF EXISTS "Allow authenticated users to update attendance" ON public.subject_attendance;
DROP POLICY IF EXISTS "Allow authenticated users to delete attendance" ON public.subject_attendance;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to view attendance" 
    ON public.subject_attendance FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow authenticated users to insert attendance" 
    ON public.subject_attendance FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update attendance" 
    ON public.subject_attendance FOR UPDATE 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete attendance" 
    ON public.subject_attendance FOR DELETE 
    TO authenticated 
    USING (true);

-- Verify table creation
SELECT 'subject_attendance table created successfully!' AS status;
