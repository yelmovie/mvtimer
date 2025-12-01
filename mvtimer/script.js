// ====== CONFIG: 한 곳에서 관리 (One Source of Truth) ======
const CONFIG = {
  defaultMinutes: 3,
  characters: ["🐰", "🐻", "🐱", "🐼", "🐹", "🦊", "🐥", "🐨"],
  warningThreshold: 10,
  popSoundPath: "sounds/pop.mp3",
  restMinutes: 3,
  stickerThresholds: [3, 6, 10],
  storageKeys: {
    goal: "classdash_goal_v1",
    todos: "classdash_todos_v1",
    dday: "classdash_dday_v1",
    success: "classdash_success_v1",
    messages: "classdash_messages_v1",   // ✅ 쪽지 저장
    user: "classdash_current_user_v1"    // ✅ 로그인 상태 저장
  },
  progressRingRadius: 90,

  // ✅ 교사/학생 계정 정보 (One Source of Truth)
  users: {
    teacher: {
      id: "teacher",
      name: "담임 선생님",
      code: "5050" // 꼭 바꿔 쓰기
    },
    students: Array.from({ length: 30 }, (_, i) => ({
      id: `s${String(i + 1).padStart(2, "0")}`,
      name: `${i + 1}번 학생`
    }))
  }
};

// ====== 로그인 상태 ======
let currentUser = {
  role: "guest",   // "teacher" | "student" | "guest"
  id: null,
  name: null
};

// ====== 타이머 상태값 ======
let totalSeconds = CONFIG.defaultMinutes * 60;
let remainingSeconds = totalSeconds;
let timerId = null;
let isRunning = false;
let isRestMode = false;

// 미션 성공 횟수 (타이머 끝나기 전에 todo 전부 완료 시 +1)
let missionSuccessCount = 0;
let missionSuccessCountedThisRound = false;

// ====== DOM 요소: 타이머 ======
const minutesInput = document.getElementById("minutes");
const secondsInput = document.getElementById("seconds");

const balloon = document.getElementById("balloon");
const balloonTime = document.getElementById("balloonTime");

// 진행률 링
const progressRing = document.querySelector(".progress-ring__circle");
const RING_RADIUS = 90;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const statusText = document.getElementById("status");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");

// ====== DOM 요소: 목표 / 투두 / 성공 ======
const goalBox = document.getElementById("goalBox");
const todoListEl = document.getElementById("todoList");
const stickerBar = document.getElementById("stickerBar");

// ====== 유틸 함수 ======

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return `${mm}:${ss}`;
}

function setFromInputs() {
  let m = parseInt(minutesInput.value, 10);
  let s = parseInt(secondsInput.value, 10);

  if (isNaN(m) || m < 0) m = 0;
  if (isNaN(s) || s < 0) s = 0;
  if (s > 59) s = 59;

  totalSeconds = m * 60 + s;
  if (totalSeconds < 0) totalSeconds = 0;

  remainingSeconds = totalSeconds;
  // 입력을 직접 바꾸면 집중 모드로 전환
  disableRestMode();
  missionSuccessCountedThisRound = false;
  updateDisplay();
  updateProgressRing();
}

function resetBalloonVisual() {
  balloon.classList.remove("shake", "pop");
  if (!isRunning) {
    balloon.classList.add("idle");
  }
}

function updateProgressRing() {
  if (!progressRing) return;

  if (totalSeconds <= 0) {
    // 안전장치: 타이머 설정이 0이면 그냥 꽉 찬 상태로
    progressRing.style.strokeDashoffset = "0";
    return;
  }

  // ✅ 얼마나 지났는지(경과 비율) 기준으로
  const elapsed = totalSeconds - remainingSeconds;
  const ratio = Math.max(0, Math.min(1, elapsed / totalSeconds)); // 0 ~ 1

  // ratio = 0  → 링 완전 비어 있음 (offset = 전체 길이)
  // ratio = 1  → 링 가득 찬 상태 (offset = 0)
  const offset = RING_CIRCUMFERENCE * (1 - ratio);
  progressRing.style.strokeDashoffset = String(offset);
}

function updateDisplay() {
  balloonTime.textContent = formatTime(remainingSeconds);
  updateProgressRing();

  if (remainingSeconds <= CONFIG.warningThreshold && remainingSeconds > 0) {
    statusText.textContent = isRestMode
      ? "쉬는 시간도 곧 끝나요 ⏰"
      : "거의 끝났어요! 정리할 시간입니다. ⏰";
    statusText.classList.add("warning");
    balloon.classList.remove("idle");
    balloon.classList.add("shake");
  } else if (remainingSeconds === 0) {
    statusText.textContent = isRestMode
      ? "휴식 종료! 다시 힘내볼까? ☕"
      : "시간 종료! 모두 손 멈춤 🙌";
    statusText.classList.remove("warning");
    balloon.classList.remove("idle", "shake");
    balloon.classList.add("pop");
  } else {
    balloon.classList.remove("shake", "pop");
    statusText.classList.remove("warning");

    if (!isRunning) {
      statusText.textContent = isRestMode
        ? "휴식 타이머 준비 완료 😊"
        : "준비 완료 😊";
      balloon.classList.add("idle");
    } else {
      statusText.textContent = isRestMode
        ? "쉬는 중이에요… 잠깐 숨 돌려요 🌿"
        : "진행 중입니다…";
      balloon.classList.remove("idle");
    }
  }
}

// ==== 휴식 모드 on/off ====

function enableRestMode() {
  isRestMode = true;
  document.body.classList.add("rest-mode");
}

function disableRestMode() {
  if (!isRestMode) return;
  isRestMode = false;
  document.body.classList.remove("rest-mode");
}

// ====== 타이머 컨트롤 ======

function startTimer() {
  if (isRunning) return;

  // 0초인 상태에서 시작 눌렀으면 입력값 다시 반영
  if (remainingSeconds <= 0) {
    setFromInputs();
    if (remainingSeconds <= 0) {
      return;
    }
  }

  // 새로 시작할 때 풍선 리셋
  balloon.classList.remove("pop");
  balloon.classList.add("idle");

  isRunning = true;
  missionSuccessCountedThisRound = false;
  statusText.textContent = isRestMode
    ? "쉬는 중이에요… 잠깐 숨 돌려요 🌿"
    : "진행 중입니다…";

  timerId = setInterval(() => {
    remainingSeconds -= 1;

    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      clearInterval(timerId);
      isRunning = false;
      updateDisplay();
      playPopSound();
      return;
    }

    updateDisplay();
  }, 1000);
}

function pauseTimer() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(timerId);
  statusText.textContent = "일시정지 중입니다 ⏸️";
  resetBalloonVisual();
}

function resetTimer() {
  clearInterval(timerId);
  isRunning = false;
  setFromInputs();
  resetBalloonVisual();
  statusText.textContent = isRestMode
    ? "휴식 타이머 준비 완료 😊"
    : "준비 완료 😊";
  missionSuccessCountedThisRound = false;
  updateProgressRing();
}

// ====== 소리 ======

function playPopSound() {
  try {
    const audio = new Audio(CONFIG.popSoundPath);
    audio.play().catch(() => {
      // 자동 재생이 막혀도 조용히 무시
    });
  } catch (e) {
    // Audio 지원 안 되는 경우 무시
  }
}

// ====== TODO 도우미 & 저장 ======

function getTodoStats() {
  if (!todoListEl) {
    return { total: 0, done: 0 };
  }
  const items = Array.from(todoListEl.querySelectorAll(".todo-item"));
  let done = 0;
  items.forEach((li) => {
    const checkbox = li.querySelector(".todo-checkbox");
    if (checkbox && checkbox.checked) done += 1;
  });
  return { total: items.length, done };
}

function applyTodoItemDoneClass(li, checked) {
  if (checked) {
    li.classList.add("done");
  } else {
    li.classList.remove("done");
  }
}

function updateStickerBar() {
  // 스티커 바 기능 삭제됨 (HTML에서 제거됨)
  // 하지만 함수는 호출될 수 있으므로 에러 방지용으로 남겨두거나 비워둠
  // 현재 stickerBar 변수는 위에서 정의됨 (null일 수 있음)
  if (!stickerBar) return;
  // ... 기존 로직 ...
  // (스티커 바 HTML이 없으면 이 함수는 사실상 필요 없음, 하지만 안전하게 둠)
}

function saveTodosToStorage() {
  if (!todoListEl) return;

  const items = Array.from(todoListEl.querySelectorAll(".todo-item"));
  const data = items.map((li) => {
    const checkbox = li.querySelector(".todo-checkbox");
    const input = li.querySelector(".todo-input");
    if (!checkbox || !input) {
      return { text: "", done: false };
    }
    return {
      text: input.value || "",
      done: checkbox.checked || false,
    };
  });

  try {
    localStorage.setItem(CONFIG.storageKeys.todos, JSON.stringify(data));
  } catch (e) {
    // 저장 실패는 조용히 무시
  }
}

function loadTodosFromStorage() {
  if (!todoListEl) return;

  let raw = null;
  try {
    raw = localStorage.getItem(CONFIG.storageKeys.todos);
  } catch (e) {
    return;
  }
  if (!raw) {
    return;
  }

  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      return;
    }

    const items = Array.from(todoListEl.querySelectorAll(".todo-item"));
    items.forEach((li, index) => {
      const record = data[index];
      const checkbox = li.querySelector(".todo-checkbox");
      const input = li.querySelector(".todo-input");
      if (!checkbox || !input) return;

      if (!record) {
        input.value = "";
        checkbox.checked = false;
        applyTodoItemDoneClass(li, false);
        return;
      }

      input.value = record.text || "";
      checkbox.checked = !!record.done;
      applyTodoItemDoneClass(li, checkbox.checked);
    });

  } catch (e) {
  }
}

function maybeCountMissionSuccess() {
  // 미션 성공 기능 삭제됨
}

function setupTodoList() {
  if (!todoListEl) return;

  todoListEl.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.classList.contains("todo-checkbox")) {
      const li = target.closest(".todo-item");
      if (!li) return;
      applyTodoItemDoneClass(li, target.checked);
      saveTodosToStorage();
    }
  });

  todoListEl.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.classList.contains("todo-input")) return;

    saveTodosToStorage();
  });
}

// ====== 목표 박스 저장 ======

function saveGoalToStorage() {
  if (!goalBox) return;
  try {
    const text = goalBox.textContent || "";
    localStorage.setItem(CONFIG.storageKeys.goal, text);
  } catch (e) {
    // 실패 시 무시
  }
}

function loadGoalFromStorage() {
  if (!goalBox) return;

  let text = null;
  try {
    text = localStorage.getItem(CONFIG.storageKeys.goal);
  } catch (e) {
    return;
  }
  if (text === null) return;

  goalBox.textContent = text;
}

// ====== 로그인 / 쪽지 DOM ======
const loginOverlay = document.getElementById("loginOverlay");
const loginRoleRadios = document.querySelectorAll('input[name="role"]');
const teacherLoginBox = document.getElementById("teacherLoginBox");
const studentLoginBox = document.getElementById("studentLoginBox");
const teacherCodeInput = document.getElementById("teacherCodeInput");
const studentSelectEl = document.getElementById("studentSelect");
const loginErrorEl = document.getElementById("loginError");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfoBar = document.getElementById("userInfoBar");

const teacherMessagePanel = document.getElementById("teacherMessagePanel");
const studentMessagePanel = document.getElementById("studentMessagePanel");
const messageStudentSelect = document.getElementById("messageStudentSelect");
const messageInput = document.getElementById("messageInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const teacherMessageList = document.getElementById("teacherMessageList");
const studentMessageList = document.getElementById("studentMessageList");

// ====== 쪽지 저장 구조 ======
// messages = {
//   [studentId]: [ { text, timestamp }, ... ]
// }

function loadMessagesFromStorage() {
  let raw = null;
  try {
    raw = localStorage.getItem(CONFIG.storageKeys.messages);
  } catch (e) {
    return {};
  }
  if (!raw) return {};

  try {
    const data = JSON.parse(raw);
    if (data && typeof data === "object") return data;
    return {};
  } catch (e) {
    return {};
  }
}

function saveMessagesToStorage(messages) {
  try {
    localStorage.setItem(
      CONFIG.storageKeys.messages,
      JSON.stringify(messages)
    );
  } catch (e) {
    // 실패시 무시
  }
}

// 현재 메모리 상의 쪽지 데이터
let messages = loadMessagesFromStorage();

function addMessageForStudent(studentId, text) {
  if (!studentId || !text.trim()) return;
  if (!messages[studentId]) messages[studentId] = [];

  messages[studentId].push({
    text: text.trim(),
    timestamp: new Date().toISOString()
  });

  saveMessagesToStorage(messages);
}

// 시간 포맷 예쁘게
function formatKoreanTime(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function renderTeacherMessageList(studentId) {
  if (!teacherMessageList) return;
  teacherMessageList.innerHTML = "";

  const list = messages[studentId] || [];
  if (list.length === 0) {
    teacherMessageList.innerHTML =
      '<li class="message-item">아직 이 학생에게 보낸 쪽지가 없어요.</li>';
    return;
  }

  // 최근이 아래쪽에 보이게 그대로 출력
  list.forEach((msg) => {
    const li = document.createElement("li");
    li.className = "message-item";
    const timeStr = formatKoreanTime(msg.timestamp);
    li.innerHTML = `
      <span>${msg.text}</span>
      <span class="message-time">${timeStr}</span>
    `;
    teacherMessageList.appendChild(li);
  });
}

function renderStudentMessageList(studentId) {
  if (!studentMessageList) return;
  studentMessageList.innerHTML = "";

  const list = messages[studentId] || [];
  if (list.length === 0) {
    studentMessageList.innerHTML =
      '<li class="message-item">아직 선생님 쪽지가 없어요. 오늘 멋진 순간이 생기면 들어올 거예요 🌈</li>';
    return;
  }

  list.forEach((msg) => {
    const li = document.createElement("li");
    li.className = "message-item";
    const timeStr = formatKoreanTime(msg.timestamp);
    li.innerHTML = `
      <span>${msg.text}</span>
      <span class="message-time">${timeStr}</span>
    `;
    studentMessageList.appendChild(li);
  });
}

// ====== 로그인 상태 저장/로드 ======

function saveUserToStorage() {
  try {
    localStorage.setItem(
      CONFIG.storageKeys.user,
      JSON.stringify(currentUser)
    );
  } catch (e) {
    // 무시
  }
}

function loadUserFromStorage() {
  let raw = null;
  try {
    raw = localStorage.getItem(CONFIG.storageKeys.user);
  } catch (e) {
    return;
  }
  if (!raw) return;

  try {
    const user = JSON.parse(raw);
    if (!user || typeof user !== "object") return;
    currentUser = user;
  } catch (e) {
    // 무시
  }
}

// 로그인 UI 반영
function updateUserUI() {
  if (!userInfoBar) return;

  if (currentUser.role === "teacher") {
    userInfoBar.textContent = `${currentUser.name}로 로그인 중입니다. (교사 모드)`;
    if (teacherMessagePanel) teacherMessagePanel.classList.remove("hidden");
    if (studentMessagePanel) studentMessagePanel.classList.add("hidden");
  } else if (currentUser.role === "student") {
    userInfoBar.textContent = `${currentUser.name}로 로그인 중입니다. (학생 모드)`;
    if (teacherMessagePanel) teacherMessagePanel.classList.add("hidden");
    if (studentMessagePanel) studentMessagePanel.classList.remove("hidden");
    // 학생 모드에서 자기 쪽지 렌더링
    renderStudentMessageList(currentUser.id);
  } else {
    userInfoBar.textContent = "아직 로그인하지 않았어요.";
    if (teacherMessagePanel) teacherMessagePanel.classList.add("hidden");
    if (studentMessagePanel) studentMessagePanel.classList.add("hidden");
  }
}

function populateStudentSelects() {
  if (studentSelectEl) {
    studentSelectEl.innerHTML = "";
    CONFIG.users.students.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      studentSelectEl.appendChild(opt);
    });
  }
  if (messageStudentSelect) {
    messageStudentSelect.innerHTML = "";
    CONFIG.users.students.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      messageStudentSelect.appendChild(opt);
    });
  }
}

function setLoginMode(role) {
  if (role === "teacher") {
    teacherLoginBox.classList.remove("hidden");
    studentLoginBox.classList.add("hidden");
  } else {
    teacherLoginBox.classList.add("hidden");
    studentLoginBox.classList.remove("hidden");
  }
  loginErrorEl.textContent = "";
}

function handleLogin() {
  // 현재 선택된 역할
  let selectedRole = "teacher";
  loginRoleRadios.forEach((r) => {
    if (r.checked) selectedRole = r.value;
  });

  if (selectedRole === "teacher") {
    const code = teacherCodeInput.value.trim();
    if (!code) {
      loginErrorEl.textContent = "선생님 코드를 입력해 주세요.";
      return;
    }
    if (code !== CONFIG.users.teacher.code) {
      loginErrorEl.textContent = "코드가 맞지 않아요.";
      return;
    }
    currentUser = {
      role: "teacher",
      id: CONFIG.users.teacher.id,
      name: CONFIG.users.teacher.name
    };
  } else {
    const studentId = studentSelectEl.value;
    const student = CONFIG.users.students.find((s) => s.id === studentId);
    if (!student) {
      loginErrorEl.textContent = "학생을 선택해 주세요.";
      return;
    }
    currentUser = {
      role: "student",
      id: student.id,
      name: student.name
    };
  }

  saveUserToStorage();
  updateUserUI();

  // 로그인 성공 → 오버레이 숨김
  loginOverlay.classList.add("hidden");
}

function handleLogout() {
  currentUser = { role: "guest", id: null, name: null };
  saveUserToStorage();
  updateUserUI();
  // 다시 로그인 화면 보여줌
  loginOverlay.classList.remove("hidden");
}

// 쪽지 전송 버튼
function handleSendMessage() {
  if (currentUser.role !== "teacher") return;
  const studentId = messageStudentSelect.value;
  const text = messageInput.value;
  if (!studentId || !text.trim()) return;

  addMessageForStudent(studentId, text);
  messageInput.value = "";
  renderTeacherMessageList(studentId);

  // 학생 모드로 누가 보고 있었다면, 그 학생 화면도 함께 업데이트할 필요가 있지만
  // 지금 앱은 동시에 한 사람만 보므로 여기선 teacher view만 갱신
}

// ====== 이벤트 바인딩 ======

// 타이머 버튼
startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);

// 기능 선택 그리드 (프리셋) 버튼
const presetCards = document.querySelectorAll(".preset-card");
presetCards.forEach((card) => {
  card.addEventListener("click", () => {
    // 모든 카드 비활성화
    presetCards.forEach((c) => c.classList.remove("active"));
    // 클릭한 카드 활성화
    card.classList.add("active");

    const m = parseInt(card.dataset.min, 10);
    // const label = card.dataset.label; // 필요 시 사용

    minutesInput.value = m;
    secondsInput.value = 0;
    
    // 휴식 모드인지 확인 (Short Break, Long Break)
    const isBreak = card.dataset.label.includes("Break");
    
    if (isBreak) {
        enableRestMode();
    } else {
        disableRestMode();
    }

    resetTimer();
  });
});

// 시간 입력 변경 시 프리셋 선택 해제
minutesInput.addEventListener("change", () => {
  if (!isRunning) {
      setFromInputs();
      presetCards.forEach((c) => c.classList.remove("active"));
  }
});

secondsInput.addEventListener("change", () => {
  if (!isRunning) {
      setFromInputs();
      presetCards.forEach((c) => c.classList.remove("active"));
  }
});

// 목표 박스 입력 → 저장
if (goalBox) {
  goalBox.addEventListener("input", () => {
    saveGoalToStorage();
  });
}

// 역할 라디오 버튼
loginRoleRadios.forEach((r) => {
  r.addEventListener("change", () => {
    setLoginMode(r.value);
  });
});

// 로그인 버튼
if (loginBtn) {
  loginBtn.addEventListener("click", handleLogin);
}

// 로그아웃 버튼
if (logoutBtn) {
  logoutBtn.addEventListener("click", handleLogout);
}

// 학생 선택 바뀔 때, 교사용 쪽지 리스트 갱신
if (messageStudentSelect) {
  messageStudentSelect.addEventListener("change", () => {
    renderTeacherMessageList(messageStudentSelect.value);
  });
}

// 쪽지 전송
if (sendMessageBtn) {
  sendMessageBtn.addEventListener("click", handleSendMessage);
}

// 헤더 버튼
const headerLogoutBtn = document.getElementById("headerLogoutBtn");
const headerRoleBtn = document.getElementById("headerRoleBtn");

if (headerLogoutBtn) {
  headerLogoutBtn.addEventListener("click", handleLogout);
}

if (headerRoleBtn) {
  headerRoleBtn.addEventListener("click", () => {
    // 그냥 오버레이만 다시 열기 (로그아웃은 아님)
    loginOverlay.classList.remove("hidden");
  });
}

// ====== 초기화 ======

function init() {
  // 타이머 기본값
  minutesInput.value = CONFIG.defaultMinutes;
  secondsInput.value = 0;
  totalSeconds = CONFIG.defaultMinutes * 60;
  remainingSeconds = totalSeconds;
  resetBalloonVisual();

  // 링 초기화
  if (progressRing) {
    progressRing.style.strokeDasharray = String(RING_CIRCUMFERENCE);
    // ✅ 처음에는 링이 비어 보이도록 전체 길이만큼 숨기기
    progressRing.style.strokeDashoffset = String(RING_CIRCUMFERENCE);
  }

  // 저장된 데이터 불러오기
  loadGoalFromStorage();
  loadTodosFromStorage();

  // 초기 표시
  setupTodoList();
  updateDisplay();
  loadClassName();
  loadReflectionAndPlan(); // 반성 & 계획 불러오기

  // ✅ 로그인/쪽지 초기화
  populateStudentSelects();
  loadUserFromStorage();
  updateUserUI();

  // 처음 접속 시, 로그인 안 돼 있으면 오버레이 보이기
  if (currentUser.role === "teacher" || currentUser.role === "student") {
    loginOverlay.classList.add("hidden");
    // 학생이면 자기 쪽지 리스트 한번 렌더링
    if (currentUser.role === "student") {
      renderStudentMessageList(currentUser.id);
    } else if (currentUser.role === "teacher") {
      // 기본 선택 학생 기준으로 교사용 리스트 렌더
      if (messageStudentSelect && messageStudentSelect.value) {
        renderTeacherMessageList(messageStudentSelect.value);
      }
    }
  } else {
    loginOverlay.classList.remove("hidden");
  }
}

// 클래스 이름 저장/로드
const classNameInput = document.getElementById("classNameInput");
if (classNameInput) {
  classNameInput.addEventListener("input", () => {
    localStorage.setItem("classdash_classname_v1", classNameInput.value);
  });
}

function loadClassName() {
  if (!classNameInput) return;
  const saved = localStorage.getItem("classdash_classname_v1");
  if (saved) {
    classNameInput.value = saved;
  }
}

// 반성 & 계획 저장/로드
const reflectionInput = document.getElementById("reflectionInput");
const planInput = document.getElementById("planInput");

if (reflectionInput) {
  reflectionInput.addEventListener("input", () => {
    localStorage.setItem("classdash_reflection_v1", reflectionInput.value);
  });
}

if (planInput) {
  planInput.addEventListener("input", () => {
    localStorage.setItem("classdash_plan_v1", planInput.value);
  });
}

function loadReflectionAndPlan() {
  if (reflectionInput) {
    const savedRef = localStorage.getItem("classdash_reflection_v1");
    if (savedRef) reflectionInput.value = savedRef;
  }
  if (planInput) {
    const savedPlan = localStorage.getItem("classdash_plan_v1");
    if (savedPlan) planInput.value = savedPlan;
  }
}

init();
