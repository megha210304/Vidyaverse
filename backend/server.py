from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
import PyPDF2
import pdfplumber
import io
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT settings
JWT_SECRET = "vidyaverse_secret_key_2025"
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_TIME = timedelta(days=7)

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Vidyaverse API", description="AI-Powered Digital Library Platform")
api_router = APIRouter(prefix="/api")

# AI LLM Setup
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    password_hash: str
    grade: Optional[str] = None
    subjects: List[str] = Field(default_factory=list)
    preferences: Dict[str, Any] = Field(default_factory=dict)
    reading_history: List[str] = Field(default_factory=list)
    onboarding_completed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOnboarding(BaseModel):
    grade: str
    subjects: List[str]

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    grade: Optional[str]
    subjects: List[str]
    preferences: Dict[str, Any]
    reading_history: List[str]
    onboarding_completed: bool

class Book(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    author: str
    content: str
    grade_level: Optional[str] = None
    subject: Optional[str] = None
    file_url: Optional[str] = None
    summary: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    ai_insights: Optional[Dict[str, Any]] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    file_type: Optional[str] = None

class BookCreate(BaseModel):
    title: str
    author: str
    content: Optional[str] = None
    grade_level: Optional[str] = None
    subject: Optional[str] = None

class BookResponse(BaseModel):
    id: str
    title: str
    author: str
    content: str
    grade_level: Optional[str] = None
    subject: Optional[str] = None
    summary: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    ai_insights: Optional[Dict[str, Any]] = None
    created_at: datetime
    file_type: Optional[str] = None

class ReadingSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    book_id: str
    progress: float = 0.0
    notes: str = ""
    bookmarks: List[int] = Field(default_factory=list)
    reading_time: int = 0  # minutes
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Recommendation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    recommended_books: List[str]
    reasoning: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SearchRequest(BaseModel):
    query: str
    semantic: bool = True

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + JWT_EXPIRATION_TIME
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def extract_pdf_text(file_content: bytes) -> str:
    try:
        # Try pdfplumber first (better for complex layouts)
        with io.BytesIO(file_content) as pdf_file:
            with pdfplumber.open(pdf_file) as pdf:
                text = ""
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                if text.strip():
                    return text
    except:
        pass
    
    try:
        # Fallback to PyPDF2
        with io.BytesIO(file_content) as pdf_file:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text
    except:
        return "Could not extract text from PDF"

async def get_ai_analysis(content: str, title: str, author: str, grade_level: str = None, subject: str = None) -> Dict[str, Any]:
    try:
        # Initialize AI chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"analysis_{str(uuid.uuid4())}",
            system_message="You are an expert educational content analyzer and curriculum specialist."
        ).with_model("openai", "gpt-4o-mini")
        
        # Create enhanced analysis prompt with grade and subject context
        analysis_prompt = f"""
        Analyze the following educational content and provide comprehensive insights:
        
        Title: {title}
        Author: {author}
        Grade Level: {grade_level or "Not specified"}
        Subject: {subject or "Not specified"}
        Content: {content[:3000]}...
        
        Please provide detailed analysis:
        1. A concise summary (2-3 sentences)
        2. Key learning objectives and outcomes
        3. Main topics and concepts covered
        4. Educational themes and pedagogical approaches
        5. Appropriate grade level recommendation (1st-10th)
        6. Subject classification (Mathematics, Science, English, Social Studies, etc.)
        7. Difficulty level assessment (Beginner/Intermediate/Advanced)
        8. Key insights and educational value
        9. Relevant keywords and concepts for search
        10. Prerequisites or prior knowledge required
        
        Format as JSON with keys: summary, learning_objectives, topics, themes, recommended_grade, subject_category, difficulty, educational_value, keywords, prerequisites
        """
        
        user_message = UserMessage(text=analysis_prompt)
        response = await chat.send_message(user_message)
        
        # Parse AI response
        try:
            import json
            ai_data = json.loads(response)
        except:
            # Fallback if JSON parsing fails
            ai_data = {
                "summary": "Educational content analysis available",
                "learning_objectives": ["Comprehensive learning experience"],
                "topics": ["Various educational topics"],
                "themes": ["Educational content"],
                "recommended_grade": grade_level or "5th",
                "subject_category": subject or "General Education",
                "difficulty": "Intermediate",
                "educational_value": "Engaging educational content",
                "keywords": [title.lower(), author.lower()],
                "prerequisites": "Basic reading comprehension"
            }
        
        return ai_data
    except Exception as e:
        logging.error(f"AI analysis failed: {e}")
        return {
            "summary": "Content analysis pending",
            "learning_objectives": [],
            "topics": [],
            "themes": [],
            "recommended_grade": grade_level or "5th",
            "subject_category": subject or "General",
            "difficulty": "Unknown",
            "educational_value": "Educational content",
            "keywords": [],
            "prerequisites": "None specified"
        }

async def get_semantic_search_results(query: str, user_id: str) -> List[Dict[str, Any]]:
    try:
        # Get user's reading history and preferences for personalization
        user = await db.users.find_one({"id": user_id})
        reading_history = user.get("reading_history", []) if user else []
        user_grade = user.get("grade") if user else None
        user_subjects = user.get("subjects", []) if user else []
        
        # Get all books
        books = await db.books.find().to_list(1000)
        
        # Use AI to perform semantic search with educational context
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"search_{str(uuid.uuid4())}",
            system_message="You are an educational content search engine for a digital library."
        ).with_model("openai", "gpt-4o-mini")
        
        search_prompt = f"""
        Educational Search Query: "{query}"
        User Profile:
        - Grade Level: {user_grade or "Not specified"}
        - Subjects: {user_subjects}
        - Reading History: {reading_history[:10]}
        
        Available Educational Content:
        {[{"id": book["id"], "title": book["title"], "author": book["author"], "grade_level": book.get("grade_level"), "subject": book.get("subject"), "summary": book.get("summary", ""), "keywords": book.get("keywords", [])} for book in books[:20]]}
        
        Rank these educational materials by relevance considering:
        1. Grade level appropriateness for user
        2. Subject alignment with user's interests
        3. Title, author, and content relevance
        4. Educational keywords and concepts
        5. User's learning progression
        
        Return top 10 book IDs in order of educational relevance as a JSON array.
        """
        
        user_message = UserMessage(text=search_prompt)
        response = await chat.send_message(user_message)
        
        try:
            import json
            book_ids = json.loads(response)
            # Fetch full book details
            results = []
            for book_id in book_ids:
                book = await db.books.find_one({"id": book_id})
                if book:
                    results.append(book)
            return results
        except:
            # Fallback to simple text search with grade filtering
            results = []
            query_lower = query.lower()
            for book in books:
                # Prioritize books matching user's grade and subjects
                grade_match = not user_grade or not book.get("grade_level") or book.get("grade_level") == user_grade
                subject_match = not user_subjects or not book.get("subject") or book.get("subject") in user_subjects
                
                if (query_lower in book["title"].lower() or 
                    query_lower in book["author"].lower() or 
                    query_lower in book.get("content", "").lower()[:1000]):
                    
                    # Boost ranking for grade and subject matches
                    if grade_match and subject_match:
                        results.insert(0, book)  # Add to front
                    else:
                        results.append(book)  # Add to end
                        
            return results[:10]
            
    except Exception as e:
        logging.error(f"Semantic search failed: {e}")
        return []

async def generate_recommendations(user_id: str) -> Dict[str, Any]:
    try:
        user = await db.users.find_one({"id": user_id})
        if not user:
            return {"recommended_books": [], "reasoning": "User not found"}
        
        reading_history = user.get("reading_history", [])
        preferences = user.get("preferences", {})
        user_grade = user.get("grade")
        user_subjects = user.get("subjects", [])
        
        # Get books user has read
        read_books = []
        if reading_history:
            read_books = await db.books.find({"id": {"$in": reading_history}}).to_list(100)
        
        # Get all available books
        all_books = await db.books.find().to_list(1000)
        unread_books = [book for book in all_books if book["id"] not in reading_history]
        
        if not unread_books:
            return {"recommended_books": [], "reasoning": "No unread books available"}
        
        # Use AI for educational recommendations
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"recommend_{str(uuid.uuid4())}",
            system_message="You are an educational recommendation engine for personalized learning."
        ).with_model("openai", "gpt-4o-mini")
        
        rec_prompt = f"""
        Student Profile:
        - Grade Level: {user_grade or "Not specified"}
        - Preferred Subjects: {user_subjects}
        - Reading History: {[{"title": book["title"], "author": book["author"], "grade_level": book.get("grade_level"), "subject": book.get("subject")} for book in read_books]}
        - Additional Preferences: {preferences}
        
        Available Educational Materials:
        {[{"id": book["id"], "title": book["title"], "author": book["author"], "grade_level": book.get("grade_level"), "subject": book.get("subject"), "summary": book.get("summary", ""), "keywords": book.get("keywords", [])} for book in unread_books[:30]]}
        
        Recommend 5 educational materials based on:
        1. Grade level appropriateness and learning progression
        2. Subject alignment with student interests
        3. Educational continuity from reading history
        4. Skill development and knowledge building
        5. Diverse learning experiences across subjects
        
        Return JSON: {{"book_ids": ["id1", "id2", ...], "reasoning": "educational explanation focusing on learning benefits"}}
        """
        
        user_message = UserMessage(text=rec_prompt)
        response = await chat.send_message(user_message)
        
        try:
            import json
            rec_data = json.loads(response)
            return {
                "recommended_books": rec_data.get("book_ids", []),
                "reasoning": rec_data.get("reasoning", f"Personalized educational recommendations for {user_grade or 'your'} grade level")
            }
        except:
            # Fallback recommendations with grade and subject filtering
            filtered_books = []
            for book in unread_books:
                # Prioritize books matching user's grade and subjects
                if user_grade and book.get("grade_level") == user_grade:
                    filtered_books.insert(0, book)
                elif not user_subjects or book.get("subject") in user_subjects:
                    filtered_books.append(book)
                    
            return {
                "recommended_books": [book["id"] for book in filtered_books[:5]],
                "reasoning": f"Educational recommendations tailored for {user_grade or 'your'} grade level and preferred subjects"
            }
            
    except Exception as e:
        logging.error(f"Recommendation generation failed: {e}")
        return {"recommended_books": [], "reasoning": "Recommendations temporarily unavailable"}

# Authentication Routes
@api_router.post("/register")
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=hashed_password
    )
    
    await db.users.insert_one(user.dict())
    
    # Create access token
    token = create_access_token(user.id)
    
    return {
        "message": "Registration successful",
        "token": token,
        "user": UserResponse(**user.dict())
    }

@api_router.post("/login")
async def login(login_data: UserLogin):
    # Find user
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create access token
    token = create_access_token(user["id"])
    
    return {
        "message": "Login successful",
        "token": token,
        "user": UserResponse(**user)
    }

@api_router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    return UserResponse(**current_user.dict())

@api_router.post("/onboarding")
async def complete_onboarding(
    onboarding_data: UserOnboarding,
    current_user: User = Depends(get_current_user)
):
    # Update user with grade and subjects
    await db.users.update_one(
        {"id": current_user.id},
        {
            "$set": {
                "grade": onboarding_data.grade,
                "subjects": onboarding_data.subjects,
                "onboarding_completed": True
            }
        }
    )
    
    # Get updated user
    updated_user = await db.users.find_one({"id": current_user.id})
    
    return {
        "message": "Onboarding completed successfully",
        "user": UserResponse(**updated_user)
    }

# Books Routes
@api_router.post("/books", response_model=BookResponse)
async def create_book(
    book_data: BookCreate,
    current_user: User = Depends(get_current_user)
):
    # Get AI analysis with educational context
    ai_insights = await get_ai_analysis(
        book_data.content or "", 
        book_data.title, 
        book_data.author,
        book_data.grade_level,
        book_data.subject
    )
    
    book = Book(
        title=book_data.title,
        author=book_data.author,
        content=book_data.content or "",
        grade_level=book_data.grade_level or ai_insights.get("recommended_grade"),
        subject=book_data.subject or ai_insights.get("subject_category"),
        summary=ai_insights.get("summary", ""),
        keywords=ai_insights.get("keywords", []),
        ai_insights=ai_insights,
        created_by=current_user.id,
        file_type="text"
    )
    
    await db.books.insert_one(book.dict())
    return BookResponse(**book.dict())

@api_router.post("/books/upload")
async def upload_book(
    title: str = Form(...),
    author: str = Form(...),
    grade_level: str = Form(None),
    subject: str = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Read file content
    file_content = await file.read()
    
    # Extract text based on file type
    if file.content_type == "application/pdf":
        extracted_text = await extract_pdf_text(file_content)
        file_type = "pdf"
    elif file.content_type.startswith("text/"):
        extracted_text = file_content.decode('utf-8')
        file_type = "text"
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Please upload PDF or text files.")
    
    # Store file as base64
    file_data = base64.b64encode(file_content).decode('utf-8')
    
    # Get AI analysis with educational context
    ai_insights = await get_ai_analysis(extracted_text, title, author, grade_level, subject)
    
    book = Book(
        title=title,
        author=author,
        content=extracted_text,
        grade_level=grade_level or ai_insights.get("recommended_grade"),
        subject=subject or ai_insights.get("subject_category"),
        file_url=f"data:{file.content_type};base64,{file_data}",
        summary=ai_insights.get("summary", ""),
        keywords=ai_insights.get("keywords", []),
        ai_insights=ai_insights,
        created_by=current_user.id,
        file_type=file_type
    )
    
    await db.books.insert_one(book.dict())
    return BookResponse(**book.dict())

@api_router.get("/books", response_model=List[BookResponse])
async def get_books(skip: int = 0, limit: int = 20, grade: str = None, subject: str = None):
    # Build filter criteria
    filter_criteria = {}
    if grade:
        filter_criteria["grade_level"] = grade
    if subject:
        filter_criteria["subject"] = subject
    
    books = await db.books.find(filter_criteria).skip(skip).limit(limit).to_list(limit)
    return [BookResponse(**book) for book in books]

@api_router.get("/books/{book_id}", response_model=BookResponse)
async def get_book(book_id: str):
    book = await db.books.find_one({"id": book_id})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return BookResponse(**book)

@api_router.post("/books/search")
async def search_books(
    search_request: SearchRequest,
    current_user: User = Depends(get_current_user)
):
    if search_request.semantic:
        results = await get_semantic_search_results(search_request.query, current_user.id)
    else:
        # Simple text search with user preferences
        query_lower = search_request.query.lower()
        filter_criteria = {
            "$or": [
                {"title": {"$regex": query_lower, "$options": "i"}},
                {"author": {"$regex": query_lower, "$options": "i"}},
                {"content": {"$regex": query_lower, "$options": "i"}},
                {"keywords": {"$regex": query_lower, "$options": "i"}},
                {"subject": {"$regex": query_lower, "$options": "i"}}
            ]
        }
        
        # Add user grade preference if available
        if current_user.grade:
            filter_criteria["$and"] = [
                {"$or": filter_criteria["$or"]},
                {"$or": [
                    {"grade_level": current_user.grade},
                    {"grade_level": {"$exists": False}}
                ]}
            ]
            del filter_criteria["$or"]
        
        results = await db.books.find(filter_criteria).to_list(20)
    
    return {"results": [BookResponse(**book) for book in results]}

# AI Routes
@api_router.get("/ai/recommendations")
async def get_recommendations(current_user: User = Depends(get_current_user)):
    rec_data = await generate_recommendations(current_user.id)
    
    # Get book details
    recommended_books = []
    if rec_data["recommended_books"]:
        books = await db.books.find({"id": {"$in": rec_data["recommended_books"]}}).to_list(100)
        recommended_books = [BookResponse(**book) for book in books]
    
    # Store recommendation
    recommendation = Recommendation(
        user_id=current_user.id,
        recommended_books=rec_data["recommended_books"],
        reasoning=rec_data["reasoning"]
    )
    await db.recommendations.insert_one(recommendation.dict())
    
    return {
        "books": recommended_books,
        "reasoning": rec_data["reasoning"]
    }

@api_router.post("/ai/analyze/{book_id}")
async def analyze_book(book_id: str, current_user: User = Depends(get_current_user)):
    book = await db.books.find_one({"id": book_id})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Re-analyze with updated AI and educational context
    ai_insights = await get_ai_analysis(
        book["content"], 
        book["title"], 
        book["author"],
        book.get("grade_level"),
        book.get("subject")
    )
    
    # Update book with new insights
    await db.books.update_one(
        {"id": book_id},
        {"$set": {
            "ai_insights": ai_insights, 
            "summary": ai_insights.get("summary", ""),
            "grade_level": ai_insights.get("recommended_grade", book.get("grade_level")),
            "subject": ai_insights.get("subject_category", book.get("subject"))
        }}
    )
    
    return {"insights": ai_insights}

# Reading Sessions Routes
@api_router.post("/reading/session")
async def create_reading_session(
    book_id: str,
    current_user: User = Depends(get_current_user)
):
    # Check if book exists
    book = await db.books.find_one({"id": book_id})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Find existing session or create new one
    existing_session = await db.reading_sessions.find_one({
        "user_id": current_user.id,
        "book_id": book_id
    })
    
    if existing_session:
        return ReadingSession(**existing_session)
    
    session = ReadingSession(
        user_id=current_user.id,
        book_id=book_id
    )
    
    await db.reading_sessions.insert_one(session.dict())
    
    # Add to user's reading history
    await db.users.update_one(
        {"id": current_user.id},
        {"$addToSet": {"reading_history": book_id}}
    )
    
    return session

@api_router.put("/reading/session/{session_id}")
async def update_reading_session(
    session_id: str,
    progress: float = 0.0,
    notes: str = "",
    bookmarks: List[int] = None,
    reading_time: int = 0,
    current_user: User = Depends(get_current_user)
):
    if bookmarks is None:
        bookmarks = []
    
    # Update session
    result = await db.reading_sessions.update_one(
        {"id": session_id, "user_id": current_user.id},
        {
            "$set": {
                "progress": progress,
                "notes": notes,
                "bookmarks": bookmarks,
                "reading_time": reading_time,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reading session not found")
    
    updated_session = await db.reading_sessions.find_one({"id": session_id})
    return ReadingSession(**updated_session)

@api_router.get("/reading/sessions")
async def get_reading_sessions(current_user: User = Depends(get_current_user)):
    sessions = await db.reading_sessions.find({"user_id": current_user.id}).to_list(100)
    return [ReadingSession(**session) for session in sessions]

# Utility Routes
@api_router.get("/grades")
async def get_grades():
    return {
        "grades": [
            {"value": "1st", "label": "1st Grade"},
            {"value": "2nd", "label": "2nd Grade"},
            {"value": "3rd", "label": "3rd Grade"},
            {"value": "4th", "label": "4th Grade"},
            {"value": "5th", "label": "5th Grade"},
            {"value": "6th", "label": "6th Grade"},
            {"value": "7th", "label": "7th Grade"},
            {"value": "8th", "label": "8th Grade"},
            {"value": "9th", "label": "9th Grade"},
            {"value": "10th", "label": "10th Grade"}
        ]
    }

@api_router.get("/subjects")
async def get_subjects():
    return {
        "subjects": [
            {"value": "Mathematics", "label": "Mathematics"},
            {"value": "Science", "label": "Science"},
            {"value": "English", "label": "English Language Arts"},
            {"value": "Social Studies", "label": "Social Studies"},
            {"value": "History", "label": "History"},
            {"value": "Geography", "label": "Geography"},
            {"value": "Physics", "label": "Physics"},
            {"value": "Chemistry", "label": "Chemistry"},
            {"value": "Biology", "label": "Biology"},
            {"value": "Computer Science", "label": "Computer Science"},
            {"value": "Art", "label": "Art & Creativity"},
            {"value": "Music", "label": "Music"},
            {"value": "Physical Education", "label": "Physical Education"},
            {"value": "Health", "label": "Health & Wellness"},
            {"value": "Foreign Language", "label": "Foreign Language"}
        ]
    }

# Health check
@api_router.get("/")
async def root():
    return {"message": "Vidyaverse API is running", "version": "2.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()