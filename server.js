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
// BANCO DE DADOS (ATUALIZADO)
// ==========================================
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      senha TEXT
    )
  `);

  // ATUALIZADO: Tabela agora possui descricao e data
  db.run(`
    CREATE TABLE IF NOT EXISTS gastos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria TEXT,
      descricao TEXT,
      valor REAL,
      data TEXT,
      user_id INTEGER
    )
  `);

  // Migração automática: Adiciona as colunas novas caso a tabela antiga já exista
  db.all(`PRAGMA table_info(gastos)`, [], (err, columns) => {
    if (err) return;
    
    const hasUserId = columns.some((col) => col.name === "user_id");
    if (!hasUserId) db.run(`ALTER TABLE gastos ADD COLUMN user_id INTEGER`);

    const hasDescricao = columns.some((col) => col.name === "descricao");
    if (!hasDescricao) db.run(`ALTER TABLE gastos ADD COLUMN descricao TEXT`);

    const hasData = columns.some((col) => col.name === "data");
    if (!hasData) db.run(`ALTER TABLE gastos ADD COLUMN data TEXT`);
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
// DADOS (ATUALIZADO)
// ==========================================
app.post("/gastos", (req, res) => {
  // ATUALIZADO: Recebendo descricao e data do frontend
  const { user_id, categoria, descricao, valor, data } = req.body;

  db.run(
    "INSERT INTO gastos (user_id, categoria, descricao, valor, data) VALUES (?, ?, ?, ?, ?)",
    [user_id, categoria, descricao, valor, data],
    function (err) {
      if (err) return res.status(500).json({ erro: err.message });

      res.json({ ok: true, gasto_id: this.lastID });
    }
  );
});

app.get("/dashboard/:user_id", (req, res) => {
  const { user_id } = req.params;

  // ATUALIZADO: Retorna os lançamentos detalhados em vez de agrupá-los no banco.
  // Usamos 'valor as total' para não quebrar a lógica antiga antes de atualizarmos o frontend.
  db.all(
    "SELECT id, categoria, descricao, valor as total, data FROM gastos WHERE user_id = ? ORDER BY data DESC",
    [user_id],
    (err, rows) => {
      if (err) return res.status(500).json({ erro: err.message });
      
      res.json(rows);
    }
  );
});

// ==========================================
// IA - OPENAI 🔥 (ATUALIZADO PARA PERSONALIDADE)
// ==========================================
app.post("/analisar", async (req, res) => {
  // NOVO: Recebendo a variável tom_ia
  const { transacoes, saldoAtual, objetivoMeta, tom_ia } = req.body;

  if (!transacoes || transacoes.length === 0) {
    return res.status(400).json({ erro: "Nenhum dado enviado" });
  }

  try {
    const percentagem = ((saldoAtual / objetivoMeta) * 100).toFixed(1);
    const faltam = objetivoMeta - saldoAtual;

    // NOVO: Injetando o tom no Prompt
    const prompt = `
Você é ${tom_ia || "um consultor financeiro inteligente"}.

DADOS FINANCEIROS:
${JSON.stringify(transacoes)}

CONTEXTO DA META:
- Saldo Atual: R$ ${saldoAtual}
- Objetivo: R$ ${objetivoMeta}
- Progresso: ${percentagem}% alcançado.
- Faltam: R$ ${faltam} para atingir a meta.

Responda com:
1. Uma análise rápida do saldo vs meta.
2. Uma dica prática baseada nas transações para economizar e chegar mais rápido no objetivo.

Máximo 3 frases. Mantenha-se estritamente fiel à sua personalidade definida acima.
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