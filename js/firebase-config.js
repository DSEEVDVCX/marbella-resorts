const firebaseConfig = {
  apiKey: "AIzaSyDmh9KrXI7WPzywuopF55gUjMyOvZejMkI",
  authDomain: "marbella-resorts.firebaseapp.com",
  projectId: "marbella-resorts",
  storageBucket: "marbella-resorts.firebasestorage.app",
  messagingSenderId: "891120028271",
  appId: "1:891120028271:web:11b584600bf2c260705b9a"
};

// Initialize Firebase using compat libraries (loaded via CDN)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();
