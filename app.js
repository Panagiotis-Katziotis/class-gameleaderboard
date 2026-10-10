import { auth, db, GAMES, CLOUDINARY, toEmail, esc } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, deleteUser }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, doc, getDoc, setDoc, getDocs, addDoc, query, where, orderBy, limit, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const $ = s => document.querySelector(s);
const fmt = ts => ts?.toDate ? ts.toDate().toLocaleDateString() : "";
let user = null, game = GAMES[0].id, mode = "login";

// ---------- Leaderboard ----------
$("#tabs").innerHTML = GAMES.map(g => `<button class="tab" data-g="${g.id}">${esc(g.name)}</button>`).join("");
$("#tabs").onclick = e => { if (e.target.dataset.g) { game = e.target.dataset.g; loadBoard(); } };
$("#game").innerHTML = GAMES.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join("");

async function loadBoard() {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.g === game));
  const body = $("#board");
  body.innerHTML = `<tr><td colspan="4">Loading…</td></tr>`;
  try {
    const snap = await getDocs(query(collection(db, "leaderboards", game, "entries"), orderBy("score", "desc"), limit(100)));
    body.innerHTML = snap.empty
      ? `<tr><td colspan="4">No verified scores yet. Be the first to submit one.</td></tr>`
      : snap.docs.map((d, i) => { const e = d.data();
          return `<tr class="r${i + 1}"><td class="rank">#${i + 1}</td><td>${esc(e.username)}</td><td class="score">${Number(e.score).toLocaleString()}</td><td>${fmt(e.date)}</td></tr>`; }).join("");
  } catch (err) { body.innerHTML = `<tr><td colspan="4">Could not load the leaderboard: ${esc(err.code || err.message)}</td></tr>`; }
}

async function loadMine() {
  if (!user) return;
  try {
    const snap = await getDocs(query(collection(db, "submissions"), where("uid", "==", user.uid), limit(50)));
    const rows = snap.docs.map(d => d.data()).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    $("#mine").innerHTML = rows.length ? rows.map(s =>
      `<tr><td>${esc(GAMES.find(g => g.id === s.game)?.name || s.game)}</td><td class="score">${s.score.toLocaleString()}</td><td>${fmt(s.createdAt)}</td>
       <td class="${s.status}">${s.status}${s.reason ? " – " + esc(s.reason) : ""}</td></tr>`).join("")
      : `<tr><td colspan="4">You haven't submitted anything yet.</td></tr>`;
  } catch (e) { $("#mine").innerHTML = `<tr><td colspan="4">${esc(e.code || e.message)}</td></tr>`; }
}

// ---------- Auth ----------
onAuthStateChanged(auth, u => { user = u; renderUser(); });
function renderUser() {
  $("#who").textContent = user?.displayName || "";
  document.querySelectorAll("[data-in]").forEach(e => e.hidden = !user);
  document.querySelectorAll("[data-out]").forEach(e => e.hidden = !!user);
  loadMine();
}
document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => b.closest("dialog").close());
$("#openAuth").onclick = () => $("#authDlg").showModal();
$("#logout").onclick = () => signOut(auth);
$("#switch").onclick = e => {
  e.preventDefault();
  mode = mode === "login" ? "register" : "login";
  const reg = mode === "register";
  $("#authTitle").textContent = $("#authBtn").textContent = reg ? "Register" : "Log in";
  $("#switch").textContent = reg ? "Have an account? Log in" : "No account? Register";
  $("#p").autocomplete = reg ? "new-password" : "current-password";
};

$("#authForm").onsubmit = async e => {
  e.preventDefault();
  const name = $("#u").value.trim(), pass = $("#p").value, err = $("#authErr");
  err.textContent = "";
  try {
    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) throw Error("Username must be 3–16 letters, numbers or underscores.");
    if (mode === "register") {
      const key = name.toLowerCase();
      if ((await getDoc(doc(db, "usernames", key))).exists()) throw Error("That username is taken.");
      const cred = await createUserWithEmailAndPassword(auth, toEmail(name), pass);
      try {
        await setDoc(doc(db, "usernames", key), { uid: cred.user.uid });
        await updateProfile(cred.user, { displayName: name });
      } catch { await deleteUser(cred.user); throw Error("That username is taken."); }
      renderUser();
    } else await signInWithEmailAndPassword(auth, toEmail(name), pass);
    $("#authDlg").close(); e.target.reset();
  } catch (x) {
    err.textContent = ["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"].includes(x.code)
      ? "Wrong username or password." : x.code === "auth/email-already-in-use" ? "That username is taken." : x.message;
  }
};

// ---------- Submit score ----------
$("#openSubmit").onclick = () => { $("#subMsg").textContent = ""; $("#subDlg").showModal(); };
$("#subForm").onsubmit = async e => {
  e.preventDefault();
  const f = $("#img").files[0], score = Math.floor(Number($("#score").value)), msg = $("#subMsg"), btn = $("#subBtn");
  if (!f || !f.type.startsWith("image/") || f.size > 5e6) { msg.textContent = "Evidence must be an image under 5 MB."; return; }
  if (!(score > 0)) { msg.textContent = "Enter a score above 0."; return; }
  btn.disabled = true; msg.textContent = "Uploading…";
  try {
    const fd = new FormData();
    fd.append("file", f); fd.append("upload_preset", CLOUDINARY.uploadPreset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`, { method: "POST", body: fd });
    const j = await res.json();
    if (!j.secure_url) throw Error(j.error?.message || "Image upload failed.");
    await addDoc(collection(db, "submissions"), {
      uid: user.uid, username: user.displayName, game: $("#game").value, score,
      imageUrl: j.secure_url, status: "pending", createdAt: serverTimestamp()
    });
    e.target.reset(); msg.textContent = "Sent! An inspector will review it soon."; loadMine();
  } catch (x) { msg.textContent = x.message; } finally { btn.disabled = false; }
};

loadBoard();
