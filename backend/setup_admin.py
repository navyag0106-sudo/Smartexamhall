"""
Setup script to create an admin user for testing
"""

from utils.supabase_client import get_supabase_client
import os

def setup_admin():
    """Create an admin user for testing"""
    try:
        supabase = get_supabase_client()
        
        # Try to sign up an admin user
        admin_email = "admin@examhall.com"
        admin_password = "admin123"
        
        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": admin_email,
            "password": admin_password,
            "options": {
                "data": {
                    "name": "System Administrator",
                    "role": "admin"
                }
            }
        })
        
        if auth_response.user:
            # Create profile in profiles table
            profile_data = {
                'id': auth_response.user.id,
                'name': 'System Administrator',
                'email': admin_email,
                'role': 'admin',
                'hall_no': None
            }
            
            profile_response = supabase.table('profiles').insert(profile_data).execute()
            
            print(f"✅ Admin user created successfully!")
            print(f"📧 Email: {admin_email}")
            print(f"🔑 Password: {admin_password}")
            print(f"👤 User ID: {auth_response.user.id}")
            
            return True
        else:
            print("❌ Failed to create admin user")
            return False
            
    except Exception as e:
        error_message = str(e)
        if "already registered" in error_message:
            print(f"ℹ️ Admin user already exists: {admin_email}")
            print(f"📧 Email: {admin_email}")
            print(f"🔑 Password: {admin_password}")
            return True
        else:
            print(f"❌ Error creating admin user: {error_message}")
            return False

def test_connection():
    """Test Supabase connection"""
    try:
        supabase = get_supabase_client()
        
        # Test connection by checking profiles table
        response = supabase.table('profiles').select('count').execute()
        
        print("✅ Supabase connection successful!")
        return True
        
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Testing Supabase connection...")
    if test_connection():
        print("\n👤 Setting up admin user...")
        setup_admin()
    else:
        print("\n❌ Please check your Supabase configuration in .env file")
