/* ============================================================
   QUIZMASTER v3 — Editorial design
   Logic: upload → quiz → result
============================================================ */

// ============ STATE ============
let allQuestions = [];
let quizQuestions = [];
let currentIndex = 0;
let score = 0;
let userAnswers = [];
let answered = false;
let timerInterval = null;
let timeLeft = 30;
let soundEnabled = false;
let timerEnabled = true;

const TIME_PER_QUESTION = 30;
const BEST_SCORE_KEY  = "quiz_best_score";
const THEME_KEY       = "quiz_theme";
const PROGRESS_KEY    = "quiz_progress";
const SETTINGS_KEY    = "quiz_settings";

// ============ AUDIO ============
let audioCtx = null;
function playTone(freq, duration = 0.12, type = "sine") {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
  } catch (e) { /* ignore */ }
}
const playCorrect = () => { playTone(660, 0.1); setTimeout(() => playTone(880, 0.15), 100); };
const playWrong   = () => { playTone(220, 0.25, "sawtooth"); };

// ============ DOM ============
const uploadScreen = document.getElementById("upload-screen");
const quizScreen   = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");
const dropZone     = document.getElementById("drop-zone");
const fileInput    = document.getElementById("file-input");
const downloadSampleBtn = document.getElementById("download-sample");
const useDemoBtn   = document.getElementById("use-demo");
const resumeBtn    = document.getElementById("resume-btn");
const themeToggle  = document.getElementById("theme-toggle");
const iconSun      = document.getElementById("iconSun");
const iconMoon     = document.getElementById("iconMoon");

const optShuffleQ  = document.getElementById("opt-shuffle-q");
const optShuffleA  = document.getElementById("opt-shuffle-a");
const optSound     = document.getElementById("opt-sound");
const optTimer     = document.getElementById("opt-timer");
const optLimit     = document.getElementById("opt-limit");

const questionCounter = document.getElementById("question-counter");
const scoreInfo       = document.getElementById("score-info");
const timerEl         = document.getElementById("timer");
const timerValueEl    = document.getElementById("timer-value");
const progressFill    = document.getElementById("progress-fill");
const questionText    = document.getElementById("question-text");
const optionsContainer= document.getElementById("options-container");
const feedback        = document.getElementById("feedback");
const nextBtn         = document.getElementById("next-btn");
const nextBtnText     = nextBtn.querySelector(".btn-text");
const quitBtn         = document.getElementById("quit-btn");

const totalQEl        = document.getElementById("total-q");
const correctQEl      = document.getElementById("correct-q");
const wrongQEl        = document.getElementById("wrong-q");
const percentEl       = document.getElementById("percent");
const bestScoreEl     = document.getElementById("best-score");
const reviewList      = document.getElementById("review-list");
const reviewCountEl   = document.getElementById("review-count");
const restartBtn      = document.getElementById("restart-btn");
const newFileBtn      = document.getElementById("new-file-btn");
const trophyEl        = document.getElementById("trophy");
const resultTitle     = document.getElementById("result-title");
const resultSubtitle  = document.getElementById("result-subtitle");

// Hero / Sidebar
const heroLabel       = document.getElementById("heroLabel");
const heroValue       = document.getElementById("heroValue");
const heroTrend       = document.getElementById("heroTrend");
const totalCorrect    = document.getElementById("totalCorrect");
const totalWrong      = document.getElementById("totalWrong");
const totalQuestions  = document.getElementById("totalQuestions");
const sideRingFill    = document.getElementById("side-ring-fill");
const sideProgressValue = document.getElementById("side-progress-value");
const sideProgressText  = document.getElementById("side-progress-text");
const miniAnswered    = document.getElementById("mini-answered");
const miniCorrect     = document.getElementById("mini-correct");
const miniWrong       = document.getElementById("mini-wrong");
const miniBest        = document.getElementById("mini-best");
const headerSub       = document.getElementById("headerSub");

// ============ DEMO QUESTIONS ============
const DEMO_QUESTIONS = [
  { question: "JavaScript là ngôn ngữ lập trình chạy ở đâu?", options: ["Máy chủ", "Trình duyệt", "Cả hai", "Không chạy được"], answer: 2, explanation: "JavaScript có thể chạy cả trên trình duyệt (client) và máy chủ (Node.js)." },
  { question: "Từ khóa nào khai báo biến không thể gán lại trong JS?", options: ["var", "let", "const", "static"], answer: 2, explanation: "const khai báo hằng số, không thể gán lại giá trị." },
  { question: "Kết quả của '2' + 2 trong JavaScript là gì?", options: ["4", "22", "NaN", "Lỗi"], answer: 1, explanation: "Toán tử + với chuỗi sẽ nối chuỗi, nên '2' + 2 = '22'." },
  { question: "Phương thức nào thêm phần tử vào cuối mảng?", options: ["push()", "pop()", "shift()", "unshift()"], answer: 0, explanation: "push() thêm phần tử vào cuối mảng, pop() xóa phần tử cuối." },
  { question: "DOM là viết tắt của gì?", options: ["Data Object Model", "Document Object Model", "Digital Object Model", "Document Oriented Model"], answer: 1, explanation: "DOM = Document Object Model." },
  { question: "typeof null trong JavaScript trả về gì?", options: ["'null'", "'object'", "'undefined'", "'number'"], answer: 1, explanation: "Đây là bug nổi tiếng của JS - typeof null trả về 'object'." },
  { question: "Arrow function khác function thường ở điểm nào?", options: ["Không có this riêng", "Không thể trả về giá trị", "Không có tham số", "Không thể gán vào biến"], answer: 0, explanation: "Arrow function không có this riêng." },
  { question: "Promise có mấy trạng thái?", options: ["1", "2", "3", "4"], answer: 2, explanation: "Promise có 3 trạng thái: pending, fulfilled, rejected." },
  { question: "Cách nào KHÔNG phải là kiểu dữ liệu nguyên thủy trong JS?", options: ["string", "number", "object", "boolean"], answer: 2, explanation: "object là kiểu tham chiếu." },
  { question: "localStorage lưu dữ liệu dưới dạng nào?", options: ["Object", "Array", "String", "Number"], answer: 2, explanation: "localStorage chỉ lưu string." }
];

// ============ INIT ============
function init() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
  updateThemeIcons();
  loadSettings();
  checkResume();
  updateSidebarStats();
  bindEvents();
  updateHeaderSub();
}

function updateThemeIcons() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  iconSun.style.display  = isDark ? "none" : "block";
  iconMoon.style.display = isDark ? "block" : "none";
}

function updateHeaderSub() {
  const d = new Date();
  const opts = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  headerSub.textContent = d.toLocaleDateString("vi-VN", opts);
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    if (s.shuffleQ !== undefined) optShuffleQ.checked = s.shuffleQ;
    if (s.shuffleA !== undefined) optShuffleA.checked = s.shuffleA;
    if (s.sound    !== undefined) optSound.checked    = s.sound;
    if (s.timer    !== undefined) optTimer.checked    = s.timer;
    soundEnabled = optSound.checked;
    timerEnabled = optTimer.checked;
  } catch (e) { /* ignore */ }
}

function saveSettings() {
  const s = {
    shuffleQ: optShuffleQ.checked,
    shuffleA: optShuffleA.checked,
    sound:    optSound.checked,
    timer:    optTimer.checked
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// ============ SIDEBAR STATS ============
function updateSidebarStats() {
  const total     = quizQuestions.length || allQuestions.length;
  const answeredN = userAnswers.length;
  const correctN  = score;
  const wrongN    = answeredN - correctN;

  totalCorrect.textContent   = correctN;
  totalWrong.textContent     = wrongN;
  totalQuestions.textContent = total;

  miniAnswered.textContent = answeredN;
  miniCorrect.textContent  = correctN;
  miniWrong.textContent    = wrongN;

  const best = parseInt(localStorage.getItem(BEST_SCORE_KEY) || "0", 10);
  miniBest.textContent = best > 0 ? String(best) : "—";

  // Progress ring
  const pct = total > 0 ? Math.round((answeredN / total) * 100) : 0;
  sideProgressValue.textContent = pct + "%";
  const circumference = 2 * Math.PI * 42; // r = 42
  sideRingFill.style.strokeDasharray = circumference;
  sideRingFill.style.strokeDashoffset = circumference - (pct / 100) * circumference;

  if (total === 0) {
    sideProgressText.textContent = "Chưa bắt đầu";
  } else if (answeredN === 0) {
    sideProgressText.textContent = `${total} câu đang chờ`;
  } else if (answeredN >= total) {
    sideProgressText.textContent = "Đã hoàn thành!";
  } else {
    sideProgressText.textContent = `Còn ${total - answeredN} câu`;
  }

  // Hero
  if (quizScreen.classList.contains("active")) {
    heroLabel.textContent = `Đang làm — câu ${currentIndex + 1}/${quizQuestions.length}`;
    heroValue.textContent = `${score} / ${answeredN || 0} đúng`;
    if (answeredN > 0) {
      const pctCorrect = Math.round((correctN / answeredN) * 100);
      heroTrend.hidden = false;
      heroTrend.className = "balance-trend " + (pctCorrect >= 50 ? "up" : "down");
      heroTrend.textContent = `${pctCorrect}% chính xác`;
    } else {
      heroTrend.hidden = true;
    }
  } else if (resultScreen.classList.contains("active")) {
    heroLabel.textContent = "Kết quả bài làm";
    heroValue.textContent = `${score} / ${quizQuestions.length} đúng`;
    const pct = quizQuestions.length > 0 ? Math.round((score / quizQuestions.length) * 100) : 0;
    heroTrend.hidden = false;
    heroTrend.className = "balance-trend " + (pct >= 50 ? "up" : "down");
    heroTrend.textContent = `${pct}% chính xác`;
  } else {
    heroLabel.textContent = "Sẵn sàng bắt đầu";
    heroValue.textContent = "QuizMaster";
    heroTrend.hidden = true;
  }
}

// ============ RESUME ============
function checkResume() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "null");
    if (saved && saved.quizQuestions && saved.quizQuestions.length > 0
        && saved.currentIndex < saved.quizQuestions.length) {
      resumeBtn.hidden = false;
    } else {
      resumeBtn.hidden = true;
    }
  } catch (e) { /* ignore */ }
}

function saveProgress() {
  if (!quizQuestions.length) return;
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      quizQuestions, currentIndex, score, userAnswers, timestamp: Date.now()
    }));
  } catch (e) { /* ignore */ }
}

function clearProgress() {
  localStorage.removeItem(PROGRESS_KEY);
  resumeBtn.hidden = true;
}

function resumeProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "null");
    if (!saved) return;
    quizQuestions = saved.quizQuestions;
    currentIndex  = saved.currentIndex;
    score         = saved.score;
    userAnswers   = saved.userAnswers || [];
    allQuestions  = quizQuestions.map(q => ({ ...q }));
    if (!allQuestions.length) return;
    showScreen("quiz-screen");
    renderQuestion();
  } catch (e) {
    console.error(e);
    clearProgress();
  }
}

// ============ EVENTS ============
function bindEvents() {
  themeToggle.addEventListener("click", toggleTheme);

  fileInput.addEventListener("change", (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  ["dragenter", "dragover"].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
    });
  });
  dropZone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  downloadSampleBtn.addEventListener("click", downloadSampleFile);
  useDemoBtn.addEventListener("click", () => startQuiz(DEMO_QUESTIONS));
  resumeBtn.addEventListener("click", resumeProgress);

  [optShuffleQ, optShuffleA, optSound, optTimer].forEach(el => {
    el.addEventListener("change", () => {
      soundEnabled = optSound.checked;
      timerEnabled = optTimer.checked;
      saveSettings();
    });
  });

  nextBtn.addEventListener("click", goNext);
  quitBtn.addEventListener("click", () => {
    if (confirm("Bạn có chắc muốn thoát? Tiến độ sẽ được lưu.")) {
      saveProgress();
      stopTimer();
      showScreen("upload-screen");
      checkResume();
    }
  });

  restartBtn.addEventListener("click", () => {
    if (allQuestions.length) startQuiz(allQuestions);
  });
  newFileBtn.addEventListener("click", () => {
    clearProgress();
    allQuestions = []; quizQuestions = []; currentIndex = 0; score = 0; userAnswers = [];
    fileInput.value = "";
    showScreen("upload-screen");
    updateSidebarStats();
  });

  document.addEventListener("keydown", handleKeydown);
}

function handleKeydown(e) {
  if (!quizScreen.classList.contains("active")) return;
  const key = e.key.toUpperCase();

  if (answered && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    if (!nextBtn.disabled) goNext();
    return;
  }

  if (!answered && ["A","B","C","D","1","2","3","4"].includes(key)) {
    e.preventDefault();
    let idx = /[1-4]/.test(key) ? parseInt(key) - 1 : key.charCodeAt(0) - 65;
    const options = optionsContainer.querySelectorAll(".option");
    if (options[idx]) options[idx].click();
  }
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem(THEME_KEY, "light");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem(THEME_KEY, "dark");
  }
  updateThemeIcons();
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
  updateSidebarStats();
}

// ============ FILE ============
async function handleFile(file) {
  const name = file.name.toLowerCase();
  try {
    let text = "";
    if (name.endsWith(".txt")) {
      text = await file.text();
    } else if (name.endsWith(".docx")) {
      if (typeof mammoth === "undefined") {
        toast("Thư viện đọc .docx chưa tải xong.", "error");
        return;
      }
      text = await readDocx(file);
    } else if (name.endsWith(".doc")) {
      toast("File .doc cũ không được hỗ trợ. Vui lòng lưu lại dạng .docx hoặc .txt.", "error");
      return;
    } else {
      toast("Chỉ hỗ trợ file .txt và .docx", "error");
      return;
    }

    const questions = parseQuestions(text);
    if (questions.length === 0) {
      toast("Không tìm thấy câu hỏi nào. Vui lòng kiểm tra định dạng file.", "error");
      return;
    }
    startQuiz(questions);
  } catch (err) {
    console.error(err);
    toast("Lỗi đọc file: " + err.message, "error");
  }
}

function readDocx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      mammoth.extractRawText({ arrayBuffer: e.target.result })
        .then(r => resolve(r.value))
        .catch(reject);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ============ PARSE ============
function parseQuestions(text) {
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const questions = [];
  let current = null;

  const questionStartRegex = /^(?:câu|question|q)\s*\d+\s*[:.)\-]?\s*/i;
  const numberStartRegex   = /^\d+\s*[.):\-]\s+/;
  const optionRegex        = /^([A-Da-d])\s*[.):\-]\s*(.+)$/;
  const answerLetterRegex  = /^(?:đáp\s*án|answer|đáp\s*án\s*đúng)\s*[:.\-]?\s*([A-Da-d])\b/i;
  const answerTextRegex    = /^(?:đáp\s*án|answer|đáp\s*án\s*đúng)\s*[:.\-]?\s*(.+)/i;
  const explanationRegex   = /^(?:giải\s*thích|explanation|giải\s*thik)\s*[:.\-]?\s*(.+)/i;

  for (const line of lines) {
    if (questionStartRegex.test(line) || numberStartRegex.test(line)) {
      if (current) questions.push(current);
      let qText = line.replace(questionStartRegex, "").replace(numberStartRegex, "").trim();
      current = { question: qText, options: [], answer: -1, explanation: "", answerText: "" };
      continue;
    }
    if (!current) continue;

    const ansLetterMatch = line.match(answerLetterRegex);
    if (ansLetterMatch) {
      current.answer = ansLetterMatch[1].toUpperCase().charCodeAt(0) - 65;
      continue;
    }
    const ansTextMatch = line.match(answerTextRegex);
    if (ansTextMatch) {
      current.answerText = ansTextMatch[1].trim();
      continue;
    }
    const expMatch = line.match(explanationRegex);
    if (expMatch) { current.explanation = expMatch[1].trim(); continue; }

    const optMatch = line.match(optionRegex);
    if (optMatch) { current.options.push(optMatch[2].trim()); continue; }

    if (!current.question) current.question = line;
    else if (current.options.length === 0 && current.answer === -1 && !current.answerText)
      current.question += " " + line;
  }
  if (current) questions.push(current);

  return questions.map(q => {
    if (q.answer === -1 && q.answerText && q.options.length > 0) {
      const idx = q.options.findIndex(o => o.toLowerCase().trim() === q.answerText.toLowerCase().trim());
      if (idx >= 0) q.answer = idx;
    }
    return q;
  }).filter(q =>
    q.question && q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length
  );
}

// ============ START ============
function startQuiz(questions) {
  allQuestions = questions.map(q => ({ ...q }));
  let qs = [...allQuestions];

  const limit = parseInt(optLimit.value, 10);
  if (limit > 0 && limit < qs.length) {
    qs = shuffle(qs).slice(0, limit);
  } else if (optShuffleQ.checked) {
    qs = shuffle(qs);
  }
  if (optShuffleA.checked) qs = qs.map(shuffleOptions);

  quizQuestions = qs;
  currentIndex = 0;
  score = 0;
  userAnswers = [];

  saveSettings();
  showScreen("quiz-screen");
  renderQuestion();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleOptions(q) {
  const idx = q.options.map((_, i) => i);
  const sh  = shuffle(idx);
  return {
    ...q,
    options: sh.map(i => q.options[i]),
    answer:  sh.indexOf(q.answer)
  };
}

// ============ RENDER ============
function renderQuestion() {
  answered = false;
  const q = quizQuestions[currentIndex];

  questionCounter.textContent = `Câu ${currentIndex + 1}/${quizQuestions.length}`;
  scoreInfo.textContent = `${score} điểm`;

  const progress = (currentIndex / quizQuestions.length) * 100;
  progressFill.style.width = `${progress}%`;

  questionText.textContent = q.question;
  feedback.className = "feedback";
  feedback.innerHTML = "";

  optionsContainer.innerHTML = "";
  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.dataset.index = i;
    btn.innerHTML = `<span class="label">${String.fromCharCode(65 + i)}</span><span class="option-text">${escapeHtml(opt)}</span>`;
    btn.addEventListener("click", () => selectAnswer(i));
    optionsContainer.appendChild(btn);
  });

  nextBtn.disabled = true;
  nextBtnText.textContent = currentIndex === quizQuestions.length - 1 ? "Xem kết quả" : "Tiếp theo";

  if (timerEnabled) {
    timerEl.style.display = "";
    startTimer();
  } else {
    timerEl.style.display = "none";
    stopTimer();
  }

  saveProgress();
  updateSidebarStats();
}

// ============ ANSWER ============
function selectAnswer(index) {
  if (answered) return;
  answered = true;
  stopTimer();

  const q = quizQuestions[currentIndex];
  const isCorrect = index === q.answer;

  userAnswers.push({
    question: q.question,
    options: q.options,
    correctIndex: q.answer,
    userIndex: index,
    explanation: q.explanation
  });

  if (isCorrect) { score++; playCorrect(); } else { playWrong(); }

  const optionEls = optionsContainer.querySelectorAll(".option");
  optionEls.forEach((el, i) => {
    el.classList.add("disabled");
    if (i === q.answer) el.classList.add("correct");
    if (i === index && !isCorrect) el.classList.add("wrong");
  });

  feedback.classList.add("show", isCorrect ? "correct" : "wrong");
  if (isCorrect) {
    feedback.innerHTML = `<strong>✓ Chính xác!</strong>${q.explanation ? escapeHtml(q.explanation) : ""}`;
  } else {
    feedback.innerHTML = `
      <strong>✗ Sai rồi</strong>
      Đáp án đúng: <b>${String.fromCharCode(65 + q.answer)}. ${escapeHtml(q.options[q.answer])}</b>
      ${q.explanation ? `<br><em>${escapeHtml(q.explanation)}</em>` : ""}
    `;
  }

  scoreInfo.textContent = `${score} điểm`;
  nextBtn.disabled = false;
  nextBtn.focus();
  saveProgress();
  updateSidebarStats();
}

// ============ NEXT ============
function goNext() {
  if (currentIndex < quizQuestions.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    clearProgress();
    showResults();
  }
}

// ============ TIMER ============
function startTimer() {
  stopTimer();
  timeLeft = TIME_PER_QUESTION;
  updateTimerDisplay();
  timerEl.classList.remove("warning");

  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 5) timerEl.classList.add("warning");
    if (timeLeft <= 0) {
      stopTimer();
      if (!answered) autoSubmitTimeout();
    }
  }, 1000);
}

function updateTimerDisplay() {
  if (timerValueEl) timerValueEl.textContent = timeLeft;
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function autoSubmitTimeout() {
  answered = true;
  const q = quizQuestions[currentIndex];

  userAnswers.push({
    question: q.question, options: q.options,
    correctIndex: q.answer, userIndex: -1,
    explanation: q.explanation, timeout: true
  });

  const optionEls = optionsContainer.querySelectorAll(".option");
  optionEls.forEach((el, i) => {
    el.classList.add("disabled");
    if (i === q.answer) el.classList.add("correct");
  });

  feedback.classList.add("show", "wrong");
  feedback.innerHTML = `
    <strong>⏰ Hết giờ</strong>
    Đáp án đúng: <b>${String.fromCharCode(65 + q.answer)}. ${escapeHtml(q.options[q.answer])}</b>
    ${q.explanation ? `<br><em>${escapeHtml(q.explanation)}</em>` : ""}
  `;

  nextBtn.disabled = false;
  saveProgress();
  updateSidebarStats();
}

// ============ RESULTS ============
function showResults() {
  stopTimer();
  showScreen("result-screen");

  const total   = quizQuestions.length;
  const correct = score;
  const wrong   = total - correct;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  totalQEl.textContent   = total;
  correctQEl.textContent = correct;
  wrongQEl.textContent   = wrong;
  percentEl.textContent  = percent + "%";
  if (reviewCountEl) reviewCountEl.textContent = `${total} câu`;

  if (percent >= 80) {
    trophyEl.textContent = "🏆";
    resultTitle.textContent = "Xuất sắc!";
    resultSubtitle.textContent = "Bạn đã làm rất tốt!";
  } else if (percent >= 50) {
    trophyEl.textContent = "👍";
    resultTitle.textContent = "Khá tốt!";
    resultSubtitle.textContent = "Cố gắng thêm một chút nữa nhé!";
  } else {
    trophyEl.textContent = "💪";
    resultTitle.textContent = "Cần cố gắng!";
    resultSubtitle.textContent = "Ôn lại và thử lại bạn nhé!";
  }

  const ringFill = document.getElementById("ring-fill");
  if (ringFill) {
    const circumference = 2 * Math.PI * 52;
    let strokeColor = "var(--gold)";
    if (percent >= 80) strokeColor = "var(--income)";
    else if (percent < 50) strokeColor = "var(--expense)";
    ringFill.style.stroke = strokeColor;
    ringFill.style.strokeDasharray = circumference;
    ringFill.style.strokeDashoffset = circumference;
    setTimeout(() => {
      ringFill.style.strokeDashoffset = circumference - (percent / 100) * circumference;
    }, 200);
  }

  const bestScore = parseInt(localStorage.getItem(BEST_SCORE_KEY) || "0", 10);
  if (correct > bestScore) {
    localStorage.setItem(BEST_SCORE_KEY, correct.toString());
    bestScoreEl.hidden = false;
    bestScoreEl.textContent = `★ Kỷ lục mới — ${correct}/${total}`;
  } else if (bestScore > 0) {
    bestScoreEl.hidden = false;
    bestScoreEl.textContent = `★ Điểm cao nhất: ${bestScore}`;
  } else {
    bestScoreEl.hidden = true;
  }

  reviewList.innerHTML = "";
  userAnswers.forEach((ua, idx) => {
    const isCorrect = ua.userIndex === ua.correctIndex;
    const userLetter = ua.userIndex >= 0 ? String.fromCharCode(65 + ua.userIndex) : "—";
    const correctLetter = String.fromCharCode(65 + ua.correctIndex);

    const div = document.createElement("div");
    div.className = `review-item ${isCorrect ? "correct" : "wrong"}`;
    div.innerHTML = `
      <h4>${idx + 1}. ${escapeHtml(ua.question)}</h4>
      <p>Bạn chọn: <span class="${isCorrect ? 'correct-answer' : 'your-answer'}">
        ${userLetter}${ua.userIndex >= 0 ? ". " + escapeHtml(ua.options[ua.userIndex]) : " (không trả lời)"}
        ${isCorrect ? " ✓" : " ✗"}
      </span></p>
      ${!isCorrect ? `<p>Đáp án đúng: <span class="correct-answer">${correctLetter}. ${escapeHtml(ua.options[ua.correctIndex])}</span></p>` : ""}
      ${ua.explanation ? `<p class="explanation">${escapeHtml(ua.explanation)}</p>` : ""}
    `;
    reviewList.appendChild(div);
  });

  if (percent >= 80 && typeof confetti === "function") {
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ["#B08C2A", "#2F7A56", "#1A2624", "#B84830"]
      });
    }, 400);
  }

  updateSidebarStats();
}

// ============ UTILS ============
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toast(msg, type = "") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "toast " + type;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => { el.hidden = true; }, 300);
  }, 2600);
}

function downloadSampleFile() {
  const sample = `Câu 1: Thủ đô của Việt Nam là gì?
A. Hà Nội
B. TP. Hồ Chí Minh
C. Đà Nẵng
D. Huế
Đáp án: A
Giải thích: Hà Nội là thủ đô của Việt Nam từ năm 1010.

Câu 2: 2 + 2 = ?
A. 3
B. 4
C. 5
D. 6
Đáp án: B
Giải thích: Phép cộng cơ bản.

Câu 3: Ngôn ngữ lập trình nào chạy trên trình duyệt?
A. Python
B. Java
C. JavaScript
D. C++
Đáp án: C
Giải thích: JavaScript chạy trực tiếp trên trình duyệt.
`;
  const blob = new Blob([sample], { type: "text/plain;charset=utf-8" });
  saveAs(blob, "cau-hoi-mau.txt");
}

// ============ RUN ============
init();