// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDQXWJ4wiR8-52AjRxcTjgbeigTtIzkKgU",
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

// Toast notification system
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Toggle password visibility
function togglePassword(id) {
  const input = document.getElementById(id);
  const icon = input.parentElement.querySelector('.toggle-password i');
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fas fa-eye';
  }
}

// Enhanced login with loading state
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const button = document.querySelector('.btn-primary');
  
  if (!email || !password) {
    showToast('Please enter email and password', 'error');
    return;
  }
  
  // Add loading state
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
  button.disabled = true;
  
  try {
    await auth.signInWithEmailAndPassword(email, password);
    showToast('Welcome back!', 'success');
    setTimeout(() => window.location = "gallery.html", 1500);
  } catch (err) {
    button.innerHTML = originalText;
    button.disabled = false;
    showToast(err.message, 'error');
  }
}

// Google login with loading
async function googleLogin() {
  const button = document.querySelector('.btn-google');
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
  button.disabled = true;
  
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    await auth.signInWithPopup(provider);
    showToast('Successfully signed in with Google', 'success');
    setTimeout(() => window.location = "gallery.html", 1500);
  } catch (err) {
    button.innerHTML = originalText;
    button.disabled = false;
    showToast(err.message, 'error');
  }
}

// Password reset with validation
async function resetPassword() {
  const email = document.getElementById("email")?.value || prompt("Enter your email:");
  
  if (!email) {
    showToast('Please enter your email address', 'error');
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast('Please enter a valid email address', 'error');
    return;
  }
  
  try {
    await auth.sendPasswordResetEmail(email);
    showToast('Password reset email sent! Check your inbox.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Signup function
async function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const button = document.querySelector('.btn-primary');
  
  if (!email || !password) {
    showToast('Please enter email and password', 'error');
    return;
  }
  
  if (password.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }
  
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
  button.disabled = true;
  
  try {
    await auth.createUserWithEmailAndPassword(email, password);
    
    // Create user document in Firestore
    await db.collection("users").doc(auth.currentUser.uid).set({
      email: email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      role: 'user'
    });
    
    showToast('Account created successfully!', 'success');
    setTimeout(() => window.location = "gallery.html", 1500);
  } catch (err) {
    button.innerHTML = originalText;
    button.disabled = false;
    showToast(err.message, 'error');
  }
}

// Logout with confirmation
async function logout() {
  if (confirm('Are you sure you want to logout?')) {
    await auth.signOut();
    showToast('Logged out successfully', 'success');
    setTimeout(() => window.location = "index.html", 1000);
  }
}

// Enhanced gallery loading with pagination
let galleryData = [];
let lastVisible = null;
const itemsPerPage = 9;

async function loadGallery(loadMore = false) {
  const gallery = document.getElementById("gallery");
  const loading = document.getElementById("loading");
  
  if (!loadMore) {
    gallery.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
      </div>
    `;
    galleryData = [];
  } else if (loading) {
    loading.style.display = 'block';
  }
  
  try {
    let query = db.collection("images")
      .orderBy("createdAt", "desc")
      .limit(itemsPerPage);
    
    if (loadMore && lastVisible) {
      query = query.startAfter(lastVisible);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      if (!loadMore) {
        gallery.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-image"></i>
            <h3>No images found</h3>
            <p>Start by uploading your first AI-generated image!</p>
          </div>
        `;
      }
      return;
    }
    
    lastVisible = snapshot.docs[snapshot.docs.length - 1];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      galleryData.push({...data, id: doc.id});
      
      if (!loadMore) {
        gallery.innerHTML = '';
      }
      
      const card = document.createElement("div");
      card.className = "gallery-card";
      card.innerHTML = `
        <div class="card-image">
          ${data.url ? `<img src="${data.url}" alt="${data.prompt}" loading="lazy">` : 
            '<i class="fas fa-image fa-3x"></i>'}
        </div>
        <div class="card-content">
          <h4>${data.title || 'Untitled'}</h4>
          <p>${data.prompt?.substring(0, 150) || 'No description'}</p>
          <div class="card-meta">
            <span><i class="far fa-calendar"></i> ${formatDate(data.createdAt?.toDate())}</span>
            <span><i class="far fa-user"></i> ${data.author || 'Unknown'}</span>
          </div>
        </div>
      `;
      
      gallery.appendChild(card);
    });
    
  } catch (err) {
    showToast('Error loading gallery: ' + err.message, 'error');
  } finally {
    if (loading) loading.style.display = 'none';
  }
}

// Format date helper
function formatDate(date) {
  if (!date) return 'Unknown date';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

// Search with debounce
let searchTimeout;
function filterGallery() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const query = document.getElementById("search").value.toLowerCase();
    const cards = document.querySelectorAll('.gallery-card');
    
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(query) ? 'block' : 'none';
    });
  }, 300);
}

// Initialize gallery page
function initGallery() {
  if (!window.location.pathname.includes("gallery.html")) return;
  
  auth.onAuthStateChanged(async user => {
    if (!user) {
      showToast('Please login first', 'error');
      setTimeout(() => window.location = "index.html", 1500);
      return;
    }
    
    // Update user info in header
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
      userInfo.innerHTML = `
        <div class="user-avatar">
          ${user.email?.charAt(0).toUpperCase()}
        </div>
        <div>
          <div class="user-name">${user.displayName || user.email}</div>
          <div class="user-email">${user.email}</div>
        </div>
      `;
    }
    
    // Load gallery
    await loadGallery();
    
    // Setup infinite scroll
    window.addEventListener('scroll', () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        loadGallery(true);
      }
    });
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on gallery page
  if (window.location.pathname.includes("gallery.html")) {
    initGallery();
  }
  
  // Remember me functionality
  const rememberedEmail = localStorage.getItem("remembered");
  if (rememberedEmail && document.getElementById("email")) {
    document.getElementById("email").value = rememberedEmail;
    document.getElementById("remember").checked = true;
  }
});
