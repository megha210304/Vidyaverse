import React, { useState, useEffect, useContext, createContext } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children, initialUser }) => {
  const [user, setUser] = useState(initialUser);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Update user when initialUser changes
  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    }
  }, [initialUser]);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// API Helper
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}/api${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'An error occurred');
  }

  return await response.json();
};

// Components
const LoginForm = ({ onSuccess }) => {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/login' : '/register';
      const result = await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      // Use AuthContext login method
      login(result.user, result.token);
      onSuccess(result.user, result.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Vidyaverse
          </h1>
          <p className="text-gray-600">AI-Powered Educational Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                required={!isLogin}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Your full name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-600 hover:text-indigo-500 text-sm font-medium transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const GradeSelection = ({ onComplete }) => {
  const [selectedGrade, setSelectedGrade] = useState('');
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch grades from API
    const fetchGrades = async () => {
      try {
        const result = await apiCall('/grades');
        setGrades(result.grades);
      } catch (error) {
        console.error('Failed to load grades:', error);
        // Fallback grades
        setGrades([
          { value: '1st', label: '1st Grade' },
          { value: '2nd', label: '2nd Grade' },
          { value: '3rd', label: '3rd Grade' },
          { value: '4th', label: '4th Grade' },
          { value: '5th', label: '5th Grade' },
          { value: '6th', label: '6th Grade' },
          { value: '7th', label: '7th Grade' },
          { value: '8th', label: '8th Grade' },
          { value: '9th', label: '9th Grade' },
          { value: '10th', label: '10th Grade' }
        ]);
      }
    };

    fetchGrades();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGrade) return;

    setLoading(true);
    onComplete(selectedGrade);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Welcome to Vidyaverse!
          </h1>
          <p className="text-gray-600 text-lg">Let's personalize your learning journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-lg font-semibold text-gray-800 mb-4 text-center">
              What grade are you currently in?
            </label>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {grades.map((grade) => (
                <button
                  key={grade.value}
                  type="button"
                  onClick={() => setSelectedGrade(grade.value)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedGrade === grade.value
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-indigo-600 scale-105 shadow-lg'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">
                      {grade.value === '1st' ? '1️⃣' : 
                       grade.value === '2nd' ? '2️⃣' : 
                       grade.value === '3rd' ? '3️⃣' : 
                       grade.value === '4th' ? '4️⃣' : 
                       grade.value === '5th' ? '5️⃣' : 
                       grade.value === '6th' ? '6️⃣' : 
                       grade.value === '7th' ? '7️⃣' : 
                       grade.value === '8th' ? '8️⃣' : 
                       grade.value === '9th' ? '9️⃣' : '🔟'}
                    </div>
                    <div className="font-medium text-sm">{grade.label}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={!selectedGrade || loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-8 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 font-semibold text-lg"
            >
              {loading ? 'Processing...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SubjectSelection = ({ grade, onComplete }) => {
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch subjects from API
    const fetchSubjects = async () => {
      try {
        const result = await apiCall('/subjects');
        setSubjects(result.subjects);
      } catch (error) {
        console.error('Failed to load subjects:', error);
        // Fallback subjects
        setSubjects([
          { value: 'Mathematics', label: 'Mathematics' },
          { value: 'Science', label: 'Science' },
          { value: 'English', label: 'English Language Arts' },
          { value: 'Social Studies', label: 'Social Studies' },
          { value: 'History', label: 'History' },
          { value: 'Geography', label: 'Geography' },
          { value: 'Physics', label: 'Physics' },
          { value: 'Chemistry', label: 'Chemistry' },
          { value: 'Biology', label: 'Biology' },
          { value: 'Computer Science', label: 'Computer Science' },
          { value: 'Art', label: 'Art & Creativity' },
          { value: 'Music', label: 'Music' }
        ]);
      }
    };

    fetchSubjects();
  }, []);

  const toggleSubject = (subjectValue) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectValue)
        ? prev.filter(s => s !== subjectValue)
        : [...prev, subjectValue]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedSubjects.length === 0) return;

    setLoading(true);
    onComplete(selectedSubjects);
    setLoading(false);
  };

  const getSubjectIcon = (subject) => {
    const icons = {
      'Mathematics': '🔢',
      'Science': '🔬',
      'English': '📝',
      'Social Studies': '🌍',
      'History': '🏛️',
      'Geography': '🗺️',
      'Physics': '⚡',
      'Chemistry': '⚗️',
      'Biology': '🧬',
      'Computer Science': '💻',
      'Art': '🎨',
      'Music': '🎵',
      'Physical Education': '🏃',
      'Health': '💪',
      'Foreign Language': '🌐'
    };
    return icons[subject] || '📚';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Choose Your Interests
          </h1>
          <p className="text-gray-600 text-lg mb-2">Select subjects you'd like to explore</p>
          <p className="text-sm text-purple-600 font-medium">Grade: {grade}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {subjects.map((subject) => (
                <button
                  key={subject.value}
                  type="button"
                  onClick={() => toggleSubject(subject.value)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedSubjects.includes(subject.value)
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white border-purple-600 scale-105 shadow-lg'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">{getSubjectIcon(subject.value)}</div>
                    <div className="font-medium text-sm leading-tight">{subject.label}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="text-center mt-6">
              <p className="text-sm text-gray-500 mb-2">
                Selected: {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-400">
                Choose at least one subject to continue
              </p>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={selectedSubjects.length === 0 || loading}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-8 rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 font-semibold text-lg"
            >
              {loading ? 'Setting up your library...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TextbookSelection = ({ grade, subject, onComplete, onBack }) => {
  const [selectedTextbooks, setSelectedTextbooks] = useState([]);
  const [textbooks, setTextbooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const fetchTextbooks = async () => {
      try {
        setPageLoading(true);
        const result = await apiCall(`/subjects/${subject}/textbooks?grade=${grade}`);
        setTextbooks(result || []);
      } catch (error) {
        console.error('Failed to load textbooks:', error);
        setTextbooks([]);
      } finally {
        setPageLoading(false);
      }
    };

    fetchTextbooks();
  }, [subject, grade]);

  const toggleTextbook = (textbookId) => {
    setSelectedTextbooks(prev => 
      prev.includes(textbookId)
        ? prev.filter(id => id !== textbookId)
        : [...prev, textbookId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedTextbooks.length === 0) return;

    setLoading(true);
    try {
      // Save textbook selection
      await apiCall('/textbook-selection', {
        method: 'POST',
        body: JSON.stringify({
          subject: subject,
          textbook_ids: selectedTextbooks
        }),
      });
      
      onComplete(subject, selectedTextbooks);
    } catch (error) {
      console.error('Failed to save textbook selection:', error);
      alert('Failed to save selection: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getSubjectIcon = (subject) => {
    const icons = {
      'Mathematics': '🔢',
      'Science': '🔬',
      'English': '📝',
      'Social Studies': '🌍',
      'History': '🏛️',
      'Geography': '🗺️',
      'Physics': '⚡',
      'Chemistry': '⚗️',
      'Biology': '🧬',
      'Computer Science': '💻',
      'Art': '🎨',
      'Music': '🎵'
    };
    return icons[subject] || '📚';
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading {subject} textbooks...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{getSubjectIcon(subject)}</div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
              {subject} Textbooks
            </h1>
            <p className="text-gray-600 text-lg mb-2">Choose textbooks for your {grade} {subject} journey</p>
            <p className="text-sm text-emerald-600 font-medium">Grade: {grade}</p>
            
            <button
              onClick={onBack}
              className="mt-4 text-emerald-600 hover:text-emerald-800 text-sm font-medium flex items-center mx-auto"
            >
              ← Back to subjects
            </button>
          </div>

          {textbooks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📚</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No textbooks available</h3>
              <p className="text-gray-600 mb-4">We'll add more textbooks for {subject} soon!</p>
              <button
                onClick={onBack}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Choose Another Subject
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {textbooks.map((textbook) => (
                  <div
                    key={textbook.id}
                    onClick={() => toggleTextbook(textbook.id)}
                    className={`cursor-pointer border-2 rounded-xl p-6 transition-all duration-200 ${
                      selectedTextbooks.includes(textbook.id)
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-600 scale-105 shadow-lg'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-bold text-lg mb-2">{textbook.title}</h3>
                        <p className="text-sm opacity-90 mb-2">by {textbook.author}</p>
                        {textbook.publisher && (
                          <p className="text-xs opacity-75">{textbook.publisher}</p>
                        )}
                      </div>

                      <p className="text-sm opacity-90 leading-relaxed">
                        {textbook.description}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(textbook.difficulty_level)}`}>
                          {textbook.difficulty_level}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {textbook.content_type}
                        </span>
                      </div>

                      {textbook.chapters && textbook.chapters.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Chapters:</p>
                          <div className="space-y-1">
                            {textbook.chapters.slice(0, 3).map((chapter, index) => (
                              <p key={index} className="text-xs opacity-80">
                                • {chapter.title}
                              </p>
                            ))}
                            {textbook.chapters.length > 3 && (
                              <p className="text-xs opacity-60">
                                + {textbook.chapters.length - 3} more chapters
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {textbook.learning_objectives && textbook.learning_objectives.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Learning Goals:</p>
                          <div className="space-y-1">
                            {textbook.learning_objectives.slice(0, 2).map((objective, index) => (
                              <p key={index} className="text-xs opacity-80">
                                • {objective}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center mt-8">
                <p className="text-sm text-gray-500 mb-4">
                  Selected: {selectedTextbooks.length} textbook{selectedTextbooks.length !== 1 ? 's' : ''}
                </p>
                
                <div className="flex justify-center space-x-4">
                  <button
                    type="button"
                    onClick={onBack}
                    className="bg-gray-500 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={selectedTextbooks.length === 0 || loading}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 px-8 rounded-lg hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 font-semibold text-lg"
                  >
                    {loading ? 'Saving...' : 'Continue with Selected Books'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const BookCard = ({ book, onClick }) => (
  <div 
    onClick={() => onClick(book)}
    className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 p-6"
  >
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">{book.title}</h3>
        <p className="text-indigo-600 font-medium text-sm mb-2">by {book.author}</p>
        {book.summary && (
          <p className="text-gray-600 text-sm line-clamp-3 mb-3">{book.summary}</p>
        )}
      </div>
    </div>
    
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2 flex-wrap">
        {book.grade_level && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            {book.grade_level}
          </span>
        )}
        {book.subject && (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
            {book.subject}
          </span>
        )}
        {book.file_type && (
          <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
            {book.file_type.toUpperCase()}
          </span>
        )}
        {book.ai_insights && book.ai_insights.difficulty && (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
            {book.ai_insights.difficulty}
          </span>
        )}
      </div>
      <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
        Read →
      </button>
    </div>
  </div>
);

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('library');
  const [books, setBooks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    author: '',
    content: '',
    grade_level: user?.grade || '',
    subject: '',
    file: null
  });

  useEffect(() => {
    loadBooks();
    loadRecommendations();
  }, []);

  const loadBooks = async () => {
    try {
      const result = await apiCall('/books');
      setBooks(result);
    } catch (error) {
      console.error('Failed to load books:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const result = await apiCall('/ai/recommendations');
      setRecommendations(result.books || []);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const result = await apiCall('/books/search', {
        method: 'POST',
        body: JSON.stringify({
          query: searchQuery,
          semantic: true
        }),
      });
      setSearchResults(result.results || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookUpload = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('author', uploadForm.author);
      if (uploadForm.grade_level) formData.append('grade_level', uploadForm.grade_level);
      if (uploadForm.subject) formData.append('subject', uploadForm.subject);

      if (uploadForm.file) {
        formData.append('file', uploadForm.file);
        
        await apiCall('/books/upload', {
          method: 'POST',
          headers: {},
          body: formData,
        });
      } else {
        await apiCall('/books', {
          method: 'POST',
          body: JSON.stringify({
            title: uploadForm.title,
            author: uploadForm.author,
            content: uploadForm.content,
            grade_level: uploadForm.grade_level,
            subject: uploadForm.subject
          }),
        });
      }

      setUploadForm({ 
        title: '', 
        author: '', 
        content: '', 
        grade_level: user?.grade || '',
        subject: '',
        file: null 
      });
      loadBooks();
      setActiveTab('library');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBookClick = async (book) => {
    try {
      // Create or update reading session
      await apiCall('/reading/session', {
        method: 'POST',
        body: JSON.stringify({ book_id: book.id }),
      });
      setSelectedBook(book);
    } catch (error) {
      console.error('Failed to create reading session:', error);
      // Still allow reading even if session creation fails
      setSelectedBook(book);
    }
  };

  const renderLibrary = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Library</h2>
          <p className="text-gray-600">Grade: {user?.grade || 'Not set'} | Subjects: {user?.subjects?.join(', ') || 'Not set'}</p>
        </div>
        <div className="text-sm text-gray-500">{books.length} books</div>
      </div>
      
      {books.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No books yet</h3>
          <p className="text-gray-600 mb-4">Start building your digital library</p>
          <button
            onClick={() => setActiveTab('upload')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Add Your First Book
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <BookCard key={book.id} book={book} onClick={handleBookClick} />
          ))}
        </div>
      )}
    </div>
  );

  const renderSearch = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Smart Search</h2>
        <div className="flex space-x-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by topic, subject, or describe what you want to learn..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {searchResults.map((book) => (
              <BookCard key={book.id} book={book} onClick={handleBookClick} />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderRecommendations = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">AI Recommendations</h2>
      
      {recommendations.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🤖</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No recommendations yet</h3>
          <p className="text-gray-600 mb-4">Read some books to get AI-powered recommendations</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((book) => (
            <BookCard key={book.id} book={book} onClick={handleBookClick} />
          ))}
        </div>
      )}
    </div>
  );

  const renderUpload = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Add New Book</h2>
      
      <form onSubmit={handleBookUpload} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              required
              value={uploadForm.title}
              onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Book title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
            <input
              type="text"
              required
              value={uploadForm.author}
              onChange={(e) => setUploadForm({ ...uploadForm, author: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Author name"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level</label>
            <select
              value={uploadForm.grade_level}
              onChange={(e) => setUploadForm({ ...uploadForm, grade_level: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select grade</option>
              <option value="1st">1st Grade</option>
              <option value="2nd">2nd Grade</option>
              <option value="3rd">3rd Grade</option>
              <option value="4th">4th Grade</option>
              <option value="5th">5th Grade</option>
              <option value="6th">6th Grade</option>
              <option value="7th">7th Grade</option>
              <option value="8th">8th Grade</option>
              <option value="9th">9th Grade</option>
              <option value="10th">10th Grade</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <select
              value={uploadForm.subject}
              onChange={(e) => setUploadForm({ ...uploadForm, subject: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select subject</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Science">Science</option>
              <option value="English">English Language Arts</option>
              <option value="Social Studies">Social Studies</option>
              <option value="History">History</option>
              <option value="Geography">Geography</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Art">Art & Creativity</option>
              <option value="Music">Music</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload File</label>
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p className="text-sm text-gray-500 mt-1">Upload PDF or text file</p>
        </div>

        <div className="text-center text-gray-500">OR</div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Paste Text Content</label>
          <textarea
            value={uploadForm.content}
            onChange={(e) => setUploadForm({ ...uploadForm, content: e.target.value })}
            rows="8"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Paste or type your book content here..."
          />
        </div>

        <button
          type="submit"
          disabled={loading || (!uploadForm.file && !uploadForm.content)}
          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
        >
          {loading ? 'Analyzing and Uploading...' : 'Add Book with AI Analysis'}
        </button>
      </form>
    </div>
  );

  if (selectedBook) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSelectedBook(null)}
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                ← Back to Library
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{selectedBook.title}</h1>
                <p className="text-gray-600">by {selectedBook.author}</p>
                <div className="flex items-center space-x-2 mt-1">
                  {selectedBook.grade_level && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {selectedBook.grade_level}
                    </span>
                  )}
                  {selectedBook.subject && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {selectedBook.subject}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {selectedBook.ai_insights && (
              <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 AI Learning Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Summary</h4>
                    <p className="text-gray-600 text-sm">{selectedBook.summary}</p>
                  </div>
                  {selectedBook.ai_insights.learning_objectives && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Learning Objectives</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedBook.ai_insights.learning_objectives.slice(0, 3).map((objective, index) => (
                          <span key={index} className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            {objective}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedBook.ai_insights.themes && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Key Themes</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedBook.ai_insights.themes.map((theme, index) => (
                          <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                            {theme}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedBook.ai_insights.difficulty && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Difficulty Level</h4>
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                        {selectedBook.ai_insights.difficulty}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">📖 Content</h2>
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {selectedBook.content}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Vidyaverse
              </h1>
              
              <nav className="flex space-x-6">
                {[
                  { id: 'library', label: 'Library', icon: '📚' },
                  { id: 'search', label: 'Search', icon: '🔍' },
                  { id: 'recommendations', label: 'AI Recommendations', icon: '🤖' },
                  { id: 'upload', label: 'Add Book', icon: '📤' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-indigo-100 text-indigo-700 font-medium'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, {user.name}
              </div>
              <button
                onClick={logout}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'library' && renderLibrary()}
        {activeTab === 'search' && renderSearch()}
        {activeTab === 'recommendations' && renderRecommendations()}
        {activeTab === 'upload' && renderUpload()}
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and get user info
      apiCall('/profile')
        .then((userData) => {
          setUser(userData);
          // Check if onboarding is completed
          if (!userData.onboarding_completed) {
            setOnboardingStep('grade');
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem('token', token);
    
    // Check if onboarding is needed
    if (!userData.onboarding_completed) {
      setOnboardingStep('grade');
    }
  };

  const handleGradeSelection = (grade) => {
    setSelectedGrade(grade);
    setOnboardingStep('subjects');
  };

  const handleSubjectSelection = async (subjects) => {
    try {
      // Complete basic onboarding first
      await apiCall('/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          grade: selectedGrade,
          subjects: subjects
        }),
      });

      // Now start subject-specific textbook selection
      setSelectedSubjects(subjects);
      setCurrentSubjectIndex(0);
      
      if (subjects.length > 0) {
        setOnboardingStep('textbooks');
      } else {
        // If no subjects selected, skip to dashboard
        const result = await apiCall('/profile');
        setUser(result);
        setOnboardingStep(null);
      }
    } catch (error) {
      console.error('Onboarding failed:', error);
      alert('Failed to complete setup: ' + error.message);
    }
  };

  const handleTextbookSelection = async (subject, textbookIds) => {
    try {
      // Move to next subject or complete onboarding
      const nextIndex = currentSubjectIndex + 1;
      
      if (nextIndex < selectedSubjects.length) {
        setCurrentSubjectIndex(nextIndex);
      } else {
        // All subjects completed, go to dashboard
        const result = await apiCall('/profile');
        setUser(result);
        setOnboardingStep(null);
      }
    } catch (error) {
      console.error('Failed to complete textbook selection:', error);
    }
  };

  const handleBackToSubjects = () => {
    setOnboardingStep('subjects');
    setCurrentSubjectIndex(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading Vidyaverse...</div>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider initialUser={user}>
      {!user ? (
        <LoginForm onSuccess={handleLogin} />
      ) : onboardingStep === 'grade' ? (
        <GradeSelection onComplete={handleGradeSelection} />
      ) : onboardingStep === 'subjects' ? (
        <SubjectSelection grade={selectedGrade} onComplete={handleSubjectSelection} />
      ) : onboardingStep === 'textbooks' ? (
        <TextbookSelection 
          grade={selectedGrade} 
          subject={selectedSubjects[currentSubjectIndex]}
          onComplete={handleTextbookSelection}
          onBack={handleBackToSubjects}
        />
      ) : (
        <Dashboard />
      )}
    </AuthProvider>
  );
};

export default App;