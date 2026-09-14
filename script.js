/* ============================================================
   QUIZMASTER v3.1 — FIXED
   - Theme toggle dùng data-theme trên <html>
   - Fix event binding, thêm try/catch + console.log debug
   - Fix file mẫu, demo, upload
============================================================ */

(function () {
  "use strict";

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
  const BEST_SCORE_KEY = "quiz_best_score";
  const THEME_KEY = "quiz_theme";
  const PROGRESS_KEY = "quiz_progress";
  const SETTINGS_KEY = "quiz_settings";

  // ============ AUDIO ============
  let audioCtx = null;
  function playTone(freq, duration, type) {
    if (!soundEnabled) return;
    duration = duration || 0.12;
    type = type || "sine";
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) { /* ignore */ }
  }
  const playCorrect = function () { playTone(660, 0.1); setTimeout(function () { playTone(880, 0.15); }, 100); };
  const playWrong = function () { playTone(220, 0.25, "sawtooth"); };

  // ============ DOM HELPERS ============
  const $ = function (id) { return document.getElementById(id); };

  // ============ DOM REFS ============
  const uploadScreen = $("upload-screen");
  const quizScreen = $("quiz-screen");
  const resultScreen = $("result-screen");
  const dropZone = $("drop-zone");
  const fileInput = $("file-input");
  const downloadSampleBtn = $("download-sample");
  const useDemoBtn = $("use-demo");
  const resumeBtn = $("resume-btn");
  const themeToggle = $("theme-toggle");

  const optShuffleQ = $("opt-shuffle-q");
  const optShuffleA = $("opt-shuffle-a");
  const optSound = $("opt-sound");
  const optTimer = $("opt-timer");
  const optLimit = $("opt-limit");

  const questionCounter = $("question-counter");
  const scoreInfo = $("score-info");
  const timerEl = $("timer");
  const timerValueEl = $("timer-value");
  const progressFill = $("progress-fill");
  const questionText = $("question-text");
  const optionsContainer = $("options-container");
  const feedback = $("feedback");
  const nextBtn = $("next-btn");
  const nextBtnText = nextBtn ? nextBtn.querySelector(".btn-text") : null;
  const quitBtn = $("quit-btn");

  const totalQEl = $("total-q");
  const correctQEl = $("correct-q");
  const wrongQEl = $("wrong-q");
  const percentEl = $("percent");
  const bestScoreEl = $("best-score");
  const reviewList = $("review-list");
  const reviewCountEl = $("review-count");
  const restartBtn = $("restart-btn");
  const newFileBtn = $("new-file-btn");
  const trophyEl = $("trophy");
  const resultTitle = $("result-title");
  const resultSubtitle = $("result-subtitle");

  const heroLabel = $("heroLabel");
  const heroValue = $("heroValue");
  const heroTrend = $("heroTrend");
  const totalCorrectEl = $("totalCorrect");
  const totalWrongEl = $("totalWrong");
  const totalQuestionsEl = $("totalQuestions");
  const sideRingFill = $("side-ring-fill");
  const sideProgressValue = $("side-progress-value");
  const sideProgressText = $("side-progress-text");
  const miniAnswered = $("mini-answered");
  const miniCorrect = $("mini-correct");
  const miniWrong = $("mini-wrong");
  const miniBest = $("mini-best");
  const headerSub = $("headerSub");

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

  // ============ THEME ============
  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  function toggleTheme() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const newTheme = isDark ? "light" : "dark";
    applyTheme(newTheme);
    try { localStorage.setItem(THEME_KEY, newTheme); } catch (e) {}
  }

  // ============ INIT ============
  function init() {
    console.log("[QuizMaster] init started");

    // Theme
    let savedTheme = "light";
    try {
      savedTheme = localStorage.getItem(THEME_KEY) || "";
    } catch (e) {}
    if (!savedTheme) {
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      savedTheme = prefersDark ? "dark" : "light";
    }
    applyTheme(savedTheme);

    // Header date
    if (headerSub) {
      const d = new Date();
      const opts = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
      headerSub.textContent = d.toLocaleDateString("vi-VN", opts);
    }

    loadSettings();
    checkResume();
    updateSidebarStats();
    bindEvents();

    console.log("[QuizMaster] init done");
  }

  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      if (s.shuffleQ !== undefined) optShuffleQ.checked = s.shuffleQ;
      if (s.shuffleA !== undefined) optShuffleA.checked = s.shuffleA;
      if (s.sound !== undefined) optSound.checked = s.sound;
      if (s.timer !== undefined) optTimer.checked = s.timer;
      soundEnabled = optSound.checked;
      timerEnabled = optTimer.checked;
    } catch (e) { /* ignore */ }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        shuffleQ: optShuffleQ.checked,
        shuffleA: optShuffleA.checked,
        sound: optSound.checked,
        timer: optTimer.checked
      }));
    } catch (e) {}
  }

  // ============ SIDEBAR ============
  function updateSidebarStats() {
    const total = quizQuestions.length || allQuestions.length;
    const answeredN = userAnswers.length;
    const correctN = score;
    const wrongN = answeredN - correctN;

    if (totalCorrectEl) totalCorrectEl.textContent = correctN;
    if (totalWrongEl) totalWrongEl.textContent = wrongN;
    if (totalQuestionsEl) totalQuestionsEl.textContent = total;
    if (miniAnswered) miniAnswered.textContent = answeredN;
    if (miniCorrect) miniCorrect.textContent = correctN;
    if (miniWrong) miniWrong.textContent = wrongN;

    let best = 0;
    try { best = parseInt(localStorage.getItem(BEST_SCORE_KEY) || "0", 10); } catch (e) {}
    if (miniBest) miniBest.textContent = best > 0 ? String(best) : "—";

    const pct = total > 0 ? Math.round((answeredN / total) * 100) : 0;
    if (sideProgressValue) sideProgressValue.textContent = pct + "%";
    if (sideRingFill) {
      const circumference = 2 * Math.PI * 42;
      sideRingFill.style.strokeDasharray = circumference;
      sideRingFill.style.strokeDashoffset = circumference - (pct / 100) * circumference;
    }
    if (sideProgressText) {
      if (total === 0) sideProgressText.textContent = "Chưa bắt đầu";
      else if (answeredN === 0) sideProgressText.textContent = total + " câu đang chờ";
      else if (answeredN >= total) sideProgressText.textContent = "Đã hoàn thành!";
      else sideProgressText.textContent = "Còn " + (total - answeredN) + " câu";
    }

    // Hero
    if (heroLabel && heroValue && heroTrend) {
      if (quizScreen.classList.contains("active")) {
        heroLabel.textContent = "Đang làm — câu " + (currentIndex + 1) + "/" + quizQuestions.length;
        heroValue.textContent = score + " / " + (answeredN || 0) + " đúng";
        if (answeredN > 0) {
          const pctCorrect = Math.round((correctN / answeredN) * 100);
          heroTrend.hidden = false;
          heroTrend.className = "balance-trend " + (pctCorrect >= 50 ? "up" : "down");
          heroTrend.textContent = pctCorrect + "% chính xác";
        } else {
          heroTrend.hidden = true;
        }
      } else if (resultScreen.classList.contains("active")) {
        heroLabel.textContent = "Kết quả bài làm";
        heroValue.textContent = score + " / " + quizQuestions.length + " đúng";
        const p = quizQuestions.length > 0 ? Math.round((score / quizQuestions.length) * 100) : 0;
        heroTrend.hidden = false;
        heroTrend.className = "balance-trend " + (p >= 50 ? "up" : "down");
        heroTrend.textContent = p + "% chính xác";
      } else {
        heroLabel.textContent = "Sẵn sàng bắt đầu";
        heroValue.textContent = "QuizMaster";
        heroTrend.hidden = true;
      }
    }
  }

  // ============ PROGRESS ============
  function checkResume() {
    try {
      const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "null");
      if (saved && saved.quizQuestions && saved.quizQuestions.length > 0
        && saved.currentIndex < saved.quizQuestions.length) {
        resumeBtn.hidden = false;
      } else {
        resumeBtn.hidden = true;
      }
    } catch (e) { resumeBtn.hidden = true; }
  }

  function saveProgress() {
    if (!quizQuestions.length) return;
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({
        quizQuestions: quizQuestions,
        currentIndex: currentIndex,
        score: score,
        userAnswers: userAnswers,
        timestamp: Date.now()
      }));
    } catch (e) {}
  }

  function clearProgress() {
    try { localStorage.removeItem(PROGRESS_KEY); } catch (e) {}
    resumeBtn.hidden = true;
  }

  function resumeProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "null");
      if (!saved) return;
      quizQuestions = saved.quizQuestions;
      currentIndex = saved.currentIndex;
      score = saved.score;
      userAnswers = saved.userAnswers || [];
      allQuestions = quizQuestions.map(function (q) { return Object.assign({}, q); });
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
    console.log("[QuizMaster] binding events");

    if (themeToggle) themeToggle.addEventListener("click", toggleTheme);
    if (!themeToggle) console.warn("themeToggle not found");

    // File input
    if (fileInput) {
      fileInput.addEventListener("change", function (e) {
        if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
      });
    } else console.warn("fileInput not found");

    // Drag & drop
    if (dropZone) {
      ["dragenter", "dragover"].forEach(function (evt) {
        dropZone.addEventListener(evt, function (e) {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.add("dragover");
        });
      });
      ["dragleave", "drop"].forEach(function (evt) {
        dropZone.addEventListener(evt, function (e) {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.remove("dragover");
        });
      });
      dropZone.addEventListener("drop", function (e) {
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) handleFile(file);
      });
      // Click vào drop zone cũng mở file picker
      dropZone.addEventListener("click", function (e) {
        // Không trigger nếu click vào label/button đã có sẵn
        if (e.target.closest("label") || e.target.closest("button") || e.target.closest("input")) return;
        if (fileInput) fileInput.click();
      });
    } else console.warn("dropZone not found");

    // Buttons
    if (downloadSampleBtn) downloadSampleBtn.addEventListener("click", downloadSampleFile);
    if (useDemoBtn) useDemoBtn.addEventListener("click", function () {
      console.log("[QuizMaster] Demo clicked");
      startQuiz(DEMO_QUESTIONS);
    });
    if (resumeBtn) resumeBtn.addEventListener("click", resumeProgress);

    [optShuffleQ, optShuffleA, optSound, optTimer].forEach(function (el) {
      if (el) el.addEventListener("change", function () {
        soundEnabled = optSound.checked;
        timerEnabled = optTimer.checked;
        saveSettings();
      });
    });

    if (nextBtn) nextBtn.addEventListener("click", goNext);
    if (quitBtn) quitBtn.addEventListener("click", function () {
      if (confirm("Bạn có chắc muốn thoát? Tiến độ sẽ được lưu.")) {
        saveProgress();
        stopTimer();
        showScreen("upload-screen");
        checkResume();
      }
    });

    if (restartBtn) restartBtn.addEventListener("click", function () {
      if (allQuestions.length) startQuiz(allQuestions);
    });
    if (newFileBtn) newFileBtn.addEventListener("click", function () {
      clearProgress();
      allQuestions = [];
      quizQuestions = [];
      currentIndex = 0;
      score = 0;
      userAnswers = [];
      if (fileInput) fileInput.value = "";
      showScreen("upload-screen");
      updateSidebarStats();
    });

    document.addEventListener("keydown", handleKeydown);

    console.log("[QuizMaster] events bound");
  }

  function handleKeydown(e) {
    if (!quizScreen.classList.contains("active")) return;
    const key = e.key ? e.key.toUpperCase() : "";

    if (answered && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      if (!nextBtn.disabled) goNext();
      return;
    }

    if (!answered && ["A", "B", "C", "D", "1", "2", "3", "4"].indexOf(key) !== -1) {
      e.preventDefault();
      const idx = /[1-4]/.test(key) ? parseInt(key, 10) - 1 : key.charCodeAt(0) - 65;
      const options = optionsContainer.querySelectorAll(".option");
      if (options[idx]) options[idx].click();
    }
  }

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
    const el = document.getElementById(id);
    if (el) el.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
    updateSidebarStats();
  }

  // ============ FILE ============
  function handleFile(file) {
    console.log("[QuizMaster] handleFile:", file.name, file.size);
    const name = file.name.toLowerCase();

    if (name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = function (e) {
        parseAndStart(e.target.result);
      };
      reader.onerror = function () {
        toast("Lỗi đọc file!", "error");
      };
      reader.readAsText(file, "UTF-8");
      return;
    }

    if (name.endsWith(".docx")) {
      if (typeof mammoth === "undefined") {
        toast("Thư viện đọc .docx chưa tải xong.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = function (e) {
        mammoth.extractRawText({ arrayBuffer: e.target.result })
          .then(function (result) { parseAndStart(result.value); })
          .catch(function (err) { toast("Lỗi đọc .docx: " + err.message, "error"); });
      };
      reader.onerror = function () { toast("Lỗi đọc file!", "error"); };
      reader.readAsArrayBuffer(file);
      return;
    }

    if (name.endsWith(".doc")) {
      toast("File .doc cũ không được hỗ trợ. Lưu lại dạng .docx hoặc .txt.", "error");
      return;
    }

    toast("Chỉ hỗ trợ file .txt và .docx", "error");
  }

  function parseAndStart(text) {
    const questions = parseQuestions(text);
    console.log("[QuizMaster] parsed", questions.length, "questions");
    if (questions.length === 0) {
      toast("Không tìm thấy câu hỏi nào. Vui lòng kiểm tra định dạng file.", "error");
      return;
    }
    startQuiz(questions);
  }

  // ============ PARSE ============
  function parseQuestions(text) {
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = text.split("\n").map(function (l) { return l.trim(); }).filter(function (l) { return l.length > 0; });
    const questions = [];
    let current = null;

    const questionStartRegex = /^(?:câu|question|q)\s*\d+\s*[:.)\-]?\s*/i;
    const numberStartRegex = /^\d+\s*[.):\-]\s+/;
    const optionRegex = /^([A-Da-d])\s*[.):\-]\s*(.+)$/;
    const answerLetterRegex = /^(?:đáp\s*án|answer|đáp\s*án\s*đúng)\s*[:.\-]?\s*([A-Da-d])\b/i;
    const answerTextRegex = /^(?:đáp\s*án|answer|đáp\s*án\s*đúng)\s*[:.\-]?\s*(.+)/i;
    const explanationRegex = /^(?:giải\s*thích|explanation|giải\s*thik)\s*[:.\-]?\s*(.+)/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (questionStartRegex.test(line) || numberStartRegex.test(line)) {
        if (current) questions.push(current);
        const qText = line.replace(questionStartRegex, "").replace(numberStartRegex, "").trim();
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
      if (ansTextMatch) { current.answerText = ansTextMatch[1].trim(); continue; }

      const expMatch = line.match(explanationRegex);
      if (expMatch) { current.explanation = expMatch[1].trim(); continue; }

      const optMatch = line.match(optionRegex);
      if (optMatch) { current.options.push(optMatch[2].trim()); continue; }

      if (!current.question) current.question = line;
      else if (current.options.length === 0 && current.answer === -1 && !current.answerText)
        current.question += " " + line;
    }
    if (current) questions.push(current);

    return questions.map(function (q) {
      if (q.answer === -1 && q.answerText && q.options.length > 0) {
        const idx = q.options.findIndex(function (o) {
          return o.toLowerCase().trim() === q.answerText.toLowerCase().trim();
        });
        if (idx >= 0) q.answer = idx;
      }
      return q;
    }).filter(function (q) {
      return q.question && q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length;
    });
  }

  // ============ START ============
  function startQuiz(questions) {
    console.log("[QuizMaster] startQuiz with", questions.length, "questions");
    allQuestions = questions.map(function (q) { return Object.assign({}, q); });
    let qs = allQuestions.slice();

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
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function shuffleOptions(q) {
    const idx = q.options.map(function (_, i) { return i; });
    const sh = shuffle(idx);
    return Object.assign({}, q, {
      options: sh.map(function (i) { return q.options[i]; }),
      answer: sh.indexOf(q.answer)
    });
  }

  // ============ RENDER ============
  function renderQuestion() {
    answered = false;
    const q = quizQuestions[currentIndex];
    if (!q) return;

    questionCounter.textContent = "Câu " + (currentIndex + 1) + "/" + quizQuestions.length;
    scoreInfo.textContent = score + " điểm";

    const progress = (currentIndex / quizQuestions.length) * 100;
    progressFill.style.width = progress + "%";

    questionText.textContent = q.question;
    feedback.className = "feedback";
    feedback.innerHTML = "";

    optionsContainer.innerHTML = "";
    q.options.forEach(function (opt, i) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      btn.dataset.index = i;
      btn.innerHTML = '<span class="label">' + String.fromCharCode(65 + i) + '</span><span class="option-text">' + escapeHtml(opt) + '</span>';
      btn.addEventListener("click", function () { selectAnswer(i); });
      optionsContainer.appendChild(btn);
    });

    nextBtn.disabled = true;
    if (nextBtnText) {
      nextBtnText.textContent = currentIndex === quizQuestions.length - 1 ? "Xem kết quả" : "Tiếp theo";
    }

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
    optionEls.forEach(function (el, i) {
      el.classList.add("disabled");
      if (i === q.answer) el.classList.add("correct");
      if (i === index && !isCorrect) el.classList.add("wrong");
    });

    feedback.classList.add("show", isCorrect ? "correct" : "wrong");
    if (isCorrect) {
      feedback.innerHTML = "<strong>✓ Chính xác!</strong>" + (q.explanation ? escapeHtml(q.explanation) : "");
    } else {
      feedback.innerHTML = "<strong>✗ Sai rồi</strong>Đáp án đúng: <b>"
        + String.fromCharCode(65 + q.answer) + ". " + escapeHtml(q.options[q.answer]) + "</b>"
        + (q.explanation ? "<br><em>" + escapeHtml(q.explanation) + "</em>" : "");
    }

    scoreInfo.textContent = score + " điểm";
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

    timerInterval = setInterval(function () {
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
      question: q.question,
      options: q.options,
      correctIndex: q.answer,
      userIndex: -1,
      explanation: q.explanation,
      timeout: true
    });

    const optionEls = optionsContainer.querySelectorAll(".option");
    optionEls.forEach(function (el, i) {
      el.classList.add("disabled");
      if (i === q.answer) el.classList.add("correct");
    });

    feedback.classList.add("show", "wrong");
    feedback.innerHTML = "<strong>⏰ Hết giờ</strong>Đáp án đúng: <b>"
      + String.fromCharCode(65 + q.answer) + ". " + escapeHtml(q.options[q.answer]) + "</b>"
      + (q.explanation ? "<br><em>" + escapeHtml(q.explanation) + "</em>" : "");

    nextBtn.disabled = false;
    saveProgress();
    updateSidebarStats();
  }

  // ============ RESULTS ============
  function showResults() {
    stopTimer();
    showScreen("result-screen");

    const total = quizQuestions.length;
    const correct = score;
    const wrong = total - correct;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

    totalQEl.textContent = total;
    correctQEl.textContent = correct;
    wrongQEl.textContent = wrong;
    percentEl.textContent = percent + "%";
    if (reviewCountEl) reviewCountEl.textContent = total + " câu";

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
      setTimeout(function () {
        ringFill.style.strokeDashoffset = circumference - (percent / 100) * circumference;
      }, 200);
    }

    let bestScore = 0;
    try { bestScore = parseInt(localStorage.getItem(BEST_SCORE_KEY) || "0", 10); } catch (e) {}
    if (correct > bestScore) {
      try { localStorage.setItem(BEST_SCORE_KEY, String(correct)); } catch (e) {}
      bestScoreEl.hidden = false;
      bestScoreEl.textContent = "★ Kỷ lục mới — " + correct + "/" + total;
    } else if (bestScore > 0) {
      bestScoreEl.hidden = false;
      bestScoreEl.textContent = "★ Điểm cao nhất: " + bestScore;
    } else {
      bestScoreEl.hidden = true;
    }

    reviewList.innerHTML = "";
    userAnswers.forEach(function (ua, idx) {
      const isCorrect = ua.userIndex === ua.correctIndex;
      const userLetter = ua.userIndex >= 0 ? String.fromCharCode(65 + ua.userIndex) : "—";
      const correctLetter = String.fromCharCode(65 + ua.correctIndex);

      const div = document.createElement("div");
      div.className = "review-item " + (isCorrect ? "correct" : "wrong");
      div.innerHTML =
        "<h4>" + (idx + 1) + ". " + escapeHtml(ua.question) + "</h4>"
        + "<p>Bạn chọn: <span class=\"" + (isCorrect ? "correct-answer" : "your-answer") + "\">"
        + userLetter + (ua.userIndex >= 0 ? ". " + escapeHtml(ua.options[ua.userIndex]) : " (không trả lời)")
        + (isCorrect ? " ✓" : " ✗") + "</span></p>"
        + (!isCorrect ? "<p>Đáp án đúng: <span class=\"correct-answer\">" + correctLetter + ". " + escapeHtml(ua.options[ua.correctIndex]) + "</span></p>" : "")
        + (ua.explanation ? "<p class=\"explanation\">" + escapeHtml(ua.explanation) + "</p>" : "");
      reviewList.appendChild(div);
    });

    if (percent >= 80 && typeof confetti === "function") {
      setTimeout(function () {
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

  function toast(msg, type) {
    const el = document.getElementById("toast");
    if (!el) { alert(msg); return; }
    el.textContent = msg;
    el.className = "toast " + (type || "");
    el.hidden = false;
    requestAnimationFrame(function () { el.classList.add("show"); });
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      el.classList.remove("show");
      setTimeout(function () { el.hidden = true; }, 300);
    }, 2600);
  }

  function downloadSampleFile() {
    const sample = [
      "Câu 1: Thủ đô của Việt Nam là gì?",
      "A. Hà Nội",
      "B. TP. Hồ Chí Minh",
      "C. Đà Nẵng",
      "D. Huế",
      "Đáp án: A",
      "Giải thích: Hà Nội là thủ đô của Việt Nam từ năm 1010.",
      "",
      "Câu 2: 2 + 2 = ?",
      "A. 3",
      "B. 4",
      "C. 5",
      "D. 6",
      "Đáp án: B",
      "Giải thích: Phép cộng cơ bản.",
      "",
      "Câu 3: Ngôn ngữ lập trình nào chạy trên trình duyệt?",
      "A. Python",
      "B. Java",
      "C. JavaScript",
      "D. C++",
      "Đáp án: C",
      "Giải thích: JavaScript chạy trực tiếp trên trình duyệt.",
      ""
    ].join("\n");

    if (typeof saveAs === "function") {
      const blob = new Blob([sample], { type: "text/plain;charset=utf-8" });
      saveAs(blob, "cau-hoi-mau.txt");
      toast("Đã tải file mẫu!", "success");
    } else {
      // Fallback nếu FileSaver chưa load
      const blob = new Blob([sample], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cau-hoi-mau.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("Đã tải file mẫu!", "success");
    }
  }

  // ============ BOOT ============
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();