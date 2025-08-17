import React, { useState, useEffect, useContext, createContext } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

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

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
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
          <p className="text-gray-600">AI-Powered Digital Library</p>
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
      <div className="flex items-center space-x-2">
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
            content: uploadForm.content
          }),
        });
      }

      setUploadForm({ title: '', author: '', content: '', file: null });
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
    }
  };

  const renderLibrary = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Your Library</h2>
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
            placeholder="Search books, authors, topics, or describe what you're looking for..."
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
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {selectedBook.ai_insights && (
              <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Summary</h4>
                    <p className="text-gray-600 text-sm">{selectedBook.summary}</p>
                  </div>
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
                </div>
              </div>
            )}

            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Content</h2>
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and get user info
      apiCall('/profile')
        .then((userData) => setUser(userData))
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
    <AuthProvider>
      {user ? <Dashboard /> : <LoginForm onSuccess={handleLogin} />}
    </AuthProvider>
  );
};

export default App;