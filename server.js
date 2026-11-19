require('dotenv').config();
const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

// Koneksi database MySQL (mengambil konfigurasi dari file .env)
const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Middleware
app.use(express.json());                                  // baca body JSON
app.use(express.static(path.join(__dirname, 'public')));  // sajikan index.html

// Validasi sederhana
function validasi(b) {
  const data = {
    nim: String(b.nim ?? '').trim(),
    nama: String(b.nama ?? '').trim(),
    jurusan: String(b.jurusan ?? '').trim(),
    angkatan: Number(b.angkatan),
    email: String(b.email ?? '').trim() || null,
  };
  const errors = [];
  if (!data.nim) errors.push('NIM wajib diisi');
  if (!data.nama) errors.push('Nama wajib diisi');
  if (!data.jurusan) errors.push('Jurusan wajib diisi');
  if (!Number.isInteger(data.angkatan)) errors.push('Angkatan harus berupa angka');
  return { data, errors };
}

// Route CRUD

// READ semua
app.get('/api/mahasiswa', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM mahasiswa ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Kesalahan server' });
  }
});

// READ satu
app.get('/api/mahasiswa/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM mahasiswa WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Data tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Kesalahan server' });
  }
});

// CREATE
app.post('/api/mahasiswa', async (req, res) => {
  const { data, errors } = validasi(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(', ') });
  try {
    const [info] = await db.query(
      `INSERT INTO mahasiswa (nim, nama, jurusan, angkatan, email)
       VALUES (?, ?, ?, ?, ?)`,
      [data.nim, data.nama, data.jurusan, data.angkatan, data.email]
    );
    res.status(201).json({ id: info.insertId, ...data });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'NIM sudah terdaftar' });
    res.status(500).json({ error: 'Kesalahan server' });
  }
});

// UPDATE
app.put('/api/mahasiswa/:id', async (req, res) => {
  const { data, errors } = validasi(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(', ') });
  try {
    const [info] = await db.query(
      `UPDATE mahasiswa SET nim=?, nama=?, jurusan=?, angkatan=?, email=? WHERE id=?`,
      [data.nim, data.nama, data.jurusan, data.angkatan, data.email, req.params.id]
    );
    if (info.affectedRows === 0) return res.status(404).json({ error: 'Data tidak ditemukan' });
    res.json({ id: Number(req.params.id), ...data });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'NIM sudah terdaftar' });
    res.status(500).json({ error: 'Kesalahan server' });
  }
});

// DELETE
app.delete('/api/mahasiswa/:id', async (req, res) => {
  try {
    const [info] = await db.query('DELETE FROM mahasiswa WHERE id = ?', [req.params.id]);
    if (info.affectedRows === 0) return res.status(404).json({ error: 'Data tidak ditemukan' });
    res.json({ message: 'Data berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: 'Kesalahan server' });
  }
});

// Jalankan
app.listen(PORT, () => console.log(`Server jalan di http://localhost:${PORT}`));