const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

function getLanUrl(port) {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return `http://${iface.address}:${port}`;
      }
    }
  }
  return null;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✨ Motivational quotes for the dashboard
const quotes = [
  { text: "She believed she could, so she did.", author: "R.S. Grey" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "Be the change that you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "Well-behaved women seldom make history.", author: "Laurel Thatcher Ulrich" },
  { text: "A girl should be two things: who and what she wants.", author: "Coco Chanel" },
  { text: "Think like a queen. A queen is not afraid to fail.", author: "Oprah Winfrey" },
  { text: "The most effective way to do it, is to do it.", author: "Amelia Earhart" },
  { text: "Life is tough, my darling, but so are you.", author: "Stephanie Bennett-Henry" },
  { text: "You educate a woman; you educate a generation.", author: "Brigham Young" },
  { text: "In a gentle way, you can shake the world.", author: "Mahatma Gandhi" },
  { text: "Stay close to anything that makes you glad you are alive.", author: "Hafiz" },
  { text: "Bloom where you are planted.", author: "Unknown" },
  { text: "Stars can't shine without darkness.", author: "D.H. Sidebottom" }
];

// 🎀 Fun titles based on GPA
function getStudentTitle(gpa) {
  if (gpa >= 3.9) return { emoji: '🌟', label: 'Superstar' };
  if (gpa >= 3.5) return { emoji: '💎', label: 'Diamond Scholar' };
  if (gpa >= 3.0) return { emoji: '🌸', label: 'Blossoming Mind' };
  if (gpa >= 2.5) return { emoji: '🦋', label: 'Rising Butterfly' };
  if (gpa >= 2.0) return { emoji: '🌱', label: 'Growing Seed' };
  return { emoji: '💪', label: 'Keep Going!' };
}

// Database setup
const db = new sqlite3.Database(path.join(__dirname, 'students.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('✨ Connected to SQLite database.');
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS students (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          date_of_birth TEXT,
          gender TEXT,
          course TEXT NOT NULL,
          enrollment_date TEXT DEFAULT (date('now')),
          gpa REAL DEFAULT 0.0,
          status TEXT DEFAULT 'Active',
          phone TEXT,
          favorite_color TEXT DEFAULT '#ff69b4',
          bio TEXT,
          hobby TEXT,
          mood TEXT DEFAULT '😊',
          profile_emoji TEXT DEFAULT '👩‍🎓',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error creating table:', err.message);
        } else {
          console.log('🎀 Students table ready.');
          // Idempotent column adds for existing DBs
          const newCols = [
            "ALTER TABLE students ADD COLUMN phone TEXT",
            "ALTER TABLE students ADD COLUMN favorite_color TEXT DEFAULT '#ff69b4'",
            "ALTER TABLE students ADD COLUMN bio TEXT",
            "ALTER TABLE students ADD COLUMN hobby TEXT",
            "ALTER TABLE students ADD COLUMN mood TEXT DEFAULT '😊'",
            "ALTER TABLE students ADD COLUMN profile_emoji TEXT DEFAULT '👩‍🎓'"
          ];
          newCols.forEach(sql => db.run(sql, () => {}));
        }
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          emoji TEXT DEFAULT '📝',
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
      `);
    });
  }
});

// Promisify
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
}
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// ==================== API ROUTES ====================

// 🌈 Random motivational quote
app.get('/api/quote', (req, res) => {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  res.json({ success: true, data: quote });
});

// GET /api/students
app.get('/api/students', async (req, res) => {
  try {
    const { search, course, status, mood, sort, order } = req.query;
    let sql = 'SELECT * FROM students WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR hobby LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    if (course) { sql += ' AND course = ?'; params.push(course); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (mood) { sql += ' AND mood = ?'; params.push(mood); }

    const validCols = ['first_name','last_name','email','course','gpa','enrollment_date','created_at','mood'];
    const sortCol = validCols.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortCol} ${sortOrder}`;

    const students = await dbAll(sql, params);
    const enriched = students.map(s => ({ ...s, title: getStudentTitle(s.gpa) }));
    res.json({ success: true, data: enriched, count: enriched.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/students/stats
app.get('/api/students/stats', async (req, res) => {
  try {
    const total = await dbGet('SELECT COUNT(*) as count FROM students');
    const active = await dbGet("SELECT COUNT(*) as count FROM students WHERE status = 'Active'");
    const graduated = await dbGet("SELECT COUNT(*) as count FROM students WHERE status = 'Graduated'");
    const avgGpa = await dbGet('SELECT AVG(gpa) as avg FROM students');
    const topStudent = await dbGet('SELECT * FROM students ORDER BY gpa DESC LIMIT 1');
    const byCourse = await dbAll('SELECT course, COUNT(*) as count FROM students GROUP BY course ORDER BY count DESC');
    const byGender = await dbAll('SELECT gender, COUNT(*) as count FROM students GROUP BY gender');
    const byMood = await dbAll('SELECT mood, COUNT(*) as count FROM students GROUP BY mood ORDER BY count DESC');
    const byStatus = await dbAll('SELECT status, COUNT(*) as count FROM students GROUP BY status');
    const recentCount = await dbGet("SELECT COUNT(*) as count FROM students WHERE created_at >= datetime('now', '-7 days')");

    res.json({
      success: true,
      data: {
        totalStudents: total.count,
        activeStudents: active.count,
        graduatedStudents: graduated.count,
        averageGpa: avgGpa.avg ? parseFloat(avgGpa.avg.toFixed(2)) : 0,
        topStudent: topStudent ? { ...topStudent, title: getStudentTitle(topStudent.gpa) } : null,
        byCourse, byGender, byMood, byStatus,
        newThisWeek: recentCount.count
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/students/:id
app.get('/api/students/:id', async (req, res) => {
  try {
    const student = await dbGet('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    const notes = await dbAll('SELECT * FROM notes WHERE student_id = ? ORDER BY created_at DESC', [req.params.id]);
    student.title = getStudentTitle(student.gpa);
    res.json({ success: true, data: { ...student, notes } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/students
app.post('/api/students', async (req, res) => {
  try {
    const { first_name, last_name, email, date_of_birth, gender, course, gpa, status, phone, favorite_color, bio, hobby, mood, profile_emoji } = req.body;

    if (!first_name || !last_name || !email || !course)
      return res.status(400).json({ success: false, error: 'First name, last name, email, and course are required.' });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ success: false, error: 'Invalid email format.' });

    if (gpa !== undefined && gpa !== null && gpa !== '' && (gpa < 0 || gpa > 4))
      return res.status(400).json({ success: false, error: 'GPA must be between 0.0 and 4.0.' });

    const result = await dbRun(
      `INSERT INTO students (first_name, last_name, email, date_of_birth, gender, course, gpa, status, phone, favorite_color, bio, hobby, mood, profile_emoji)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, email, date_of_birth || null, gender || null, course,
       gpa || 0.0, status || 'Active', phone || null, favorite_color || '#ff69b4',
       bio || null, hobby || null, mood || '😊', profile_emoji || '👩‍🎓']
    );

    const student = await dbGet('SELECT * FROM students WHERE id = ?', [result.lastID]);
    student.title = getStudentTitle(student.gpa);
    res.status(201).json({ success: true, data: student, message: '🎉 Student added successfully!' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed'))
      return res.status(409).json({ success: false, error: 'A student with this email already exists.' });
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/students/:id
app.put('/api/students/:id', async (req, res) => {
  try {
    const { first_name, last_name, email, date_of_birth, gender, course, gpa, status, phone, favorite_color, bio, hobby, mood, profile_emoji } = req.body;

    if (!first_name || !last_name || !email || !course)
      return res.status(400).json({ success: false, error: 'First name, last name, email, and course are required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ success: false, error: 'Invalid email format.' });
    if (gpa !== undefined && gpa !== null && gpa !== '' && (gpa < 0 || gpa > 4))
      return res.status(400).json({ success: false, error: 'GPA must be between 0.0 and 4.0.' });

    const existing = await dbGet('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Student not found.' });

    await dbRun(
      `UPDATE students SET first_name=?, last_name=?, email=?, date_of_birth=?, gender=?, course=?, gpa=?, status=?, phone=?, favorite_color=?, bio=?, hobby=?, mood=?, profile_emoji=?, updated_at=datetime('now') WHERE id=?`,
      [first_name, last_name, email, date_of_birth || null, gender || null, course,
       gpa || 0.0, status || 'Active', phone || null, favorite_color || '#ff69b4',
       bio || null, hobby || null, mood || '😊', profile_emoji || '👩‍🎓', req.params.id]
    );

    const student = await dbGet('SELECT * FROM students WHERE id = ?', [req.params.id]);
    student.title = getStudentTitle(student.gpa);
    res.json({ success: true, data: student, message: '✨ Student updated!' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed'))
      return res.status(409).json({ success: false, error: 'A student with this email already exists.' });
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/students/:id
app.delete('/api/students/:id', async (req, res) => {
  try {
    const existing = await dbGet('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Student not found.' });
    await dbRun('DELETE FROM notes WHERE student_id = ?', [req.params.id]);
    await dbRun('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Student removed.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/students - Bulk delete
app.delete('/api/students', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, error: 'Provide an array of student IDs.' });
    const ph = ids.map(() => '?').join(',');
    await dbRun(`DELETE FROM notes WHERE student_id IN (${ph})`, ids);
    const result = await dbRun(`DELETE FROM students WHERE id IN (${ph})`, ids);
    res.json({ success: true, message: `${result.changes} student(s) removed.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/students/:id/notes
app.post('/api/students/:id/notes', async (req, res) => {
  try {
    const { content, emoji } = req.body;
    if (!content) return res.status(400).json({ success: false, error: 'Note content is required.' });
    const student = await dbGet('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found.' });
    const result = await dbRun('INSERT INTO notes (student_id, content, emoji) VALUES (?, ?, ?)', [req.params.id, content, emoji || '📝']);
    const note = await dbGet('SELECT * FROM notes WHERE id = ?', [result.lastID]);
    res.status(201).json({ success: true, data: note, message: '📝 Note added!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/notes/:id
app.delete('/api/notes/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM notes WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Note deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve frontend
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, HOST, () => {
  const localUrl = `http://127.0.0.1:${PORT}`;
  const lanUrl = getLanUrl(PORT);
  console.log(`\n🌸 ═══════════════════════════════════════════`);
  console.log(`   ✨ Student Management System is running!`);
  console.log(`   🌐 Local: ${localUrl}`);
  if (lanUrl) {
    console.log(`   🌍 Network: ${lanUrl}`);
  }
  console.log(`🌸 ═══════════════════════════════════════════\n`);
});

process.on('SIGINT', () => {
  db.close(() => { console.log('\n🌙 Goodbye!'); process.exit(0); });
});
