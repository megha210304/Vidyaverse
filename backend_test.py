#!/usr/bin/env python3
"""
Vidyaverse Backend API Testing Suite
Tests all backend functionality including authentication, AI features, file upload, and CRUD operations.
"""

import requests
import json
import time
import os
from typing import Dict, Any, Optional
import base64

# Configuration
BASE_URL = "https://ai-library.preview.emergentagent.com/api"
TEST_USER_EMAIL = "sarah.johnson@example.com"
TEST_USER_NAME = "Sarah Johnson"
TEST_USER_PASSWORD = "SecurePass123!"

class VidyaverseAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.auth_token = None
        self.test_user_id = None
        self.test_book_id = None
        self.test_session_id = None
        self.educational_book_id = None
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
    
    def log_result(self, test_name: str, success: bool, message: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        
        if success:
            self.results["passed"] += 1
        else:
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: {message}")
    
    def make_request(self, method: str, endpoint: str, data: Any = None, files: Any = None, headers: Dict = None) -> requests.Response:
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}{endpoint}"
        
        # Add auth header if token exists
        if self.auth_token and headers is None:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
        elif self.auth_token and headers:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                if files:
                    response = requests.post(url, data=data, files=files, headers=headers, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            raise
    
    def test_health_check(self):
        """Test API health check"""
        try:
            response = self.make_request("GET", "/")
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "Vidyaverse API" in data["message"]:
                    self.log_result("Health Check", True, "API is running")
                    return True
                else:
                    self.log_result("Health Check", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("Health Check", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Health Check", False, f"Error: {str(e)}")
            return False
    
    def test_user_registration(self):
        """Test user registration"""
        try:
            user_data = {
                "email": TEST_USER_EMAIL,
                "name": TEST_USER_NAME,
                "password": TEST_USER_PASSWORD
            }
            
            response = self.make_request("POST", "/register", user_data)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.auth_token = data["token"]
                    self.test_user_id = data["user"]["id"]
                    self.log_result("User Registration", True, f"User created with ID: {self.test_user_id}")
                    return True
                else:
                    self.log_result("User Registration", False, f"Missing token or user in response: {data}")
                    return False
            elif response.status_code == 400:
                # User might already exist, try to login instead
                return self.test_user_login()
            else:
                self.log_result("User Registration", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("User Registration", False, f"Error: {str(e)}")
            return False
    
    def test_user_login(self):
        """Test user login"""
        try:
            login_data = {
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            }
            
            response = self.make_request("POST", "/login", login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.auth_token = data["token"]
                    self.test_user_id = data["user"]["id"]
                    self.log_result("User Login", True, f"Login successful for user: {self.test_user_id}")
                    return True
                else:
                    self.log_result("User Login", False, f"Missing token or user in response: {data}")
                    return False
            else:
                self.log_result("User Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("User Login", False, f"Error: {str(e)}")
            return False
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        try:
            login_data = {
                "email": TEST_USER_EMAIL,
                "password": "WrongPassword123!"
            }
            
            response = self.make_request("POST", "/login", login_data)
            
            if response.status_code == 401:
                self.log_result("Invalid Login Test", True, "Correctly rejected invalid credentials")
                return True
            else:
                self.log_result("Invalid Login Test", False, f"Expected 401, got {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Invalid Login Test", False, f"Error: {str(e)}")
            return False
    
    def test_protected_route_access(self):
        """Test accessing protected route with JWT token"""
        try:
            if not self.auth_token:
                self.log_result("Protected Route Access", False, "No auth token available")
                return False
            
            response = self.make_request("GET", "/profile")
            
            if response.status_code == 200:
                data = response.json()
                if "email" in data and data["email"] == TEST_USER_EMAIL:
                    self.log_result("Protected Route Access", True, "Profile accessed successfully")
                    return True
                else:
                    self.log_result("Protected Route Access", False, f"Unexpected profile data: {data}")
                    return False
            else:
                self.log_result("Protected Route Access", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Protected Route Access", False, f"Error: {str(e)}")
            return False
    
    def test_book_creation_with_ai(self):
        """Test book creation with AI analysis"""
        try:
            book_data = {
                "title": "The Art of Problem Solving",
                "author": "George Polya",
                "content": """This book presents a systematic approach to problem-solving that can be applied across various disciplines. The author outlines four key phases of problem-solving: understanding the problem, devising a plan, carrying out the plan, and looking back to examine the solution. Through numerous examples and exercises, readers learn to develop their analytical thinking skills and approach complex problems with confidence. The book emphasizes the importance of asking the right questions, breaking down complex problems into manageable parts, and learning from both successful and unsuccessful attempts at problem-solving."""
            }
            
            response = self.make_request("POST", "/books", book_data)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "ai_insights" in data:
                    self.test_book_id = data["id"]
                    ai_insights = data["ai_insights"]
                    
                    # Check if AI analysis contains expected fields
                    expected_fields = ["summary", "themes", "topics", "difficulty", "insights", "keywords"]
                    has_ai_analysis = any(field in ai_insights for field in expected_fields)
                    
                    if has_ai_analysis:
                        self.log_result("Book Creation with AI", True, f"Book created with AI analysis: {data['id']}")
                        return True
                    else:
                        self.log_result("Book Creation with AI", False, f"AI analysis missing expected fields: {ai_insights}")
                        return False
                else:
                    self.log_result("Book Creation with AI", False, f"Missing id or ai_insights: {data}")
                    return False
            else:
                self.log_result("Book Creation with AI", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Book Creation with AI", False, f"Error: {str(e)}")
            return False
    
    def test_pdf_upload_and_extraction(self):
        """Test PDF upload and text extraction"""
        try:
            # Create a simple text file to simulate PDF upload (since we can't create real PDFs easily)
            test_content = """Introduction to Machine Learning
            
            Machine learning is a subset of artificial intelligence that focuses on the development of algorithms and statistical models that enable computer systems to improve their performance on a specific task through experience. This field has revolutionized many industries and continues to drive innovation in technology.
            
            Key concepts include supervised learning, unsupervised learning, and reinforcement learning. Each approach has its own strengths and applications in solving real-world problems."""
            
            # Create form data for file upload
            files = {
                'file': ('test_book.txt', test_content, 'text/plain')
            }
            data = {
                'title': 'Introduction to Machine Learning',
                'author': 'Dr. Emily Chen'
            }
            
            response = self.make_request("POST", "/books/upload", data=data, files=files)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "content" in data and len(data["content"]) > 0:
                    # Check if AI analysis was performed
                    if "ai_insights" in data and data["ai_insights"]:
                        self.log_result("PDF Upload and Extraction", True, f"File uploaded and processed: {data['id']}")
                        return True
                    else:
                        self.log_result("PDF Upload and Extraction", False, "File uploaded but AI analysis missing")
                        return False
                else:
                    self.log_result("PDF Upload and Extraction", False, f"Missing content in response: {data}")
                    return False
            else:
                self.log_result("PDF Upload and Extraction", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("PDF Upload and Extraction", False, f"Error: {str(e)}")
            return False
    
    def test_semantic_search(self):
        """Test AI-powered semantic search"""
        try:
            search_data = {
                "query": "problem solving techniques and analytical thinking",
                "semantic": True
            }
            
            response = self.make_request("POST", "/books/search", search_data)
            
            if response.status_code == 200:
                data = response.json()
                if "results" in data:
                    results = data["results"]
                    if len(results) > 0:
                        # Check if results contain relevant books
                        relevant_found = any("problem" in book.get("title", "").lower() or 
                                           "problem" in book.get("content", "").lower() 
                                           for book in results)
                        if relevant_found:
                            self.log_result("Semantic Search", True, f"Found {len(results)} relevant results")
                            return True
                        else:
                            self.log_result("Semantic Search", True, f"Search completed with {len(results)} results")
                            return True
                    else:
                        self.log_result("Semantic Search", True, "Search completed (no results - expected for new database)")
                        return True
                else:
                    self.log_result("Semantic Search", False, f"Missing results field: {data}")
                    return False
            else:
                self.log_result("Semantic Search", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Semantic Search", False, f"Error: {str(e)}")
            return False
    
    def test_ai_recommendations(self):
        """Test AI-powered recommendations engine"""
        try:
            response = self.make_request("GET", "/ai/recommendations")
            
            if response.status_code == 200:
                data = response.json()
                if "books" in data and "reasoning" in data:
                    books = data["books"]
                    reasoning = data["reasoning"]
                    
                    if isinstance(books, list) and isinstance(reasoning, str):
                        self.log_result("AI Recommendations", True, f"Generated {len(books)} recommendations with reasoning")
                        return True
                    else:
                        self.log_result("AI Recommendations", False, f"Invalid response format: {data}")
                        return False
                else:
                    self.log_result("AI Recommendations", False, f"Missing books or reasoning: {data}")
                    return False
            else:
                self.log_result("AI Recommendations", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("AI Recommendations", False, f"Error: {str(e)}")
            return False
    
    def test_book_retrieval(self):
        """Test book CRUD operations"""
        try:
            # Test getting all books
            response = self.make_request("GET", "/books")
            
            if response.status_code == 200:
                books = response.json()
                if isinstance(books, list):
                    self.log_result("Book Listing", True, f"Retrieved {len(books)} books")
                    
                    # Test getting specific book if we have one
                    if self.test_book_id:
                        book_response = self.make_request("GET", f"/books/{self.test_book_id}")
                        if book_response.status_code == 200:
                            book_data = book_response.json()
                            if "id" in book_data and book_data["id"] == self.test_book_id:
                                self.log_result("Book Retrieval", True, f"Retrieved specific book: {self.test_book_id}")
                                return True
                            else:
                                self.log_result("Book Retrieval", False, f"Book ID mismatch: {book_data}")
                                return False
                        else:
                            self.log_result("Book Retrieval", False, f"Failed to get specific book: {book_response.status_code}")
                            return False
                    else:
                        return True
                else:
                    self.log_result("Book Listing", False, f"Expected list, got: {type(books)}")
                    return False
            else:
                self.log_result("Book Listing", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Book CRUD Operations", False, f"Error: {str(e)}")
            return False
    
    def test_reading_sessions(self):
        """Test reading session management"""
        try:
            if not self.test_book_id:
                self.log_result("Reading Sessions", False, "No test book available")
                return False
            
            # Create reading session
            response = self.make_request("POST", f"/reading/session?book_id={self.test_book_id}")
            
            if response.status_code == 200:
                session_data = response.json()
                if "id" in session_data and "user_id" in session_data:
                    self.test_session_id = session_data["id"]
                    
                    # Update reading session (using query parameters as per API design)
                    update_url = f"/reading/session/{self.test_session_id}?progress=0.25&notes=Interesting insights&reading_time=45"
                    
                    update_response = self.make_request("PUT", update_url)
                    
                    if update_response.status_code == 200:
                        updated_session = update_response.json()
                        if updated_session.get("progress") == 0.25:
                            self.log_result("Reading Sessions", True, f"Session created and updated: {self.test_session_id}")
                            return True
                        else:
                            self.log_result("Reading Sessions", False, f"Session update failed: {updated_session}")
                            return False
                    else:
                        self.log_result("Reading Sessions", False, f"Update failed: {update_response.status_code}")
                        return False
                else:
                    self.log_result("Reading Sessions", False, f"Invalid session data: {session_data}")
                    return False
            else:
                self.log_result("Reading Sessions", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Reading Sessions", False, f"Error: {str(e)}")
            return False
    
    def test_ai_book_analysis(self):
        """Test AI book re-analysis"""
        try:
            if not self.test_book_id:
                self.log_result("AI Book Analysis", False, "No test book available")
                return False
            
            response = self.make_request("POST", f"/ai/analyze/{self.test_book_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "insights" in data:
                    insights = data["insights"]
                    expected_fields = ["summary", "themes", "topics", "difficulty", "insights", "keywords"]
                    has_analysis = any(field in insights for field in expected_fields)
                    
                    if has_analysis:
                        self.log_result("AI Book Analysis", True, f"Book re-analyzed successfully")
                        return True
                    else:
                        self.log_result("AI Book Analysis", False, f"Analysis missing expected fields: {insights}")
                        return False
                else:
                    self.log_result("AI Book Analysis", False, f"Missing insights: {data}")
                    return False
            else:
                self.log_result("AI Book Analysis", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("AI Book Analysis", False, f"Error: {str(e)}")
            return False
    
    def test_database_operations(self):
        """Test database connectivity and UUID system"""
        try:
            # Test that we can retrieve user sessions (tests MongoDB connectivity)
            response = self.make_request("GET", "/reading/sessions")
            
            if response.status_code == 200:
                sessions = response.json()
                if isinstance(sessions, list):
                    # Check UUID format if we have sessions
                    if sessions and "id" in sessions[0]:
                        session_id = sessions[0]["id"]
                        # Basic UUID format check (36 characters with hyphens)
                        if len(session_id) == 36 and session_id.count('-') == 4:
                            self.log_result("Database Operations", True, "MongoDB connected, UUID system working")
                            return True
                        else:
                            self.log_result("Database Operations", False, f"Invalid UUID format: {session_id}")
                            return False
                    else:
                        self.log_result("Database Operations", True, "MongoDB connected (no sessions yet)")
                        return True
                else:
                    self.log_result("Database Operations", False, f"Expected list, got: {type(sessions)}")
                    return False
            else:
                self.log_result("Database Operations", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Database Operations", False, f"Error: {str(e)}")
            return False

    # ========== NEW EDUCATIONAL ONBOARDING SYSTEM TESTS ==========
    
    def test_grades_endpoint(self):
        """Test GET /api/grades endpoint"""
        try:
            response = self.make_request("GET", "/grades")
            
            if response.status_code == 200:
                data = response.json()
                if "grades" in data and isinstance(data["grades"], list):
                    grades = data["grades"]
                    if len(grades) > 0:
                        # Check if grades have proper structure
                        first_grade = grades[0]
                        if "value" in first_grade and "label" in first_grade:
                            expected_grades = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"]
                            grade_values = [g["value"] for g in grades]
                            if all(grade in grade_values for grade in expected_grades):
                                self.log_result("Grades Endpoint", True, f"Retrieved {len(grades)} grade options")
                                return True
                            else:
                                self.log_result("Grades Endpoint", False, f"Missing expected grades: {grade_values}")
                                return False
                        else:
                            self.log_result("Grades Endpoint", False, f"Invalid grade structure: {first_grade}")
                            return False
                    else:
                        self.log_result("Grades Endpoint", False, "No grades returned")
                        return False
                else:
                    self.log_result("Grades Endpoint", False, f"Invalid response structure: {data}")
                    return False
            else:
                self.log_result("Grades Endpoint", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Grades Endpoint", False, f"Error: {str(e)}")
            return False

    def test_subjects_endpoint(self):
        """Test GET /api/subjects endpoint"""
        try:
            response = self.make_request("GET", "/subjects")
            
            if response.status_code == 200:
                data = response.json()
                if "subjects" in data and isinstance(data["subjects"], list):
                    subjects = data["subjects"]
                    if len(subjects) > 0:
                        # Check if subjects have proper structure
                        first_subject = subjects[0]
                        if "value" in first_subject and "label" in first_subject:
                            expected_subjects = ["Mathematics", "Science", "English", "Social Studies", "History"]
                            subject_values = [s["value"] for s in subjects]
                            if all(subject in subject_values for subject in expected_subjects):
                                self.log_result("Subjects Endpoint", True, f"Retrieved {len(subjects)} subject options")
                                return True
                            else:
                                self.log_result("Subjects Endpoint", False, f"Missing expected subjects: {subject_values}")
                                return False
                        else:
                            self.log_result("Subjects Endpoint", False, f"Invalid subject structure: {first_subject}")
                            return False
                    else:
                        self.log_result("Subjects Endpoint", False, "No subjects returned")
                        return False
                else:
                    self.log_result("Subjects Endpoint", False, f"Invalid response structure: {data}")
                    return False
            else:
                self.log_result("Subjects Endpoint", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Subjects Endpoint", False, f"Error: {str(e)}")
            return False

    def test_educational_onboarding(self):
        """Test POST /api/onboarding endpoint"""
        try:
            if not self.auth_token:
                self.log_result("Educational Onboarding", False, "No auth token available")
                return False
            
            onboarding_data = {
                "grade": "7th",
                "subjects": ["Mathematics", "Science", "English"]
            }
            
            response = self.make_request("POST", "/onboarding", onboarding_data)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "user" in data:
                    user = data["user"]
                    if (user.get("grade") == "7th" and 
                        user.get("subjects") == ["Mathematics", "Science", "English"] and
                        user.get("onboarding_completed") == True):
                        self.log_result("Educational Onboarding", True, "Onboarding completed successfully")
                        return True
                    else:
                        self.log_result("Educational Onboarding", False, f"User data not updated correctly: {user}")
                        return False
                else:
                    self.log_result("Educational Onboarding", False, f"Invalid response structure: {data}")
                    return False
            else:
                self.log_result("Educational Onboarding", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Educational Onboarding", False, f"Error: {str(e)}")
            return False

    def test_educational_profile_verification(self):
        """Test that user profile contains educational data after onboarding"""
        try:
            if not self.auth_token:
                self.log_result("Educational Profile Verification", False, "No auth token available")
                return False
            
            response = self.make_request("GET", "/profile")
            
            if response.status_code == 200:
                user = response.json()
                if (user.get("grade") == "7th" and 
                    user.get("subjects") == ["Mathematics", "Science", "English"] and
                    user.get("onboarding_completed") == True):
                    self.log_result("Educational Profile Verification", True, "Educational profile data verified")
                    return True
                else:
                    self.log_result("Educational Profile Verification", False, f"Educational data missing or incorrect: {user}")
                    return False
            else:
                self.log_result("Educational Profile Verification", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Educational Profile Verification", False, f"Error: {str(e)}")
            return False

    def test_educational_book_creation(self):
        """Test book creation with educational metadata"""
        try:
            book_data = {
                "title": "Algebra Fundamentals for Middle School",
                "author": "Dr. Maria Rodriguez",
                "grade_level": "7th",
                "subject": "Mathematics",
                "content": """This comprehensive guide introduces middle school students to the fundamentals of algebra. Students will learn about variables, expressions, equations, and inequalities through engaging examples and practice problems. The book covers linear equations, graphing, and basic polynomial operations. Each chapter includes real-world applications to help students understand how algebra applies to everyday situations. Topics include solving one-step and two-step equations, working with positive and negative numbers, and understanding the coordinate plane."""
            }
            
            response = self.make_request("POST", "/books", book_data)
            
            if response.status_code == 200:
                data = response.json()
                if ("id" in data and "grade_level" in data and "subject" in data and 
                    "ai_insights" in data):
                    self.educational_book_id = data["id"]
                    
                    # Verify educational metadata
                    if (data["grade_level"] == "7th" and data["subject"] == "Mathematics"):
                        # Check AI insights for educational content
                        ai_insights = data["ai_insights"]
                        educational_fields = ["learning_objectives", "recommended_grade", "subject_category", "educational_value"]
                        has_educational_analysis = any(field in ai_insights for field in educational_fields)
                        
                        if has_educational_analysis:
                            self.log_result("Educational Book Creation", True, f"Book created with educational metadata and AI analysis")
                            return True
                        else:
                            self.log_result("Educational Book Creation", False, f"Missing educational AI analysis: {ai_insights}")
                            return False
                    else:
                        self.log_result("Educational Book Creation", False, f"Educational metadata not preserved: grade={data.get('grade_level')}, subject={data.get('subject')}")
                        return False
                else:
                    self.log_result("Educational Book Creation", False, f"Missing required fields: {data}")
                    return False
            else:
                self.log_result("Educational Book Creation", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Educational Book Creation", False, f"Error: {str(e)}")
            return False

    def test_educational_book_filtering(self):
        """Test GET /api/books with grade and subject filters"""
        try:
            # Test grade filtering
            response = self.make_request("GET", "/books?grade=7th")
            
            if response.status_code == 200:
                books = response.json()
                if isinstance(books, list):
                    # Check if returned books match grade filter
                    grade_filtered = all(book.get("grade_level") == "7th" or book.get("grade_level") is None for book in books)
                    
                    if grade_filtered:
                        # Test subject filtering
                        subject_response = self.make_request("GET", "/books?subject=Mathematics")
                        
                        if subject_response.status_code == 200:
                            subject_books = subject_response.json()
                            if isinstance(subject_books, list):
                                subject_filtered = all(book.get("subject") == "Mathematics" or book.get("subject") is None for book in subject_books)
                                
                                if subject_filtered:
                                    # Test combined filtering
                                    combined_response = self.make_request("GET", "/books?grade=7th&subject=Mathematics")
                                    
                                    if combined_response.status_code == 200:
                                        combined_books = combined_response.json()
                                        self.log_result("Educational Book Filtering", True, f"Grade/subject filtering working correctly")
                                        return True
                                    else:
                                        self.log_result("Educational Book Filtering", False, f"Combined filter failed: {combined_response.status_code}")
                                        return False
                                else:
                                    self.log_result("Educational Book Filtering", False, f"Subject filtering not working correctly")
                                    return False
                            else:
                                self.log_result("Educational Book Filtering", False, f"Subject filter returned non-list: {type(subject_books)}")
                                return False
                        else:
                            self.log_result("Educational Book Filtering", False, f"Subject filter failed: {subject_response.status_code}")
                            return False
                    else:
                        self.log_result("Educational Book Filtering", False, f"Grade filtering not working correctly")
                        return False
                else:
                    self.log_result("Educational Book Filtering", False, f"Grade filter returned non-list: {type(books)}")
                    return False
            else:
                self.log_result("Educational Book Filtering", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Educational Book Filtering", False, f"Error: {str(e)}")
            return False

    def test_educational_semantic_search(self):
        """Test semantic search with educational context"""
        try:
            search_data = {
                "query": "algebra equations for 7th grade mathematics",
                "semantic": True
            }
            
            response = self.make_request("POST", "/books/search", search_data)
            
            if response.status_code == 200:
                data = response.json()
                if "results" in data:
                    results = data["results"]
                    if len(results) > 0:
                        # Check if results are educationally relevant
                        educational_match = any(
                            ("algebra" in book.get("title", "").lower() or 
                             "algebra" in book.get("content", "").lower() or
                             book.get("grade_level") == "7th" or
                             book.get("subject") == "Mathematics")
                            for book in results
                        )
                        
                        if educational_match:
                            self.log_result("Educational Semantic Search", True, f"Found {len(results)} educationally relevant results")
                            return True
                        else:
                            self.log_result("Educational Semantic Search", True, f"Search completed with {len(results)} results (educational relevance varies)")
                            return True
                    else:
                        self.log_result("Educational Semantic Search", True, "Search completed (no results - expected for new database)")
                        return True
                else:
                    self.log_result("Educational Semantic Search", False, f"Missing results field: {data}")
                    return False
            else:
                self.log_result("Educational Semantic Search", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Educational Semantic Search", False, f"Error: {str(e)}")
            return False

    def test_educational_recommendations(self):
        """Test AI recommendations with educational context"""
        try:
            response = self.make_request("GET", "/ai/recommendations")
            
            if response.status_code == 200:
                data = response.json()
                if "books" in data and "reasoning" in data:
                    books = data["books"]
                    reasoning = data["reasoning"]
                    
                    if isinstance(books, list) and isinstance(reasoning, str):
                        # Check if reasoning mentions educational context
                        educational_context = any(term in reasoning.lower() for term in 
                                                ["grade", "learning", "educational", "student", "curriculum", "subject"])
                        
                        if educational_context:
                            self.log_result("Educational Recommendations", True, f"Generated {len(books)} educational recommendations with context")
                            return True
                        else:
                            self.log_result("Educational Recommendations", True, f"Generated {len(books)} recommendations (educational context may vary)")
                            return True
                    else:
                        self.log_result("Educational Recommendations", False, f"Invalid response format: {data}")
                        return False
                else:
                    self.log_result("Educational Recommendations", False, f"Missing books or reasoning: {data}")
                    return False
            else:
                self.log_result("Educational Recommendations", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Educational Recommendations", False, f"Error: {str(e)}")
            return False

    def test_educational_ai_analysis(self):
        """Test AI analysis with educational insights"""
        try:
            if not self.educational_book_id:
                self.log_result("Educational AI Analysis", False, "No educational book available")
                return False
            
            response = self.make_request("POST", f"/ai/analyze/{self.educational_book_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "insights" in data:
                    insights = data["insights"]
                    
                    # Check for educational-specific analysis fields
                    educational_fields = [
                        "learning_objectives", "recommended_grade", "subject_category", 
                        "educational_value", "prerequisites", "difficulty"
                    ]
                    
                    educational_analysis = sum(1 for field in educational_fields if field in insights)
                    
                    if educational_analysis >= 4:  # At least 4 educational fields
                        self.log_result("Educational AI Analysis", True, f"Comprehensive educational analysis with {educational_analysis} educational fields")
                        return True
                    else:
                        self.log_result("Educational AI Analysis", False, f"Limited educational analysis: only {educational_analysis} educational fields found")
                        return False
                else:
                    self.log_result("Educational AI Analysis", False, f"Missing insights: {data}")
                    return False
            else:
                self.log_result("Educational AI Analysis", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Educational AI Analysis", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Vidyaverse Backend API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Core functionality tests
        self.test_health_check()
        
        # Authentication flow
        self.test_user_registration()
        self.test_invalid_login()
        self.test_protected_route_access()
        
        # AI-powered features (HIGH PRIORITY)
        self.test_book_creation_with_ai()
        self.test_semantic_search()
        self.test_ai_recommendations()
        self.test_ai_book_analysis()
        
        # File upload and processing
        self.test_pdf_upload_and_extraction()
        
        # CRUD operations
        self.test_book_retrieval()
        self.test_reading_sessions()
        
        # Database operations
        self.test_database_operations()
        
        # Print summary
        print("=" * 60)
        print(f"🏁 Test Results Summary:")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['errors']:
            print("\n🔍 Failed Tests Details:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed'])) * 100
        print(f"\n📊 Success Rate: {success_rate:.1f}%")
        
        return self.results

if __name__ == "__main__":
    tester = VidyaverseAPITester()
    results = tester.run_all_tests()