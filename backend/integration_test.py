#!/usr/bin/env python3
"""
End-to-end integration test for Voice Sales Trainer
Tests authentication flow, scenario loading, and voice session creation
"""

import requests
import json
import time
import sys
import os
from typing import Dict, Any, Optional

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configuration
API_BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"
TEST_USER = {
    "username": "test_user_integration",
    "email": "test@voicesalestrainer.com",
    "password": "TestPassword123!",
    "first_name": "Integration",
    "last_name": "Test"
}

class IntegrationTest:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.test_scenario_id = None
        self.test_session_id = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
    
    def check_service_health(self, service_name: str, url: str) -> bool:
        """Check if a service is healthy"""
        try:
            response = requests.get(f"{url}/health", timeout=5)
            if response.status_code == 200:
                self.log(f"✅ {service_name} is healthy")
                return True
            else:
                self.log(f"❌ {service_name} health check failed: {response.status_code}", "ERROR")
                return False
        except requests.exceptions.RequestException as e:
            self.log(f"❌ {service_name} is not accessible: {e}", "ERROR")
            return False
    
    def test_backend_health(self) -> bool:
        """Test backend API health"""
        self.log("Testing backend API health...")
        return self.check_service_health("Backend API", API_BASE_URL)
    
    def test_frontend_health(self) -> bool:
        """Test frontend health"""
        self.log("Testing frontend health...")
        try:
            response = requests.get(FRONTEND_URL, timeout=5)
            if response.status_code == 200:
                self.log("✅ Frontend is accessible")
                return True
            else:
                self.log(f"❌ Frontend returned status: {response.status_code}", "ERROR")
                return False
        except requests.exceptions.RequestException as e:
            self.log(f"❌ Frontend is not accessible: {e}", "ERROR")
            return False
    
    def cleanup_test_user(self):
        """Clean up test user if exists"""
        try:
            # Try to login with test credentials to see if user exists
            login_response = self.session.post(
                f"{API_BASE_URL}/auth/token",
                data={
                    "username": TEST_USER["username"],
                    "password": TEST_USER["password"]
                }
            )
            if login_response.status_code == 200:
                self.log("🧹 Cleaning up existing test user...")
                # User exists, we'll just use it
                return True
        except Exception:
            pass
        return True
    
    def test_user_registration(self) -> bool:
        """Test user registration"""
        self.log("Testing user registration...")
        
        try:
            response = self.session.post(
                f"{API_BASE_URL}/auth/register",
                json=TEST_USER,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code in [200, 201]:
                self.log("✅ User registration successful")
                return True
            elif response.status_code == 400:
                # User might already exist
                error_data = response.json()
                if "already exists" in str(error_data).lower():
                    self.log("⚠️ Test user already exists, continuing with login test")
                    return True
                else:
                    self.log(f"❌ Registration failed: {error_data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Registration failed with status {response.status_code}: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Registration test failed: {e}", "ERROR")
            return False
    
    def test_user_login(self) -> bool:
        """Test user login and token retrieval"""
        self.log("Testing user login...")
        
        try:
            response = self.session.post(
                f"{API_BASE_URL}/auth/token",
                data={
                    "username": TEST_USER["username"],
                    "password": TEST_USER["password"]
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                user_data = data.get("user", {})
                self.user_id = user_data.get("id")
                
                if self.auth_token:
                    self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                    self.log("✅ User login successful, token obtained")
                    return True
                else:
                    self.log("❌ Login response missing access token", "ERROR")
                    return False
            else:
                self.log(f"❌ Login failed with status {response.status_code}: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login test failed: {e}", "ERROR")
            return False
    
    def test_get_current_user(self) -> bool:
        """Test getting current user info"""
        self.log("Testing get current user...")
        
        try:
            response = self.session.get(f"{API_BASE_URL}/auth/me")
            
            if response.status_code == 200:
                user_data = response.json()
                if user_data.get("username") == TEST_USER["username"]:
                    self.log("✅ Get current user successful")
                    return True
                else:
                    self.log("❌ Current user data doesn't match expected", "ERROR")
                    return False
            else:
                self.log(f"❌ Get current user failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get current user test failed: {e}", "ERROR")
            return False
    
    def test_load_scenarios(self) -> bool:
        """Test loading training scenarios"""
        self.log("Testing scenario loading...")
        
        try:
            response = self.session.get(f"{API_BASE_URL}/scenarios")
            
            if response.status_code == 200:
                scenarios = response.json()
                if isinstance(scenarios, list) and len(scenarios) > 0:
                    self.test_scenario_id = scenarios[0].get("id")
                    self.log(f"✅ Loaded {len(scenarios)} scenarios")
                    return True
                else:
                    self.log("⚠️ No scenarios found, but API call succeeded")
                    return True
            else:
                self.log(f"❌ Scenario loading failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Scenario loading test failed: {e}", "ERROR")
            return False
    
    def test_create_session(self) -> bool:
        """Test creating a training session"""
        if not self.test_scenario_id:
            self.log("⚠️ Skipping session creation - no scenario available")
            return True
            
        self.log("Testing session creation...")
        
        try:
            session_data = {
                "scenario_id": int(self.test_scenario_id),
                "is_practice_mode": True
            }
            
            response = self.session.post(
                f"{API_BASE_URL}/sessions",
                json=session_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code in [200, 201]:
                session_info = response.json()
                self.test_session_id = session_info.get("id")
                self.log("✅ Training session created successfully")
                return True
            else:
                self.log(f"❌ Session creation failed with status {response.status_code}: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Session creation test failed: {e}", "ERROR")
            return False
    
    def test_get_analytics(self) -> bool:
        """Test getting analytics data"""
        self.log("Testing analytics retrieval...")
        
        try:
            response = self.session.get(f"{API_BASE_URL}/sessions/analytics")
            
            if response.status_code == 200:
                analytics = response.json()
                if isinstance(analytics, dict):
                    self.log("✅ Analytics data retrieved successfully")
                    return True
                else:
                    self.log("❌ Invalid analytics data format", "ERROR")
                    return False
            else:
                self.log(f"❌ Analytics retrieval failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Analytics test failed: {e}", "ERROR")
            return False
    
    def test_database_connection(self) -> bool:
        """Test database connectivity through health check"""
        self.log("Testing database connection...")
        
        try:
            response = self.session.get(f"{API_BASE_URL}/health")
            
            if response.status_code == 200:
                health_data = response.json()
                if health_data.get("status") == "healthy":
                    self.log("✅ Database connection healthy")
                    return True
                else:
                    self.log("❌ Database connection unhealthy", "ERROR")
                    return False
            else:
                self.log(f"❌ Health check failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Database connection test failed: {e}", "ERROR")
            return False
    
    def run_all_tests(self) -> bool:
        """Run all integration tests"""
        self.log("🚀 Starting Voice Sales Trainer Integration Tests")
        self.log("=" * 60)
        
        tests = [
            ("Backend Health", self.test_backend_health),
            ("Frontend Health", self.test_frontend_health),
            ("Database Connection", self.test_database_connection),
            ("User Registration", self.test_user_registration),
            ("User Login", self.test_user_login),
            ("Get Current User", self.test_get_current_user),
            ("Load Scenarios", self.test_load_scenarios),
            ("Create Session", self.test_create_session),
            ("Get Analytics", self.test_get_analytics)
        ]
        
        passed = 0
        total = len(tests)
        failed_tests = []
        
        for test_name, test_func in tests:
            self.log(f"\n📋 Running test: {test_name}")
            try:
                if test_func():
                    passed += 1
                else:
                    failed_tests.append(test_name)
            except Exception as e:
                self.log(f"❌ Test {test_name} crashed: {e}", "ERROR")
                failed_tests.append(test_name)
        
        self.log("\n" + "=" * 60)
        self.log("📊 INTEGRATION TEST RESULTS")
        self.log("=" * 60)
        self.log(f"✅ Passed: {passed}/{total}")
        self.log(f"❌ Failed: {len(failed_tests)}/{total}")
        
        if failed_tests:
            self.log("\n🔥 Failed tests:")
            for test in failed_tests:
                self.log(f"  - {test}")
        
        success = len(failed_tests) == 0
        if success:
            self.log("\n🎉 All integration tests passed!")
        else:
            self.log("\n💥 Some integration tests failed. Check the logs above.")
        
        return success

def main():
    """Main entry point"""
    tester = IntegrationTest()
    
    # Wait a bit for services to be ready
    time.sleep(2)
    
    # Clean up any existing test user
    tester.cleanup_test_user()
    
    # Run all tests
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()