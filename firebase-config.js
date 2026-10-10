import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 1) Paste your Firebase web-app config here (Project settings > Your apps)
export const firebaseConfig = {
  apiKey: "AIzaSyB8p1w8d4Gxi0hXJ1eNYB8l4CRi12m0qwc",
  authDomain: "class-gameleaderboard.firebaseapp.com",
  projectId: "class-gameleaderboard",
  appId: "1:176624806101:web:1e9d7b1dcf36fdbf9c1a5c"
};


// 2) Cloudinary: cloud name + an UNSIGNED upload preset
export const CLOUDINARY = { cloudName: "crlsifll", uploadPreset: "class-photo" };

// 3) Games with a leaderboard. "id" must be lowercase letters, numbers, dashes.
export const GAMES = [
  { id: "cs2", name: "Counter-Strike 2" },
  { id: "brawl-stars-tr", name: "Brawl Stars (Trophies)" },
  { id: "block", name: "Blockblast" },
  { id: "fortnite", name: "Fortnite" },
  { id: "bird", name: "Flappy Bird" },
  { id: "dl2", name: "Drift Legends 2" },
  { id: "gd", name: "Geometry Dash" }
];

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Username + password login is built on Firebase email/password with a fake email.
export const toEmail = u => `${u.toLowerCase()}@leaderboard.invalid`;
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
