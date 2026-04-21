let unsubscribe = null;
let saveTimeout = null;

// ===== FIREBASE SETUP =====
const firebaseConfig = {
  apiKey: "AIzaSyBV7G5SB-zmARjqhil8iEls6ZB-TvTmroc",
  authDomain: "lecture-tracker-82d36.firebaseapp.com",
  projectId: "lecture-tracker-82d36",
  storageBucket: "lecture-tracker-82d36.appspot.com",
  messagingSenderId: "94742098402",
  appId: "1:94742098402:web:85d772c2b762c0d5c389bb"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

let userId = null;


// ===== DATA =====
let currentSubject = "", currentChapter = "";

let data = {
  Physics: [],
  Chemistry: [],
  Maths: []
};

let dailyTarget = 0;
let todayDone = 0;

let lastResetDate = null;


// ===== LOGIN =====
function login() {
  const provider = new firebase.auth.GoogleAuthProvider();

  auth.signInWithPopup(provider).then(res => {
    userId = res.user.uid;
    loadCloudData();
  });
}
auth.onAuthStateChanged(user => {
  if (user) {
    userId = user.uid;

    document.getElementById("loginBtn").style.display = "none";
    document.getElementById("userInfo").style.display = "block";
    document.getElementById("userName").innerText = user.displayName;

    loadCloudData();
  } else {
    document.getElementById("loginBtn").style.display = "block";
    document.getElementById("userInfo").style.display = "none";
  }
});

function logout() {
  auth.signOut();
}


// ===== SAVE =====
function save() {
  if (!userId) return;

  clearTimeout(saveTimeout);

  saveTimeout = setTimeout(() => {
    db.collection("users").doc(userId).set({
      data: data,
      todayDone: todayDone,
      todayTimeSpent: todayTimeSpent,
      dailyTarget: dailyTarget,
      lastResetDate: lastResetDate
    }, { merge: true });
  }, 500);
}


// ===== REAL-TIME SYNC =====
function loadCloudData() {
  if (!userId) return;

  if (unsubscribe) unsubscribe(); // remove old listener

  unsubscribe = db.collection("users").doc(userId)
    .onSnapshot(doc => {
      if (doc.exists) {
        let d = doc.data();

        if (d.data) data = d.data;
        if (d.todayDone !== undefined) todayDone = d.todayDone;
        if (d.todayTimeSpent !== undefined) todayTimeSpent = d.todayTimeSpent;
        if (d.dailyTarget !== undefined) dailyTarget = d.dailyTarget;
        if (d.lastResetDate !== undefined) lastResetDate = d.lastResetDate;

        updateAll();
      }
    });
}


// ===== UI =====
function show(id) {
  document.querySelectorAll(".screen").forEach(s => {
    s.classList.remove("active");
    s.style.display = "none";   // hard force
  });

  const el = document.getElementById(id);
  if (el) {
    el.classList.add("active");
    el.style.display = "block";
    window.scrollTo(0, 0); // jump to top so it feels like a page switch
  }
}

function goHome() {
  show("home");
  updateAll();
}

function openSubject(s) {
  currentSubject = s;
  document.getElementById("subjectTitle").innerText = s;
  renderChapters();
  show("subjectScreen");
}


// ===== CHAPTER =====
function addChapter() {
  
  if (!currentSubject) {
  alert("Select a subject first");
  return;
}
  let name = document.getElementById("chapterName").value;
let n = parseInt(document.getElementById("lectureCount").value);

if (!name || !n) return;

  let arr = [];

  for (let i = 1; i <= n; i++) {
    arr.push({
      name: "Lecture " + i,
      done: false,
      dpp: false,
      noDpp: false,
      rev1: false,
      rev2: false
    });
  }

  data[currentSubject].push({ name, lectures: arr });
  save();
  renderChapters();

  document.getElementById("chapterName").value = "";
  document.getElementById("lectureCount").value = "";

}


// ===== RENDER CHAPTERS =====
function renderChapters() {
  let html = "";

  data[currentSubject].forEach((ch, i) => {
    let done = ch.lectures.filter(l => l.done).length;

    html += `
  <div class="card" style="display:flex; flex-direction:column; gap:8px;">
    
    <div onclick="openChapter(${i})" style="cursor:pointer">
      ${ch.name} (${done}/${ch.lectures.length})
    </div>

    <button 
      onclick="event.stopPropagation(); deleteChapter(${i})"
      style="background:#7f1d1d; color:white;">
      Delete Chapter
    </button>

  </div>
`;
  });

   if (data[currentSubject].length === 0) {
  document.getElementById("chapterList").innerHTML =
    "<div class='card'>No chapters yet</div>";
  return;
}
  document.getElementById("chapterList").innerHTML = html;
 
}
function deleteChapter(index) {
  if (!confirm("Delete this chapter permanently?")) return;

  data[currentSubject].splice(index, 1);
  save();
  renderChapters();
}
function filterChapters(q) {
  q = (q || "").toLowerCase();

  let html = "";
  data[currentSubject].forEach((ch, i) => {
    if (ch.name.toLowerCase().includes(q)) {
      let done = ch.lectures.filter(l => l.done).length;

      html += `
        <div class="card" onclick="openChapter(${i})">
          ${ch.name} (${done}/${ch.lectures.length})
        </div>
      `;
    }
  });

  document.getElementById("chapterList").innerHTML = html;
}

// ===== LECTURE VIEW =====
function openChapter(i) {
  currentChapter = i;
  let ch = data[currentSubject][i];
  let doneCount = ch.lectures.filter(l => l.done).length;

  document.getElementById("chapterTitle").innerText = ch.name;
  
  let html = `
<h3>${doneCount}/${ch.lectures.length} completed</h3>
<table>
  <tr>
    <th>Name</th><th>Done</th><th>DPP</th><th>No DPP</th><th>Rev1</th><th>Rev2</th>
  </tr>`;

  ch.lectures.forEach((l, j) => {
    html += `
    <tr>
      <td><input value="${l.name}" onchange="edit(${j},this.value)"></td>
      <td><input type="checkbox" ${l.done?'checked':''} onchange="toggle(${j},'done')"></td>
      <td><input type="checkbox" ${l.dpp?'checked':''} onchange="toggle(${j},'dpp')"></td>
      <td><input type="checkbox" ${l.noDpp?'checked':''} onchange="toggle(${j},'noDpp')"></td>
      <td><input type="checkbox" ${l.rev1?'checked':''} onchange="toggle(${j},'rev1')"></td>
      <td><input type="checkbox" ${l.rev2?'checked':''} onchange="toggle(${j},'rev2')"></td>
    </tr>`;
  });

  html += "</table>";

  document.getElementById("lectureList").innerHTML = html;
  show("chapterScreen");
}
function markAllDone() {
  let ch = data[currentSubject][currentChapter];

  ch.lectures.forEach(l => {
    if (!l.done) {
      l.done = true;
      todayDone++;
    }
  });

  save();
  openChapter(currentChapter);
  renderChapters();
}


// ===== TOGGLE =====
function toggle(i, type) {
  let l = data[currentSubject][currentChapter].lectures[i];

  if (type === "done") {
    l.done = !l.done;

    if (l.done) todayDone++;
    else todayDone--;

  } else {
    if (type === "rev1" && !l.done) return;
    if (type === "rev2" && !l.rev1) return;

    l[type] = !l[type];
  }

  if (type === "noDpp" && l.noDpp) l.dpp = false;
  if (type === "dpp" && l.dpp) l.noDpp = false;

  // safety
  todayDone = Math.max(0, todayDone);

  save();
  openChapter(currentChapter);
  renderChapters();
}


// ===== EDIT =====
function edit(i, val) {
  data[currentSubject][currentChapter].lectures[i].name = val;
  save();
}


// ===== DASHBOARD =====
function updateDashboard() {
  let html = "";

  ["Physics","Chemistry","Maths"].forEach(s => {
    let total = 0, done = 0;

    data[s].forEach(ch => {
      total += ch.lectures.length;
      done += ch.lectures.filter(l => l.done).length;
    });

    let p = total ? Math.round(done/total*100) : 0;

    // 👇 REPLACE THIS PART
    html += `
    <div>
      <div style="margin-bottom:6px">${s} - ${p}%</div>

      <div class="progress-bar">
        <div class="progress-fill" style="width:${p}%"></div>
      </div>
    </div>
    `;
  });

  document.getElementById("dashboard").innerHTML = html;
}


// ===== NEXT =====
function updateNext() {
  for (let s in data) {
    for (let ch of data[s]) {
      for (let l of ch.lectures) {
        if (!l.done) {
          document.getElementById("nextLecture").innerText = `Next → ${s} → ${ch.name} → ${l.name}`;
          return;
        }
      }
    }
  }

  document.getElementById("nextLecture").innerText = "All done 🎉";
}
function showPending() {
  let html = "";

  for (let s in data) {
    data[s].forEach(ch => {
      ch.lectures.forEach(l => {
        if (!l.done) {
          html += `<div style="margin-bottom:6px">${s} → ${ch.name} → ${l.name}</div>`;
        }
      });
    });
  }

  showPopup("📌 Pending Work", html || "All done 🎉");
}

function showWeak() {
  let html = "";

  for (let s in data) {
    data[s].forEach(ch => {
      let total = ch.lectures.length;
      let done = ch.lectures.filter(l => l.done).length;

      let p = total ? (done / total) * 100 : 0;

      if (p < 40) {
        html += `<div style="margin-bottom:6px">${s} → ${ch.name} (${Math.round(p)}%)</div>`;
      }
    });
  }

  showPopup("⚠️ Weak Chapters", html || "No weak chapters 🎉");
}


// ===== CHART =====
function renderChart() {
  let labels = ["Physics","Chemistry","Maths"];
  let values = [];

  labels.forEach(s => {
    let total = 0, done = 0;

    data[s].forEach(ch => {
      total += ch.lectures.length;
      done += ch.lectures.filter(l => l.done).length;
    });

    values.push(total ? Math.round(done/total*100) : 0);
  });

  let ctx = document.getElementById("chart");

  if (!ctx || typeof Chart === "undefined") return;

  if (JSON.stringify(values) === JSON.stringify(window.lastChartData)) return;
window.lastChartData = values;

if (window.chart && typeof window.chart.destroy === "function") {
  window.chart.destroy();
}

  window.chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Progress %",
        data: values
      }]
    }
  });
}


// ===== MASTER UPDATE =====
function updateAll() {
  checkDailyReset();   // 👈 ADD THIS FIRST

  updateDashboard();
  updateNext();
  renderChart();
  updateTodayTime();
  updateDailyReport();
}





// ===== TIMER =====
let timer = null;
let seconds = 0;
let todayTimeSpent = 0;

function startTimer() {
  console.log("Start clicked");

  if (timer) return;

  timer = setInterval(() => {
    seconds++;
    updateTimerDisplay();
  }, 1000);
   
}

function stopTimer() {
  if (!timer) return;

  clearInterval(timer);
  timer = null;

  todayTimeSpent += seconds;
  seconds = 0;

  updateTodayTime();
  save();
}
function checkDailyReset() {
  let now = new Date();

  let today = now.toDateString();

  // create today's 4 AM
  let resetTime = new Date();
  resetTime.setHours(4, 0, 0, 0);

  // if before 4 AM → treat as previous day
  if (now < resetTime) {
    resetTime.setDate(resetTime.getDate() - 1);
    today = resetTime.toDateString();
  }

  if (lastResetDate !== today) {
    todayDone = 0;
    todayTimeSpent = 0;

    lastResetDate = today;

    save();
  }
}


function updateTimerDisplay() {
  let m = Math.floor(seconds / 60);
  let s = seconds % 60;

  let el = document.getElementById("timerDisplay");
  if (!el) return;

  el.innerText =
    String(m).padStart(2,'0') + ":" +
    String(s).padStart(2,'0');
}
function updateTodayTime() {
  let m = Math.floor(todayTimeSpent / 60);

  let el = document.getElementById("todayTime");
  if (!el) return;

  el.innerText = "Today: " + m + " min";
}
function updateDailyReport() {
  let report = "";

  // lectures
  report += "📚 Lectures Done: " + todayDone + "<br>";

  // time
  let minutes = Math.floor(todayTimeSpent / 60);
  report += "⏱️ Time Studied: " + minutes + " min<br>";

  // target
  if (dailyTarget > 0) {
    let percent = Math.round((todayDone / dailyTarget) * 100);
    report += "🎯 Target: " + todayDone + "/" + dailyTarget + " (" + percent + "%)<br>";

    if (percent >= 100) {
      report += "🔥 Great job!";
    } else if (percent >= 60) {
      report += "👍 Decent, push more";
    } else {
      report += "⚠️ Needs focus";
    }
  }

  document.getElementById("dailyReport").innerHTML = report;
}
function setDailyTarget() {
  dailyTarget = parseInt(document.getElementById("dailyTargetInput").value) || 0;

  save();
  updateDailyReport();
}
function showPopup(title, content) {
  document.getElementById("popupTitle").innerText = title;
  document.getElementById("popupBody").innerHTML = content;
  document.getElementById("popup").classList.remove("hidden");
}

function closePopup() {
  document.getElementById("popup").classList.add("hidden");
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden && timer) {
    stopTimer();
  }
});