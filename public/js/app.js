// ==================== Config ====================
const API = '/api/students';
let students = [];
let selectedIds = new Set();
let currentSort = { column: 'created_at', order: 'desc' };
let deleteCallback = null;

// ==================== Boot ====================
document.addEventListener('DOMContentLoaded', () => {
  initSparkles();
  initGreeting();
  initNavigation();
  initSearch();
  initSelectAll();
  initSortHeaders();
  initBulkDelete();
  initForm();
  initEmojiPicker();
  initMoodPicker();
  initColorPicker();
  loadQuote();
  loadDashboard();
  loadStudents();
});

// ==================== Sparkles ====================
function initSparkles() {
  const container = document.getElementById('sparkles');
  if (!container) return;
  const colors = ['#ff6b9d','#a855f7','#f472b6','#fbbf24','#c084fc','#fb7185'];
  for (let i = 0; i < 18; i++) {
    const dot = document.createElement('div');
    dot.className = 'sparkle-dot';
    const size = Math.random() * 6 + 3;
    dot.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration:${Math.random() * 12 + 8}s;
      animation-delay:${Math.random() * 10}s;
    `;
    container.appendChild(dot);
  }
}

// ==================== Greeting ====================
function initGreeting() {
  const hour = new Date().getHours();
  let greet = '🌙 Good night,';
  if (hour >= 5 && hour < 12) greet = '🌅 Good morning,';
  else if (hour >= 12 && hour < 17) greet = '☀️ Good afternoon,';
  else if (hour >= 17 && hour < 21) greet = '🌆 Good evening,';

  const el = document.getElementById('greeting');
  if (el) el.textContent = greet + ' Queen! 👑';

  const dateEl = document.getElementById('dateDisplay');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }
}

// ==================== Quote ====================
async function loadQuote() {
  try {
    const res = await fetch('/api/quote');
    const json = await res.json();
    if (!json.success) return;
    const { text, author } = json.data;
    const textEl = document.getElementById('quoteText');
    const authorEl = document.getElementById('quoteAuthor');
    const sidebarEl = document.querySelector('#sidebarQuote .quote-text');
    if (textEl) textEl.textContent = `"${text}"`;
    if (authorEl) authorEl.textContent = `— ${author}`;
    if (sidebarEl) sidebarEl.textContent = `"${text}"`;
  } catch (e) { /* silent */ }
}
window.loadQuote = loadQuote;

// ==================== Navigation ====================
function initNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchView(link.dataset.view);
    });
  });
  const toggle = document.getElementById('menuToggle');
  if (toggle) toggle.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
}

function switchView(view) {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const active = document.querySelector(`.nav-link[data-view="${view}"]`);
  if (active) active.classList.add('active');

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  const emojis = { dashboard: '✨', students: '💖', 'add-student': '🌸' };
  const labels = { dashboard: 'Dashboard', students: 'My Students', 'add-student': 'Add Student' };

  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.innerHTML = `<span class="title-emoji">${emojis[view] || '✨'}</span> ${labels[view] || ''}`;

  if (view === 'dashboard') {
    document.getElementById('dashboardView').classList.add('active');
    loadDashboard();
  } else if (view === 'students') {
    document.getElementById('studentsView').classList.add('active');
    loadStudents();
  } else if (view === 'add-student') {
    document.getElementById('addStudentView').classList.add('active');
  }

  document.getElementById('sidebar').classList.remove('open');
}
window.switchView = switchView;

// ==================== Dashboard ====================
async function loadDashboard() {
  try {
    const res = await fetch(`${API}/stats`);
    const json = await res.json();
    if (!json.success) return;
    const d = json.data;

    setText('statTotal', d.totalStudents);
    setText('statActive', d.activeStudents);
    setText('statGpa', d.averageGpa.toFixed(2));
    setText('statGraduated', d.graduatedStudents);

    // Spotlight
    if (d.topStudent && d.topStudent.id) {
      const card = document.getElementById('spotlightCard');
      if (card) {
        card.style.display = '';
        setText('spotlightEmoji', d.topStudent.profile_emoji || '👩‍🎓');
        setText('spotlightName', `${d.topStudent.first_name} ${d.topStudent.last_name}`);
        setText('spotlightDetails', `${d.topStudent.course} · ${d.topStudent.status}`);
        setText('spotlightGpa', parseFloat(d.topStudent.gpa).toFixed(2));
        const t = d.topStudent.title;
        setText('spotlightTitle', t ? `${t.emoji} ${t.label}` : '');
      }
    }

    renderCourseChart(d.byCourse);
    renderMoodChart(d.byMood);
    renderGenderChart(d.byGender, d.totalStudents);
    loadRecentStudents();
  } catch (e) { console.error(e); }
}

function renderCourseChart(data) {
  const el = document.getElementById('courseChart');
  if (!el) return;
  if (!data || data.length === 0) { el.innerHTML = emptyChart('No courses yet 📚'); return; }
  const max = Math.max(...data.map(d => d.count));
  const palette = ['#ff6b9d','#a855f7','#f472b6','#fbbf24','#fb7185','#c084fc','#6ee7b7','#7dd3fc','#fca5a5','#d8b4fe'];
  el.innerHTML = `<div class="bar-chart">${data.map((d, i) => `
    <div class="bar-row">
      <span class="bar-label">${d.course}</span>
      <div class="bar-wrapper">
        <div class="bar-fill" style="width:${(d.count/max)*100}%;background:${palette[i%palette.length]}">${d.count}</div>
      </div>
    </div>`).join('')}</div>`;
}

function renderMoodChart(data) {
  const el = document.getElementById('moodChart');
  if (!el) return;
  if (!data || data.length === 0) { el.innerHTML = emptyChart('No moods recorded yet 😊'); return; }
  el.innerHTML = `<div class="mood-grid">${data.map(d => `
    <div class="mood-item">
      <span class="mood-emoji">${d.mood}</span>
      <span class="mood-count">${d.count}</span>
      <span class="mood-label">students</span>
    </div>`).join('')}</div>`;
}

function renderGenderChart(data, total) {
  const el = document.getElementById('genderChart');
  if (!el) return;
  if (!data || data.length === 0 || total === 0) { el.innerHTML = emptyChart('No gender data yet 🌈'); return; }
  const colors = { Female: '#ff6b9d', Male: '#a855f7', 'Non-binary': '#fbbf24', Other: '#6ee7b7' };
  let cum = 0;
  const parts = data.map(d => {
    const pct = (d.count / total) * 100;
    const color = colors[d.gender] || '#c4b5fd';
    const seg = `${color} ${cum}% ${cum + pct}%`;
    cum += pct;
    return { seg, color, label: d.gender || 'Not specified', count: d.count, pct };
  });
  el.innerHTML = `
    <div class="donut-chart">
      <div class="donut-visual" style="background:conic-gradient(${parts.map(p => p.seg).join(',')})"></div>
      <div class="donut-legend">${parts.map(p => `
        <div class="legend-item">
          <span class="legend-dot" style="background:${p.color}"></span>
          <span>${p.label}: ${p.count} (${p.pct.toFixed(0)}%)</span>
        </div>`).join('')}
      </div>
    </div>`;
}

async function loadRecentStudents() {
  try {
    const res = await fetch(`${API}?sort=created_at&order=desc`);
    const json = await res.json();
    if (!json.success) return;
    const recent = json.data.slice(0, 5);
    const el = document.getElementById('recentStudents');
    if (!el) return;
    if (recent.length === 0) { el.innerHTML = emptyChart('No students yet 🌷'); return; }
    el.innerHTML = recent.map(s => `
      <div class="recent-student-row">
        <div class="avatar-emoji" style="background:linear-gradient(135deg,${s.favorite_color||'#ff6b9d'}22,${s.favorite_color||'#a855f7'}22)">
          ${s.profile_emoji || '👩‍🎓'}
        </div>
        <div class="recent-student-info">
          <h4>${s.first_name} ${s.last_name}</h4>
          <p>${s.course} · GPA ${parseFloat(s.gpa).toFixed(2)} · ${s.mood || '😊'}</p>
        </div>
        <span class="status-badge status-${(s.status||'active').toLowerCase()}">${s.status}</span>
      </div>`).join('');
  } catch (e) { /* silent */ }
}

function emptyChart(msg) {
  return `<div style="text-align:center;padding:30px 0;color:#c4b5fd;font-weight:600;">${msg}</div>`;
}

// ==================== Students Table ====================
async function loadStudents() {
  try {
    const search = document.getElementById('searchInput')?.value || '';
    const course = document.getElementById('filterCourse')?.value || '';
    const status = document.getElementById('filterStatus')?.value || '';
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (course) params.set('course', course);
    if (status) params.set('status', status);
    params.set('sort', currentSort.column);
    params.set('order', currentSort.order);

    const res = await fetch(`${API}?${params}`);
    const json = await res.json();
    if (!json.success) return;
    students = json.data;
    selectedIds.clear();
    updateBulkActions();
    renderTable();
    populateCourseFilter();
  } catch (e) { console.error(e); }
}

function renderTable() {
  const tbody = document.getElementById('studentsTableBody');
  const empty = document.getElementById('emptyState');
  const tableWrap = document.querySelector('.table-container');
  if (!tbody) return;

  if (students.length === 0) {
    if (tableWrap) tableWrap.style.display = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (tableWrap) tableWrap.style.display = '';
  if (empty) empty.style.display = 'none';

  tbody.innerHTML = students.map(s => {
    const gpaNum = parseFloat(s.gpa);
    const gpaClass = gpaNum >= 3.5 ? 'gpa-high' : gpaNum >= 2.5 ? 'gpa-mid' : 'gpa-low';
    const color = s.favorite_color || '#ff69b4';
    return `
    <tr data-id="${s.id}">
      <td><input type="checkbox" class="row-check" value="${s.id}" ${selectedIds.has(s.id) ? 'checked' : ''} /></td>
      <td>
        <div class="student-name-cell">
          <div class="avatar-emoji" style="background:linear-gradient(135deg,${color}22,${color}44)">
            ${s.profile_emoji || '👩‍🎓'}
          </div>
          <div class="name-text">
            <h4>${s.first_name} ${s.last_name}</h4>
            <p class="student-title">${s.title ? s.title.emoji + ' ' + s.title.label : ''}</p>
          </div>
        </div>
      </td>
      <td>${s.email}</td>
      <td>${s.course}</td>
      <td><span class="gpa-display ${gpaClass}">${gpaNum.toFixed(2)}</span></td>
      <td><span class="student-mood">${s.mood || '😊'}</span></td>
      <td><span class="status-badge status-${(s.status||'active').toLowerCase()}">${s.status}</span></td>
      <td>
        <div class="actions-cell">
          <button class="btn-icon edit" title="Edit" onclick="editStudent(${s.id})"><i class="fas fa-pen"></i></button>
          <button class="btn-icon delete" title="Delete" onclick="confirmDelete(${s.id})"><i class="fas fa-trash-can"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');

  document.querySelectorAll('.row-check').forEach(cb => {
    cb.addEventListener('change', e => {
      const id = parseInt(e.target.value);
      e.target.checked ? selectedIds.add(id) : selectedIds.delete(id);
      updateBulkActions();
    });
  });
}

function populateCourseFilter() {
  const sel = document.getElementById('filterCourse');
  if (!sel) return;
  const cur = sel.value;
  const courses = [...new Set(students.map(s => s.course))].sort();
  sel.innerHTML = '<option value="">💐 All Courses</option>' +
    courses.map(c => `<option value="${c}" ${c === cur ? 'selected' : ''}>${c}</option>`).join('');
}

// ==================== Search / Filter ====================
function initSearch() {
  let timer;
  document.getElementById('searchInput')?.addEventListener('input', () => {
    clearTimeout(timer); timer = setTimeout(loadStudents, 300);
  });
  document.getElementById('filterCourse')?.addEventListener('change', loadStudents);
  document.getElementById('filterStatus')?.addEventListener('change', loadStudents);
}

// ==================== Sorting ====================
function initSortHeaders() {
  document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      currentSort.order = currentSort.column === col && currentSort.order === 'asc' ? 'desc' : 'asc';
      currentSort.column = col;
      loadStudents();
    });
  });
}

// ==================== Select All / Bulk ====================
function initSelectAll() {
  document.getElementById('selectAll')?.addEventListener('change', e => {
    document.querySelectorAll('.row-check').forEach(cb => {
      cb.checked = e.target.checked;
      const id = parseInt(cb.value);
      e.target.checked ? selectedIds.add(id) : selectedIds.delete(id);
    });
    updateBulkActions();
  });
}

function updateBulkActions() {
  const bar = document.getElementById('bulkActions');
  const cnt = document.getElementById('selectedCount');
  if (!bar) return;
  if (selectedIds.size > 0) {
    bar.style.display = 'flex';
    if (cnt) cnt.textContent = `${selectedIds.size} selected`;
  } else {
    bar.style.display = 'none';
  }
}

function initBulkDelete() {
  document.getElementById('bulkDeleteBtn')?.addEventListener('click', () => {
    deleteCallback = async () => {
      try {
        const res = await fetch(API, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [...selectedIds] })
        });
        const json = await res.json();
        json.success ? showToast(json.message, 'success') : showToast(json.error, 'error');
        loadStudents(); loadDashboard();
      } catch (e) { showToast('Could not delete students', 'error'); }
    };
    document.getElementById('deleteModalText').textContent =
      `Are you sure you want to remove ${selectedIds.size} student(s)? This can't be undone!`;
    openModal();
  });
}

// ==================== Form ====================
function initForm() {
  document.getElementById('studentForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validateForm()) return;

    const id = document.getElementById('studentId').value;
    const data = {
      first_name: document.getElementById('firstName').value.trim(),
      last_name:  document.getElementById('lastName').value.trim(),
      email:      document.getElementById('email').value.trim(),
      date_of_birth: document.getElementById('dateOfBirth').value || null,
      gender:     document.getElementById('gender').value || null,
      course:     document.getElementById('course').value,
      gpa:        parseFloat(document.getElementById('gpa').value) || 0,
      status:     document.getElementById('status').value,
      phone:      document.getElementById('phone').value.trim() || null,
      favorite_color: document.getElementById('favoriteColor').value,
      bio:        document.getElementById('bio').value.trim() || null,
      hobby:      document.getElementById('hobby').value.trim() || null,
      mood:       document.getElementById('mood').value,
      profile_emoji: document.getElementById('profileEmoji').value
    };

    try {
      const url = id ? `${API}/${id}` : API;
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message, 'success');
        if (!id) launchConfetti();
        resetForm();
        switchView('students');
      } else {
        showToast(json.error, 'error');
      }
    } catch (e) { showToast('Could not save student', 'error'); }
  });
}

function validateForm() {
  clearErrors();
  let ok = true;
  const req = [
    ['firstName', 'firstNameError', 'First name is required'],
    ['lastName',  'lastNameError',  'Last name is required'],
    ['email',     'emailError',     'Email is required'],
    ['course',    'courseError',    'Please select a course']
  ];
  req.forEach(([id, errId, msg]) => {
    const el = document.getElementById(id);
    if (!el.value.trim()) { showFieldError(errId, el, msg); ok = false; }
  });
  const email = document.getElementById('email');
  if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    showFieldError('emailError', email, 'Invalid email format'); ok = false;
  }
  const gpa = document.getElementById('gpa');
  if (gpa.value && (parseFloat(gpa.value) < 0 || parseFloat(gpa.value) > 4)) {
    showFieldError('gpaError', gpa, 'GPA must be between 0.0 and 4.0'); ok = false;
  }
  return ok;
}

function showFieldError(errId, input, msg) {
  const el = document.getElementById(errId);
  if (el) el.textContent = msg;
  input.classList.add('error');
}

function clearErrors() {
  document.querySelectorAll('.error-msg').forEach(e => e.textContent = '');
  document.querySelectorAll('.error').forEach(e => e.classList.remove('error'));
}

async function editStudent(id) {
  try {
    const res = await fetch(`${API}/${id}`);
    const json = await res.json();
    if (!json.success) return showToast(json.error, 'error');
    const s = json.data;

    document.getElementById('studentId').value   = s.id;
    document.getElementById('firstName').value   = s.first_name;
    document.getElementById('lastName').value    = s.last_name;
    document.getElementById('email').value       = s.email;
    document.getElementById('dateOfBirth').value = s.date_of_birth || '';
    document.getElementById('gender').value      = s.gender || '';
    document.getElementById('course').value      = s.course;
    document.getElementById('gpa').value         = s.gpa;
    document.getElementById('status').value      = s.status;
    document.getElementById('phone').value       = s.phone || '';
    document.getElementById('favoriteColor').value = s.favorite_color || '#ff69b4';
    document.getElementById('colorLabel').textContent = s.favorite_color || '#ff69b4';
    document.getElementById('bio').value         = s.bio || '';
    document.getElementById('hobby').value       = s.hobby || '';
    document.getElementById('mood').value        = s.mood || '😊';
    document.getElementById('profileEmoji').value = s.profile_emoji || '👩‍🎓';

    // Update pickers visually
    setActivePicker('emojiPicker', 'emoji-btn', 'data-emoji', s.profile_emoji || '👩‍🎓');
    setActivePicker('moodPicker',  'mood-btn',  'data-mood',  s.mood || '😊');

    document.getElementById('formTitle').innerHTML = `<span class="form-title-emoji">✏️</span> Edit Student`;
    document.getElementById('submitBtn').innerHTML = `<i class="fas fa-wand-magic-sparkles"></i> Update Student`;

    switchView('add-student');
  } catch (e) { showToast('Could not load student', 'error'); }
}
window.editStudent = editStudent;

function confirmDelete(id) {
  deleteCallback = async () => {
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
      const json = await res.json();
      json.success ? showToast(json.message, 'success') : showToast(json.error, 'error');
      loadStudents(); loadDashboard();
    } catch (e) { showToast('Could not delete student', 'error'); }
  };
  document.getElementById('deleteModalText').textContent =
    'Are you sure you want to remove this student? This can\'t be undone!';
  openModal();
}
window.confirmDelete = confirmDelete;

function resetForm() {
  document.getElementById('studentForm').reset();
  document.getElementById('studentId').value = '';
  document.getElementById('profileEmoji').value = '👩‍🎓';
  document.getElementById('mood').value = '😊';
  document.getElementById('favoriteColor').value = '#ff69b4';
  document.getElementById('colorLabel').textContent = '#ff69b4';
  document.getElementById('formTitle').innerHTML = `<span class="form-title-emoji">🌸</span> Add New Student`;
  document.getElementById('submitBtn').innerHTML  = `<i class="fas fa-wand-magic-sparkles"></i> Save Student`;
  setActivePicker('emojiPicker', 'emoji-btn', 'data-emoji', '👩‍🎓');
  setActivePicker('moodPicker',  'mood-btn',  'data-mood',  '😊');
  clearErrors();
}
window.resetForm = resetForm;

// ==================== Emoji / Mood / Color Pickers ====================
function initEmojiPicker() {
  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setActivePicker('emojiPicker', 'emoji-btn', 'data-emoji', btn.dataset.emoji);
      document.getElementById('profileEmoji').value = btn.dataset.emoji;
    });
  });
}

function initMoodPicker() {
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setActivePicker('moodPicker', 'mood-btn', 'data-mood', btn.dataset.mood);
      document.getElementById('mood').value = btn.dataset.mood;
    });
  });
}

function setActivePicker(pickerId, btnClass, attr, value) {
  document.querySelectorAll(`#${pickerId} .${btnClass}`).forEach(b => {
    b.classList.toggle('selected', b.getAttribute(attr) === value);
  });
}

function initColorPicker() {
  const input = document.getElementById('favoriteColor');
  const label = document.getElementById('colorLabel');
  if (!input || !label) return;
  input.addEventListener('input', () => label.textContent = input.value);
}

// ==================== Modal ====================
function openModal() {
  document.getElementById('deleteModal').classList.add('active');
  document.getElementById('confirmDeleteBtn').onclick = async () => {
    if (deleteCallback) await deleteCallback();
    closeModal();
  };
}

function closeModal() {
  document.getElementById('deleteModal').classList.remove('active');
  deleteCallback = null;
}
window.closeModal = closeModal;

// ==================== Toast ====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = { success: '🎉', error: '😢', info: '💭' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ==================== Confetti ====================
function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';

  const colors = ['#ff6b9d','#a855f7','#fbbf24','#f472b6','#6ee7b7','#fb7185','#c084fc'];
  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    w: Math.random() * 12 + 5,
    h: Math.random() * 6 + 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    vy: Math.random() * 4 + 2,
    vx: (Math.random() - 0.5) * 3,
    rot: Math.random() * 360,
    rotV: (Math.random() - 0.5) * 6
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      p.y += p.vy;
      p.x += p.vx;
      p.rot += p.rotV;
    });
    frame++;
    if (frame < 160) requestAnimationFrame(draw);
    else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
    }
  }
  draw();
}

// ==================== Helpers ====================
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
