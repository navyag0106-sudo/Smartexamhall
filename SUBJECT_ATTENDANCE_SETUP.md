# Subject Attendance Feature Setup Guide

## Overview
This feature allows tracking student attendance for specific subjects with date and time stamps.

## Database Setup (Required)

### Step 1: Create Subject Attendance Table
Run this SQL in your Supabase SQL Editor:

```sql
-- File: backend/subject_attendance_schema.sql
```

Execute the entire content of `subject_attendance_schema.sql` to create the `subject_attendance` table.

### Step 2: Update Subject Templates with Dates and Times
Run this SQL to add exam dates and times to your existing subject templates:

```sql
-- File: backend/subject_dates_schema.sql
```

This will update the CSE 3rd Year template with sample exam dates and times.

### Step 3: Verify Setup
Run these queries to verify:

```sql
-- Check subject_attendance table
SELECT * FROM subject_attendance LIMIT 5;

-- Check subject_templates with dates
SELECT department, year, subjects FROM subject_templates WHERE department = 'CSE';
```

## Feature Details

### Subject Template Format
Subjects are now stored as objects with name, date, and time:
```json
{
  "name": "Operating Systems",
  "exam_date": "2025-05-01",
  "exam_time": "10:00"
}
```

### Attendance Tracking
- Each verification creates a `subject_attendance` record
- Status can be: `absent`, `present`, or `verified`
- Tracks verification time and confidence score
- Prevents duplicate records (UNIQUE constraint on student + subject + date)

### API Endpoints

#### GET `/api/student-attendance/:register_no`
Returns student info with all subjects and attendance status.

Response:
```json
{
  "status": "success",
  "data": {
    "student": { ... },
    "subjects": [
      {
        "name": "Operating Systems",
        "exam_date": "2025-05-01",
        "exam_time": "10:00",
        "status": "verified",
        "verification_time": "2025-04-19T12:30:00Z",
        "confidence": 0.85
      }
    ]
  }
}
```

#### POST `/api/verify-live`
Now accepts `subject_name` parameter:
```json
{
  "images": [...],
  "register_no": "123",
  "subject_name": "Operating Systems"
}
```

## Frontend Features

### Examiner Dashboard Updates
1. **Subject Selection Dropdown**: Choose which subject to verify for
2. **Attendance Summary**: Visual list of all subjects with status
3. **Real-time Updates**: Attendance refreshes after verification
4. **Status Indicators**:
   - ✅ Green: Verified (face matched)
   - 🔵 Blue: Present (manually marked)
   - ⚪ Gray: Absent (not verified)

### Icons Added
- `Calendar`: Shows exam date
- `Clock`: Shows exam time
- `BookOpen`: Shows subject name

## Testing

1. **Login as Examiner**
2. **Search for a student** in your hall
3. **Select a subject** from the dropdown
4. **Verify face** with camera
5. **Check attendance** updates in the summary section

## Migration Notes

- Existing students without `subject_template_id` will show empty subject lists
- Old subject templates (simple arrays) will be handled gracefully
- The system supports both old and new formats during transition
