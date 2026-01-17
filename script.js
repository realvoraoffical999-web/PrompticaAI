// Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "prompticaai-37612.firebaseapp.com",
  projectId: "prompticaai-37612",
  storageBucket: "prompticaai-37612.firebasestorage.app",
  messagingSenderId: "133853035656",
  appId: "1:133853035656:web:eb5f717610b6061b17733d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// REAL TIME DATA
let currentUser = null;
let prompts = [];
let collections = [];
let trendingPrompts = [];

// Toast System
function showToast(message, type = 'success') {
  const container = document.querySelector('.toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    <span>${message}</span>
    <button class="toast-close" style="margin-left: auto; background: none; border: none; color: #666; cursor: pointer;">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  container.appendChild(toast);
  
  // Auto remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
  
  // Manual close
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  });
}

function createToastContainer() {
  const container = document.createElement('div');
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// Modal System
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

// File Upload Handler
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    showToast('Please upload an image file (JPEG, PNG, WebP, GIF)', 'error');
    return;
  }
  
  // Validate size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    showToast('File size must be less than 5MB', 'error');
    return;
  }
  
  // Show preview
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById('imagePreview');
    if (preview) {
      preview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; border-radius: 8px;">`;
    }
  };
  reader.readAsDataURL(file);
  
  // Update UI
  const uploadArea = event.target.closest('.upload-area');
  if (uploadArea) {
    uploadArea.style.borderColor = '#6750A4';
    uploadArea.style.background = 'rgba(103, 80, 164, 0.02)';
  }
}

// Drag and Drop Upload
function setupDragAndDrop() {
  const uploadAreas = document.querySelectorAll('.upload-area');
  uploadAreas.forEach(area => {
    area.addEventListener('dragover', (e) => {
      e.preventDefault();
      area.style.borderColor = '#6750A4';
      area.style.background = 'rgba(103, 80, 164, 0.04)';
    });
    
    area.addEventListener('dragleave', () => {
      area.style.borderColor = '';
      area.style.background = '';
    });
    
    area.addEventListener('drop', (e) => {
      e.preventDefault();
      area.style.borderColor = '#6750A4';
      area.style.background = 'rgba(103, 80, 164, 0.02)';
      
      const file = e.dataTransfer.files[0];
      if (file) {
        const input = area.querySelector('input[type="file"]');
        if (input) {
          input.files = e.dataTransfer.files;
          handleFileUpload({ target: input });
        }
      }
    });
  });
}

// Prompt Management
async function savePrompt(promptData) {
  if (!currentUser) {
    showToast('Please login to save prompts', 'error');
    return;
  }
  
  try {
    const promptRef = await db.collection('prompts').add({
      ...promptData,
      userId: currentUser.uid,
      userName: currentUser.displayName || currentUser.email,
      userAvatar: currentUser.photoURL,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      likes: 0,
      saves: 0,
      views: 0,
      tags: promptData.tags || [],
      aiModel: promptData.aiModel || 'midjourney',
      version: promptData.version || 'v5.2'
    });
    
    showToast('Prompt saved successfully!', 'success');
    return promptRef.id;
  } catch (error) {
    showToast('Error saving prompt: ' + error.message, 'error');
    throw error;
  }
}

async function loadPrompts(filters = {}) {
  try {
    let query = db.collection('prompts').orderBy('createdAt', 'desc');
    
    // Apply filters
    if (filters.aiModel) {
      query = query.where('aiModel', '==', filters.aiModel);
    }
    
    if (filters.userId) {
      query = query.where('userId', '==', filters.userId);
    }
    
    const snapshot = await query.limit(20).get();
    prompts = [];
    
    snapshot.forEach(doc => {
      prompts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    renderPrompts();
    return prompts;
  } catch (error) {
    showToast('Error loading prompts: ' + error.message, 'error');
    return [];
  }
}

function renderPrompts() {
  const container = document.getElementById('promptsContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (prompts.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 48px; color: #666;">
        <i class="fas fa-image" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
        <h3>No prompts yet</h3>
        <p>Be the first to share a prompt!</p>
      </div>
    `;
    return;
  }
  
  prompts.forEach(prompt => {
    const promptElement = createPromptCard(prompt);
    container.appendChild(promptElement);
  });
}

function createPromptCard(prompt) {
  const div = document.createElement('div');
  div.className = 'card';
  div.innerHTML = `
    <div class="card-image">
      ${prompt.imageUrl ? 
        `<img src="${prompt.imageUrl}" alt="${prompt.title}" style="width: 100%; height: 100%; object-fit: cover;">` :
        `<i class="fas fa-robot" style="font-size: 48px;"></i>`
      }
    </div>
    <div class="card-content">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <h3 class="card-title">${prompt.title}</h3>
        <button class="btn btn-outline" style="padding: 4px 12px; font-size: 12px;">
          <i class="fas fa-copy"></i>
          Copy
        </button>
      </div>
      <p class="card-description">${prompt.description || 'No description'}</p>
      
      <div style="display: flex; gap: 8px; margin: 16px 0;">
        ${(prompt.tags || []).map(tag => 
          `<span style="font-size: 12px; color: #666; background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">${tag}</span>`
        ).join('')}
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: #6750A4; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;">
            ${prompt.userName ? prompt.userName.charAt(0).toUpperCase() : 'U'}
          </div>
          <span style="font-size: 14px; color: #666;">${prompt.userName || 'Anonymous'}</span>
        </div>
        
        <div style="display: flex; gap: 16px;">
          <button class="btn-like" onclick="likePrompt('${prompt.id}')" style="background: none; border: none; color: #666; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            <i class="fas fa-heart"></i>
            <span>${prompt.likes || 0}</span>
          </button>
          <button class="btn-save" onclick="saveToCollection('${prompt.id}')" style="background: none; border: none; color: #666; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            <i class="fas fa-bookmark"></i>
          </button>
        </div>
      </div>
    </div>
  `;
  
  return div;
}

// Authentication
async function login(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    currentUser = userCredential.user;
    showToast('Welcome back!', 'success');
    
    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
    
    return userCredential;
  } catch (error) {
    showToast(error.message, 'error');
    throw error;
  }
}

async function signup(email, password, displayName) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    
    // Update profile
    await userCredential.user.updateProfile({
      displayName: displayName
    });
    
    // Create user document
    await db.collection('users').doc(userCredential.user.uid).set({
      email: email,
      displayName: displayName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      role: 'user',
      stats: {
        promptsCreated: 0,
        promptsSaved: 0,
        likesGiven: 0,
        likesReceived: 0
      }
    });
    
    currentUser = userCredential.user;
    showToast('Account created successfully!', 'success');
    
    // Redirect to onboarding
    setTimeout(() => {
      window.location.href = 'onboarding.html';
    }, 1000);
    
    return userCredential;
  } catch (error) {
    showToast(error.message, 'error');
    throw error;
  }
}

async function googleLogin() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    const userCredential = await auth.signInWithPopup(provider);
    currentUser = userCredential.user;
    
    // Check if user exists in Firestore
    const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
    if (!userDoc.exists) {
      // Create new user document
      await db.collection('users').doc(userCredential.user.uid).set({
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        role: 'user',
        stats: {
          promptsCreated: 0,
          promptsSaved: 0,
          likesGiven: 0,
          likesReceived: 0
        }
      });
    }
    
    showToast('Signed in with Google', 'success');
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
    
    return userCredential;
  } catch (error) {
    showToast(error.message, 'error');
    throw error;
  }
}

// Dashboard Functions
async function loadDashboardData() {
  if (!currentUser) return;
  
  try {
    // Load user's prompts
    const userPrompts = await loadPrompts({ userId: currentUser.uid });
    
    // Load saved prompts
    const savedSnapshot = await db.collection('savedPrompts')
      .where('userId', '==', currentUser.uid)
      .limit(10)
      .get();
    
    // Load collections
    const collectionsSnapshot = await db.collection('collections')
      .where('userId', '==', currentUser.uid)
      .get();
    
    collections = [];
    collectionsSnapshot.forEach(doc => {
      collections.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Update UI
    updateDashboardStats(userPrompts.length, savedSnapshot.size, collections.length);
    renderCollections();
    
  } catch (error) {
    showToast('Error loading dashboard data: ' + error.message, 'error');
  }
}

function updateDashboardStats(promptsCount, savedCount, collectionsCount) {
  const stats = {
    'totalPrompts': promptsCount,
    'savedPrompts': savedCount,
    'collections': collectionsCount,
    'likesReceived': 0 // You would calculate this from your data
  };
  
  Object.keys(stats).forEach(statId => {
    const element = document.getElementById(statId);
    if (element) {
      animateCounter(element, stats[statId]);
    }
  });
}

function animateCounter(element, target) {
  let current = 0;
  const increment = target / 50; // 50 steps for animation
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = Math.floor(current);
  }, 20);
}

// Initialize App
function initApp() {
  // Setup auth state listener
  auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    
    if (user) {
      // User is signed in
      if (window.location.pathname.includes('login.html') || 
          window.location.pathname.includes('signup.html')) {
        // Redirect to dashboard if already logged in
        window.location.href = 'dashboard.html';
      }
      
      // Load user-specific data
      if (window.location.pathname.includes('dashboard.html')) {
        await loadDashboardData();
      }
    } else {
      // User is signed out
      if (window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'login.html';
      }
    }
  });
  
  // Setup file uploads
  setupDragAndDrop();
  
  // Setup modal close buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-close') || 
        e.target.closest('.modal-close')) {
      const modal = e.target.closest('.modal');
      if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
      }
    }
    
    // Close modal when clicking outside
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
  });
  
  // Initialize page-specific functionality
  if (window.location.pathname.includes('index.html')) {
    loadTrendingPrompts();
  }
}

// Load trending prompts for homepage
async function loadTrendingPrompts() {
  try {
    const snapshot = await db.collection('prompts')
      .orderBy('likes', 'desc')
      .limit(8)
      .get();
    
    trendingPrompts = [];
    snapshot.forEach(doc => {
      trendingPrompts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Update trending section
    renderTrendingPrompts();
  } catch (error) {
    console.error('Error loading trending prompts:', error);
  }
}

function renderTrendingPrompts() {
  const container = document.getElementById('trendingPrompts');
  if (!container || trendingPrompts.length === 0) return;
  
  container.innerHTML = trendingPrompts.map(prompt => createPromptCard(prompt)).join('');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
