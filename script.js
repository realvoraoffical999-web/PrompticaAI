// Firebase config → YOUR PROJECT API
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

// Toggle password
function togglePassword(id){
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
}

// Signup
function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  if(!email || !password) return alert("Enter email & password");

  auth.createUserWithEmailAndPassword(email,password)
    .then(()=>window.location="gallery.html")
    .catch(err=>alert(err.message));
}

// Login
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const remember = document.getElementById("remember").checked;

  auth.signInWithEmailAndPassword(email,password)
    .then(()=>{
      if(remember) localStorage.setItem("remembered",email);
      window.location="gallery.html";
    })
    .catch(err=>alert(err.message));
}

// Google Login
function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(()=>window.location="gallery.html")
    .catch(err=>alert(err.message));
}

// Forgot Password
function resetPassword(){
  const email = prompt("Enter your email:");
  if(!email) return;
  auth.sendPasswordResetEmail(email)
    .then(()=>alert("Password reset email sent!"))
    .catch(err=>alert(err.message));
}

// Logout
function logout(){
  auth.signOut().then(()=>window.location="index.html");
}

// Load Gallery
let galleryData = [];
auth.onAuthStateChanged(user=>{
  if(!user && window.location.pathname.includes("gallery.html")) window.location="index.html";

  if(user && window.location.pathname.includes("gallery.html")){
    db.collection("images").get().then(snapshot=>{
      galleryData=[];
      const gallery = document.getElementById("gallery");
      gallery.innerHTML="";
      snapshot.forEach(doc=>{
        const data = doc.data();
        galleryData.push(data);
        const card = document.createElement("div");
        card.classList.add("gallery-card");
        card.innerHTML=`<img src="${data.url}"/><p>${data.prompt}</p>`;
        gallery.appendChild(card);
      });
    });
  }
});

// Filter gallery
function filterGallery(){
  const query = document.getElementById("search").value.toLowerCase();
  const gallery = document.getElementById("gallery");
  gallery.innerHTML="";
  galleryData.filter(img=>img.prompt.toLowerCase().includes(query))
    .forEach(data=>{
      const card = document.createElement("div");
      card.classList.add("gallery-card");
      card.innerHTML=`<img src="${data.url}"/><p>${data.prompt}</p>`;
      gallery.appendChild(card);
    });
}
