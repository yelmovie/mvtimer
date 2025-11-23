// 데이터 저장소 (로컬 스토리지 사용)
let currentUser = null;
let currentUserType = null;

// 초기화
document.addEventListener("DOMContentLoaded", function () {
  checkLoginStatus();
});

// 화면 전환 함수
function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });
  document.getElementById(screenId).classList.add("active");
}

function showLoginScreen() {
  showScreen("loginScreen");
}

function showTeacherLogin() {
  showScreen("teacherLogin");
}

function showStudentLogin() {
  showScreen("studentLogin");
}

// 로그인 함수
function loginAsTeacher() {
  const name = document.getElementById("teacherName").value.trim();
  if (!name) {
    alert("이름을 입력해주세요.");
    return;
  }

  currentUser = name;
  currentUserType = "teacher";
  localStorage.setItem("currentUser", name);
  localStorage.setItem("currentUserType", "teacher");

  // 교사 데이터 초기화
  if (!localStorage.getItem("teachers")) {
    localStorage.setItem("teachers", JSON.stringify({}));
  }

  if (!localStorage.getItem("classes")) {
    localStorage.setItem("classes", JSON.stringify({}));
  }

  if (!localStorage.getItem("students")) {
    localStorage.setItem("students", JSON.stringify({}));
  }

  if (!localStorage.getItem("assignments")) {
    localStorage.setItem("assignments", JSON.stringify({}));
  }

  if (!localStorage.getItem("notices")) {
    localStorage.setItem("notices", JSON.stringify({}));
  }

  document.getElementById("teacherNameDisplay").textContent = name;
  showScreen("teacherScreen");
  loadTeacherData();
}

function loginAsStudent() {
  // 입력값에서 숫자만 추출
  let code = document.getElementById("studentCode").value.trim();
  const name = document.getElementById("studentName").value.trim();

  // 숫자가 아닌 문자 제거
  code = code.replace(/\D/g, "");

  if (!code || !name) {
    alert("학생 코드와 이름을 모두 입력해주세요.");
    return;
  }

  // 학생 코드가 정확히 4자리 숫자인지 확인
  if (code.length !== 4 || isNaN(code)) {
    const originalValue = document.getElementById("studentCode").value;
    alert(
      `학생 코드는 정확히 4자리 숫자여야 합니다.\n\n입력한 값: "${originalValue}"\n처리된 코드: "${code}" (${code.length}자리)\n\n4자리 숫자를 입력해주세요.\n예: 1234`
    );
    return;
  }

  const students = JSON.parse(localStorage.getItem("students") || "{}");
  const student = students[code];

  if (!student) {
    // 등록된 모든 학생 코드 목록 표시 (디버깅용)
    const allCodes = Object.keys(students);
    if (allCodes.length > 0) {
      alert(
        `올바른 학생 코드를 입력해주세요.\n\n입력한 코드: ${code}\n\n등록된 학생 코드 목록:\n${allCodes
          .slice(0, 10)
          .join(", ")}${allCodes.length > 10 ? "..." : ""}`
      );
    } else {
      alert("등록된 학생이 없습니다.\n\n교사가 먼저 학생을 추가해야 합니다.");
    }
    return;
  }

  // 학생 이름 검증 (대소문자 구분 없이)
  if (student.name.trim() !== name.trim()) {
    alert(
      `학생 이름이 일치하지 않습니다.\n\n등록된 이름: "${student.name}"\n입력한 이름: "${name}"\n\n정확한 이름을 입력해주세요.`
    );
    return;
  }

  currentUser = code;
  currentUserType = "student";
  localStorage.setItem("currentUser", code);
  localStorage.setItem("currentUserType", "student");

  document.getElementById("studentNameDisplay").textContent = student.name;
  showScreen("studentScreen");
  loadStudentData();
}

function logout() {
  currentUser = null;
  currentUserType = null;
  localStorage.removeItem("currentUser");
  localStorage.removeItem("currentUserType");
  showLoginScreen();
}

function checkLoginStatus() {
  const user = localStorage.getItem("currentUser");
  const userType = localStorage.getItem("currentUserType");

  if (user && userType) {
    currentUser = user;
    currentUserType = userType;

    if (userType === "teacher") {
      document.getElementById("teacherNameDisplay").textContent = user;
      showScreen("teacherScreen");
      loadTeacherData();
    } else {
      const students = JSON.parse(localStorage.getItem("students") || "{}");
      const student = students[user];
      if (student) {
        document.getElementById("studentNameDisplay").textContent =
          student.name;
        showScreen("studentScreen");
        loadStudentData();
      } else {
        showLoginScreen();
      }
    }
  } else {
    showLoginScreen();
  }
}

// 탭 전환
function showTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });

  event.target.classList.add("active");
  document.getElementById(tabName).classList.add("active");
}

// 학급 관리
function createClass() {
  const className = document.getElementById("className").value.trim();
  if (!className) {
    alert("학급명을 입력해주세요.");
    return;
  }

  const classes = JSON.parse(localStorage.getItem("classes") || "{}");
  const classId = "class_" + Date.now();

  classes[classId] = {
    id: classId,
    name: className,
    teacher: currentUser,
    students: [],
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem("classes", JSON.stringify(classes));
  document.getElementById("className").value = "";
  loadTeacherData();
}

function loadTeacherData() {
  loadClasses();
  loadAssignments();
  loadNotices();
}

function loadClasses() {
  const classes = JSON.parse(localStorage.getItem("classes") || "{}");
  const classList = document.getElementById("classList");
  const studentList = document.getElementById("studentList");

  classList.innerHTML = "";
  studentList.innerHTML = "";

  const teacherClasses = Object.values(classes).filter(
    (c) => c.teacher === currentUser
  );

  if (teacherClasses.length === 0) {
    classList.innerHTML =
      '<div class="empty-state">생성된 학급이 없습니다.</div>';
    return;
  }

  teacherClasses.forEach((classItem) => {
    const classDiv = document.createElement("div");
    classDiv.className = "class-item";
    classDiv.innerHTML = `
            <h4>${classItem.name}</h4>
            <p>학생 수: ${classItem.students.length}명</p>
            <button class="btn btn-primary" onclick="selectClass('${classItem.id}')">학급 선택</button>
            <button class="btn btn-secondary" onclick="addStudent('${classItem.id}')">학생 추가</button>
        `;
    classList.appendChild(classDiv);
  });
}

function selectClass(classId) {
  const classes = JSON.parse(localStorage.getItem("classes") || "{}");
  const classItem = classes[classId];
  const students = JSON.parse(localStorage.getItem("students") || "{}");
  const studentList = document.getElementById("studentList");

  studentList.innerHTML = "<h3>학생 목록</h3>";

  classItem.students.forEach((studentCode) => {
    const student = students[studentCode];
    if (student) {
      const studentDiv = document.createElement("div");
      studentDiv.className = "student-item";
      studentDiv.innerHTML = `
                <div>
                    <strong>${student.name}</strong>
                    <span class="student-code">코드: ${studentCode}</span>
                </div>
            `;
      studentList.appendChild(studentDiv);
    }
  });
}

function addStudent(classId) {
  const studentName = prompt("학생 이름을 입력하세요:");
  if (!studentName) return;

  const classes = JSON.parse(localStorage.getItem("classes") || "{}");
  const students = JSON.parse(localStorage.getItem("students") || "{}");

  // 4자리 숫자 코드 생성 (중복 방지)
  let studentCode;
  let attempts = 0;
  do {
    studentCode = String(Math.floor(1000 + Math.random() * 9000)); // 1000~9999 사이의 4자리 숫자
    attempts++;
    if (attempts > 100) {
      alert("학생 코드 생성에 실패했습니다. 다시 시도해주세요.");
      return;
    }
  } while (students[studentCode]); // 중복 확인

  students[studentCode] = {
    code: studentCode,
    name: studentName,
    classId: classId,
    cookies: 0,
    assignments: {},
    createdAt: new Date().toISOString(),
  };

  classes[classId].students.push(studentCode);

  localStorage.setItem("classes", JSON.stringify(classes));
  localStorage.setItem("students", JSON.stringify(students));

  alert(
    `학생이 추가되었습니다!\n학생 코드: ${studentCode}\n이 코드를 학생에게 알려주세요.`
  );
  loadTeacherData();
}

// 과제 관리
function sendAssignment() {
  const title = document.getElementById("assignmentTitle").value.trim();
  const content = document.getElementById("assignmentContent").value.trim();

  if (!title || !content) {
    alert("과제 제목과 내용을 모두 입력해주세요.");
    return;
  }

  const classes = JSON.parse(localStorage.getItem("classes") || "{}");
  const assignments = JSON.parse(localStorage.getItem("assignments") || "{}");
  const students = JSON.parse(localStorage.getItem("students") || "{}");

  const assignmentId = "ASS" + Date.now();

  // 현재 교사의 모든 학급의 학생들에게 과제 전송
  const teacherClasses = Object.values(classes).filter(
    (c) => c.teacher === currentUser
  );
  const allStudents = [];

  teacherClasses.forEach((classItem) => {
    allStudents.push(...classItem.students);
  });

  assignments[assignmentId] = {
    id: assignmentId,
    title: title,
    content: content,
    teacher: currentUser,
    students: allStudents,
    createdAt: new Date().toISOString(),
  };

  // 각 학생의 과제 목록에 추가
  allStudents.forEach((studentCode) => {
    if (students[studentCode]) {
      if (!students[studentCode].assignments) {
        students[studentCode].assignments = {};
      }
      students[studentCode].assignments[assignmentId] = {
        status: "pending",
        submittedAt: null,
        feedback: null,
      };
    }
  });

  localStorage.setItem("assignments", JSON.stringify(assignments));
  localStorage.setItem("students", JSON.stringify(students));

  document.getElementById("assignmentTitle").value = "";
  document.getElementById("assignmentContent").value = "";
  loadAssignments();
  alert("과제가 전송되었습니다!");
}

function loadAssignments() {
  const assignments = JSON.parse(localStorage.getItem("assignments") || "{}");
  const assignmentList = document.getElementById("assignmentList");

  assignmentList.innerHTML = "";

  const teacherAssignments = Object.values(assignments).filter(
    (a) => a.teacher === currentUser
  );

  if (teacherAssignments.length === 0) {
    assignmentList.innerHTML =
      '<div class="empty-state">전송된 과제가 없습니다.</div>';
    return;
  }

  teacherAssignments.reverse().forEach((assignment) => {
    const assignmentDiv = document.createElement("div");
    assignmentDiv.className = "assignment-item";
    assignmentDiv.innerHTML = `
            <h4>${assignment.title}</h4>
            <p>${assignment.content}</p>
            <p style="color: #999; font-size: 14px;">전송일: ${new Date(
              assignment.createdAt
            ).toLocaleString()}</p>
            <p style="color: #999; font-size: 14px;">학생 수: ${
              assignment.students.length
            }명</p>
        `;
    assignmentList.appendChild(assignmentDiv);
  });
}

// 알림장 관리
function sendNotice() {
  const title = document.getElementById("noticeTitle").value.trim();
  const content = document.getElementById("noticeContent").value.trim();

  if (!title || !content) {
    alert("알림장 제목과 내용을 모두 입력해주세요.");
    return;
  }

  const classes = JSON.parse(localStorage.getItem("classes") || "{}");
  const notices = JSON.parse(localStorage.getItem("notices") || "{}");

  const noticeId = "NOT" + Date.now();

  const teacherClasses = Object.values(classes).filter(
    (c) => c.teacher === currentUser
  );
  const allStudents = [];

  teacherClasses.forEach((classItem) => {
    allStudents.push(...classItem.students);
  });

  notices[noticeId] = {
    id: noticeId,
    title: title,
    content: content,
    teacher: currentUser,
    students: allStudents,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem("notices", JSON.stringify(notices));

  document.getElementById("noticeTitle").value = "";
  document.getElementById("noticeContent").value = "";
  loadNotices();
  alert("알림장이 전송되었습니다!");
}

function loadNotices() {
  const notices = JSON.parse(localStorage.getItem("notices") || "{}");
  const noticeList = document.getElementById("noticeList");

  noticeList.innerHTML = "";

  const teacherNotices = Object.values(notices).filter(
    (n) => n.teacher === currentUser
  );

  if (teacherNotices.length === 0) {
    noticeList.innerHTML =
      '<div class="empty-state">전송된 알림장이 없습니다.</div>';
    return;
  }

  teacherNotices.reverse().forEach((notice) => {
    const noticeDiv = document.createElement("div");
    noticeDiv.className = "notice-item";
    noticeDiv.innerHTML = `
            <h4>${notice.title}</h4>
            <p>${notice.content}</p>
            <p style="color: #999; font-size: 14px;">전송일: ${new Date(
              notice.createdAt
            ).toLocaleString()}</p>
        `;
    noticeList.appendChild(noticeDiv);
  });
}

// 학생 화면
function loadStudentData() {
  loadStudentAssignments();
  loadStudentNotices();
  loadCookies();
}

function loadStudentAssignments() {
  const students = JSON.parse(localStorage.getItem("students") || "{}");
  const assignments = JSON.parse(localStorage.getItem("assignments") || "{}");
  const student = students[currentUser];
  const assignmentList = document.getElementById("studentAssignmentList");

  assignmentList.innerHTML = "";

  if (
    !student ||
    !student.assignments ||
    Object.keys(student.assignments).length === 0
  ) {
    assignmentList.innerHTML =
      '<div class="empty-state">받은 과제가 없습니다.</div>';
    return;
  }

  Object.keys(student.assignments)
    .reverse()
    .forEach((assignmentId) => {
      const assignment = assignments[assignmentId];
      if (!assignment) return;

      const studentAssignment = student.assignments[assignmentId];
      const status = studentAssignment.status;
      const statusText =
        status === "pending"
          ? "미제출"
          : status === "submitted"
          ? "제출완료"
          : "피드백완료";
      const statusClass =
        status === "pending"
          ? "status-pending"
          : status === "submitted"
          ? "status-submitted"
          : "status-feedback";

      const assignmentDiv = document.createElement("div");
      assignmentDiv.className = "assignment-item";
      assignmentDiv.innerHTML = `
            <h4>${
              assignment.title
            } <span class="status-badge ${statusClass}">${statusText}</span></h4>
            <p>${assignment.content}</p>
            <p style="color: #999; font-size: 14px;">받은 날짜: ${new Date(
              assignment.createdAt
            ).toLocaleString()}</p>
            ${
              status === "pending"
                ? `
                <button class="submit-btn" onclick="submitAssignment('${assignmentId}')">과제 제출</button>
            `
                : ""
            }
            ${
              studentAssignment.feedback
                ? `
                <div class="feedback-section">
                    <strong>선생님 피드백:</strong>
                    <p>${studentAssignment.feedback}</p>
                </div>
            `
                : ""
            }
        `;
      assignmentList.appendChild(assignmentDiv);
    });
}

function submitAssignment(assignmentId) {
  const submission = prompt("과제 제출 내용을 입력하세요:");
  if (!submission) return;

  const students = JSON.parse(localStorage.getItem("students") || "{}");
  const student = students[currentUser];

  if (student.assignments[assignmentId]) {
    student.assignments[assignmentId].status = "submitted";
    student.assignments[assignmentId].submittedAt = new Date().toISOString();
    student.assignments[assignmentId].submission = submission;

    // 쿠키 보상
    student.cookies = (student.cookies || 0) + 1;

    localStorage.setItem("students", JSON.stringify(students));
    loadStudentAssignments();
    loadCookies();
    alert("과제가 제출되었습니다! 🍪 쿠키 1개를 받았습니다!");
  }
}

function loadStudentNotices() {
  const notices = JSON.parse(localStorage.getItem("notices") || "{}");
  const students = JSON.parse(localStorage.getItem("students") || "{}");
  const student = students[currentUser];
  const noticeList = document.getElementById("studentNoticeList");

  noticeList.innerHTML = "";

  if (!student) return;

  const studentNotices = Object.values(notices).filter(
    (n) => n.students && n.students.includes(currentUser)
  );

  if (studentNotices.length === 0) {
    noticeList.innerHTML =
      '<div class="empty-state">받은 알림장이 없습니다.</div>';
    return;
  }

  studentNotices.reverse().forEach((notice) => {
    const noticeDiv = document.createElement("div");
    noticeDiv.className = "notice-item";
    noticeDiv.innerHTML = `
            <h4>${notice.title}</h4>
            <p>${notice.content}</p>
            <p style="color: #999; font-size: 14px;">받은 날짜: ${new Date(
              notice.createdAt
            ).toLocaleString()}</p>
        `;
    noticeList.appendChild(noticeDiv);
  });
}

function loadCookies() {
  const students = JSON.parse(localStorage.getItem("students") || "{}");
  const student = students[currentUser];

  if (student) {
    document.getElementById("cookieCount").textContent = student.cookies || 0;
  }
}
