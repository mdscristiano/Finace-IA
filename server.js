// ==========================================
// IMPORTAÇÃO DE BIBLIOTECAS
// ==========================================
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import sqlite3 from "sqlite3";
import bodyParser from "body-parser";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import OpenAI from "openai"; // ✅ NOVO

const app = express();

// ==========================================
// CONFIGURAÇÕES INICIAIS
// ==========================================
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Banco SQLite
const db = new sqlite3.Database("./db/database.db");

// JWT
const SECRET = "segredo123";

// ==========================================
// OPENAI CONFIG
// ==========================================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ==========================================
// BANCO DE DADOS
// ==========================================
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      senha TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS gastos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria TEXT,
      valor REAL,
      user_id INTEGER
    )
  `);

  db.all(`PRAGMA table_info(gastos)`, [], (err, columns) => {
    if (err) return;
    const hasUserId = columns.some((col) => col.name === "user_id");
    if (!hasUserId) {
      db.run(`ALTER TABLE gastos ADD COLUMN user_id INTEGER`);
    }
  });
});

// ==========================================
// AUTH
// ==========================================
app.post("/register", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha)
    return res.status(400).json({ erro: "Email e senha são obrigatórios" });

  try {
    const hash = await bcrypt.hash(senha, 10);

    db.run(
      "INSERT INTO users (email, senha) VALUES (?, ?)",
      [email, hash],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE"))
            return res.status(400).json({ erro: "Email já cadastrado" });

          return res.status(500).json({ erro: err.message });
        }

        res.json({ ok: true, user_id: this.lastID });
      }
    );
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

app.post("/login", (req, res) => {
  const { email, senha } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (!user) return res.status(401).json({ erro: "Usuário não encontrado" });

    const valid = await bcrypt.compare(senha, user.senha);
    if (!valid) return res.status(401).json({ erro: "Senha inválida" });

    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: "1d" });

    res.json({ ok: true, token, user_id: user.id });
  });
});

// ==========================================
// DADOS
// ==========================================
app.post("/gastos", (req, res) => {
  const { user_id, categoria, valor } = req.body;

  db.run(
    "INSERT INTO gastos (user_id, categoria, valor) VALUES (?, ?, ?)",
    [user_id, categoria, valor],
    function (err) {
      if (err) return res.status(500).json({ erro: err.message });

      res.json({ ok: true, gasto_id: this.lastID });
    }
  );
});

app.get("/dashboard/:user_id", (req, res) => {
  const { user_id } = req.params;

  db.all(
    "SELECT categoria, SUM(valor) as total FROM gastos WHERE user_id = ? GROUP BY categoria",
    [user_id],
    (err, rows) => {
      if (err) return res.status(500).json({ erro: err.message });

      const totalGeral = rows.reduce((acc, r) => acc + Number(r.total), 0);

      const resultado = rows.map((r) => ({
        categoria: r.categoria,
        total: Number(r.total),
        percentual:
          totalGeral > 0
            ? ((r.total / totalGeral) * 100).toFixed(2)
            : "0.00"
      }));

      res.json(resultado);
    }
  );
});

// ==========================================
// IA - OPENAI 🔥
// ==========================================
app.post("/analisar", async (req, res) => {
  const dados = req.body;

  if (!dados || dados.length === 0) {
    return res.status(400).json({ erro: "Nenhum dado enviado" });
  }

  try {
    console.log("🔑 OPENAI:", process.env.OPENAI_API_KEY ? "OK" : "ERRO");

    const prompt = `
Você é um consultor financeiro inteligente.

Analise os dados:
${JSON.stringify(dados)}

Responda com:
1. Situação geral
2. Problema principal
3. Ação prática

Máximo 3 frases, linguagem simples.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });

    res.json({
      mensagem: response.choices[0].message.content
    });

  } catch (error) {
    console.error("🚨 ERRO OPENAI:", error);

    res.status(500).json({
      erro: "Erro na IA",
      detalhe: error.message
    });
  }
});

// ==========================================
app.listen(3000, () => {
  console.log("🚀 Finance IA rodando em http://localhost:3000");
});