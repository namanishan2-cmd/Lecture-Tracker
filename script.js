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


// ===== LOGIN =====
function login() {
  const provider = new firebase.auth.GoogleAuthProvider();

  auth.signInWithPopup(provider).then(res => {
    userId = res.user.uid;
    loadCloudData();
  });
}


// ===== SAVE =====
function save() {
  if (userId) {
    db.collection("users").doc(userId).set({
      data: data,
      todayDone: todayDone
    });
  }
}


// ===== REAL-TIME SYNC =====
function loadCloudData() {
  db.collection("users").doc(userId)
    .onSnapshot(doc => {
      if (doc.exists) {
        let d = doc.data();
        data = d.data || data;
        todayDone = d.todayDone || 0;

        updateAll();
      }
    });
}


// ===== UI =====
function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function goHome() {
  show("home");
  updateAll();
}

function openSubject(s) {
  currentSubject = s;
  subjectTitle.innerText = s;
  renderChapters();
  show("subjectScreen");
}


// ===== CHAPTER =====
function addChapter() {
  let name = chapterName.value;
  let n = parseInt(lectureCount.value);
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
}


// ===== RENDER CHAPTERS =====
function renderChapters() {
  let html = "";

  data[currentSubject].forEach((ch, i) => {
    let done = ch.lectures.filter(l => l.done).length;

    html += `
      <div class="card" onclick="openChapter(${i})">
        ${ch.name} (${done}/${ch.lectures.length})
      </div>
    `;
  });

  chapterList.innerHTML = html;
}


// ===== LECTURE VIEW =====
function openChapter(i) {
  currentChapter = i;
  let ch = data[currentSubject][i];

  chapterTitle.innerText = ch.name;

  let html = `
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

  lectureList.innerHTML = html;
  show("chapterScreen");
}


// ===== TOGGLE =====
function toggle(i, type) {
  let l = data[currentSubject][currentChapter].lectures[i];

  if (type === "done" && !l.done) todayDone++;

  if (type === "rev1" && !l.done) return;
  if (type === "rev2" && !l.rev1) return;

  l[type] = !l[type];

  if (type === "noDpp" && l.noDpp) l.dpp = false;
  if (type === "dpp" && l.dpp) l.noDpp = false;

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

    html += `<div>${s}: ${p}%</div>`;
  });

  dashboard.innerHTML = html;
}


// ===== NEXT =====
function updateNext() {
  for (let s in data) {
    for (let ch of data[s]) {
      for (let l of ch.lectures) {
        if (!l.done) {
          nextLecture.innerText = `Next → ${s} → ${ch.name} → ${l.name}`;
          return;
        }
      }
    }
  }

  nextLecture.innerText = "All done 🎉";
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

  if (window.chart) window.chart.destroy();

  window.chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ data: values }]
    }
  });
}


// ===== MASTER UPDATE =====
function updateAll() {
  updateDashboard();
  updateNext();
  renderChart();
}


// ===== INIT =====
updateAll();