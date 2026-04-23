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
import OpenAI from "openai";
import multer from "multer";      // NOVO: Para receber upload de ficheiros (CSV)
import csv from "csv-parser";     // NOVO: Para ler o extrato bancário
import fs from "fs";              // NOVO: Para manipular ficheiros do sistema

const app = express();

// Configuração do Multer (salva temporariamente na pasta uploads)
const upload = multer({ dest: 'uploads/' });

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
// MIDDLEWARE DE SEGURANÇA
// ==========================================
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) return res.status(401).json({ erro: "Acesso negado. Token não fornecido." });

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ erro: "Token inválido ou expirado." });
    req.user_id = decoded.id; 
    next();
  });
};

// ==========================================
// BANCO DE DADOS (ATUALIZADO COM CONTAS E ENTIDADES)
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
      descricao TEXT,
      valor REAL,
      data TEXT,
      tipo TEXT DEFAULT 'despesa',
      status TEXT DEFAULT 'pago',
      data_vencimento TEXT,
      conta TEXT DEFAULT 'Carteira',     -- NOVO: Ex: Nubank, Caixa Empresa, Dinheiro
      entidade TEXT DEFAULT 'Geral',     -- NOVO: Nome do Cliente ou Fornecedor
      user_id INTEGER
    )
  `);

  // Migração automática para atualizar tabelas antigas sem perder dados
  db.all(`PRAGMA table_info(gastos)`, [], (err, columns) => {
    if (err) return;
    
    const addColumnIfNotExists = (colName, definition) => {
      if (!columns.some((col) => col.name === colName)) {
        db.run(`ALTER TABLE gastos ADD COLUMN ${colName} ${definition}`);
      }
    };

    addColumnIfNotExists("user_id", "INTEGER");
    addColumnIfNotExists("descricao", "TEXT");
    addColumnIfNotExists("data", "TEXT");
    addColumnIfNotExists("tipo", "TEXT DEFAULT 'despesa'");
    addColumnIfNotExists("status", "TEXT DEFAULT 'pago'");
    addColumnIfNotExists("data_vencimento", "TEXT");
    addColumnIfNotExists("conta", "TEXT DEFAULT 'Carteira'");
    addColumnIfNotExists("entidade", "TEXT DEFAULT 'Geral'");
  });
});

// ==========================================
// AUTH (PÚBLICAS)
// ==========================================
app.post("/register", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) return res.status(400).json({ erro: "Email e senha são obrigatórios" });

  try {
    const hash = await bcrypt.hash(senha, 10);
    db.run("INSERT INTO users (email, senha) VALUES (?, ?)", [email, hash], function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) return res.status(400).json({ erro: "Email já cadastrado" });
        return res.status(500).json({ erro: err.message });
      }
      res.json({ ok: true, user_id: this.lastID });
    });
  } catch (error) { res.status(500).json({ erro: error.message }); }
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
// DADOS (PROTEGIDAS)
// ==========================================
app.post("/gastos", verificarToken, (req, res) => {
  const { categoria, descricao, valor, data, tipo, status, data_vencimento, conta, entidade } = req.body;
  
  if (!valor || isNaN(valor) || valor <= 0) return res.status(400).json({ erro: "Valor inválido." });

  db.run(
    "INSERT INTO gastos (user_id, categoria, descricao, valor, data, tipo, status, data_vencimento, conta, entidade) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [req.user_id, categoria, descricao, valor, data, tipo || 'despesa', status || 'pago', data_vencimento || data, conta || 'Carteira', entidade || 'Geral'],
    function (err) {
      if (err) return res.status(500).json({ erro: err.message });
      res.json({ ok: true, gasto_id: this.lastID });
    }
  );
});

app.get("/dashboard", verificarToken, (req, res) => {
  db.run(
    `UPDATE gastos SET status = 'atrasado' WHERE status = 'pendente' AND data_vencimento < date('now', 'localtime') AND user_id = ?`,
    [req.user_id],
    (err) => {
      if (err) console.error("Erro ao verificar atrasos:", err);
      db.all("SELECT * FROM gastos WHERE user_id = ? ORDER BY data_vencimento DESC", [req.user_id], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        // Mapeando "valor" para "total" para não quebrar o dashboard.js antigo
        res.json(rows.map(r => ({ ...r, total: r.valor })));
      });
    }
  );
});

app.put("/gastos/:id/pagar", verificarToken, (req, res) => {
  db.run("UPDATE gastos SET status = 'pago' WHERE id = ? AND user_id = ?", [req.params.id, req.user_id], function(err) {
    if (err) return res.status(500).json({ erro: err.message });
    if (this.changes === 0) return res.status(404).json({ erro: "Transação não encontrada." });
    res.json({ ok: true, mensagem: "Conta paga com sucesso!" });
  });
});

// ==========================================
// INTELIGÊNCIA CONTÁBIL: DRE (NOVO)
// ==========================================
app.get("/relatorio/dre", verificarToken, (req, res) => {
  db.all("SELECT categoria, tipo, valor FROM gastos WHERE user_id = ? AND status = 'pago'", [req.user_id], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    
    let dre = { receitaBruta: 0, impostos: 0, custosFixos: 0, custosVariaveis: 0 };
    
    rows.forEach(r => {
      if (r.tipo === 'receita') dre.receitaBruta += r.valor;
      else if (r.categoria.toLowerCase().includes('imposto')) dre.impostos += r.valor;
      else if (r.categoria.toLowerCase().includes('equipamento') || r.categoria.toLowerCase().includes('serviço') || r.categoria.toLowerCase().includes('software')) dre.custosVariaveis += r.valor;
      else dre.custosFixos += r.valor;
    });

    dre.receitaLiquida = dre.receitaBruta - dre.impostos;
    dre.lucroLiquido = dre.receitaLiquida - dre.custosFixos - dre.custosVariaveis;
    dre.margem = dre.receitaBruta > 0 ? ((dre.lucroLiquido / dre.receitaBruta) * 100).toFixed(1) : 0;
    
    res.json(dre);
  });
});

// ==========================================
// CONCILIAÇÃO BANCÁRIA: UPLOAD CSV (NOVO)
// ==========================================
app.post("/upload-csv", verificarToken, upload.single('ficheiro'), (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Nenhum arquivo enviado." });

  const transacoes = [];
  fs.createReadStream(req.file.path)
    .pipe(csv({ separator: ';' })) // Lê o arquivo separado por ;
    .on('data', (row) => {
      // Tenta extrair o valor da coluna "Valor" e converte vírgula para ponto
      const valorStr = row.Valor ? row.Valor.replace(',', '.') : '0';
      const valor = parseFloat(valorStr);
      
      if(valor !== 0 && !isNaN(valor)) {
        transacoes.push({
          user_id: req.user_id,
          descricao: row.Descricao || 'Lançamento via Extrato',
          valor: Math.abs(valor),
          data: row.Data || new Date().toISOString().split('T')[0],
          tipo: valor > 0 ? 'receita' : 'despesa',
          categoria: 'Importado',
          conta: 'Conta Banco',
          status: 'pago'
        });
      }
    })
    .on('end', () => {
      fs.unlinkSync(req.file.path); // Limpa o arquivo temporário

      if (transacoes.length === 0) {
        return res.status(400).json({ erro: "Nenhuma transação válida encontrada no CSV." });
      }

      // Insere tudo no banco de dados de uma vez
      const stmt = db.prepare("INSERT INTO gastos (user_id, descricao, valor, data, tipo, categoria, conta, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      transacoes.forEach(t => {
        stmt.run(t.user_id, t.descricao, t.valor, t.data, t.tipo, t.categoria, t.conta, t.status);
      });
      stmt.finalize();

      res.json({ ok: true, importados: transacoes.length });
    });
});

// ==========================================
// INTELIGÊNCIA CONTÁBIL PARA MEI (PREVISÃO IMPOSTO)
// ==========================================
app.get("/previsao-imposto/:mes", verificarToken, (req, res) => {
  const { mes } = req.params; 
  db.get(
    `SELECT SUM(valor) as faturamento_total FROM gastos WHERE user_id = ? AND tipo = 'receita' AND data LIKE ? AND status = 'pago'`, 
    [req.user_id, `${mes}%`], 
    (err, row) => {
      if (err) return res.status(500).json({ erro: err.message });
      const faturamento = row.faturamento_total || 0;
      res.json({ faturamento, impostoEstimado: faturamento * 0.04 });
    }
  );
});

// ==========================================
// IA - OPENAI (PROTEGIDA)
// ==========================================
app.post("/analisar", verificarToken, async (req, res) => {
  const { transacoes, saldoAtual, objetivoMeta, tom_ia } = req.body;

  if (!transacoes || transacoes.length === 0) return res.status(400).json({ erro: "Nenhum dado enviado" });

  try {
    const percentagem = ((saldoAtual / objetivoMeta) * 100).toFixed(1);
    const faltam = objetivoMeta - saldoAtual;

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

Máximo 3 frases. Mantenha-se estritamente fiel à sua personalidade.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });

    res.json({ mensagem: response.choices[0].message.content });
  } catch (error) {
    console.error("🚨 ERRO OPENAI:", error);
    res.status(500).json({ erro: "Erro na IA", detalhe: error.message });
  }
});

// ==========================================
app.listen(3000, () => {
  console.log("🚀 Finance IA rodando em http://localhost:3000");
});