// ==========================================
// 1. O PORTEIRO (Segurança)
// ==========================================
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = '/'; 
}

function getUserId() {
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload)); 
        return decoded.id; 
    } catch (e) {
        localStorage.removeItem('token');
        window.location.href = '/';
    }
}

const userId = getUserId();

// ==========================================
// VARIÁVEIS GLOBAIS E FUNÇÕES AUXILIARES
// ==========================================
let graficoPizza = null;
let graficoFluxo = null;
let graficoSaldo = null;
let graficoPizzaGrande = null; 

let totalReceitas = 0;
let totalGastos = 0;
let transacoesGlobais = [];
let privacidadeAtiva = false; 

// GESTÃO DE METAS (PORTFÓLIO)
let metasGlobais = JSON.parse(localStorage.getItem('metas_financeiras')) || [
    { id: 1, nome: "Reserva de Emergência", objetivo: 5000, atual: 0, icone: "🎯", cor: "#4facfe" }
];

// VARIÁVEIS DE NOTIFICAÇÃO
let historicoNotificacoes = JSON.parse(localStorage.getItem('notificacoes_historico')) || [];
let painelNotifAberto = false;

function salvarMetas() {
    localStorage.setItem('metas_financeiras', JSON.stringify(metasGlobais));
}

const formatarMoeda = (valor) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// ==========================================
// NAVEGAÇÃO SPA (Single Page Application)
// ==========================================
function navegarPara(idDaSeccao) {
    document.querySelectorAll('.spa-section').forEach(section => {
        section.classList.remove('active');
    });

    const novaSeccao = document.getElementById(idDaSeccao);
    if (novaSeccao) {
        novaSeccao.classList.add('active');
    }

    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });

    const btnAtivo = document.querySelector(`[onclick="navegarPara('${idDaSeccao}')"]`);
    if (btnAtivo) {
        btnAtivo.classList.add('active');
    }
}

// ==========================================
// ANIMAÇÃO DE CONTA-QUILÓMETROS
// ==========================================
function animarNumero(idElemento, valorFinal) {
    const elemento = document.getElementById(idElemento);
    if (!elemento) return;

    elemento.setAttribute('data-valor-original', formatarMoeda(valorFinal));

    if (privacidadeAtiva) {
        elemento.innerText = 'R$ ••••••';
        return;
    }

    if (valorFinal === 0) {
        elemento.innerText = formatarMoeda(0);
        return;
    }

    let valorAtual = 0;
    const duracao = 800; 
    const fps = 30;
    const totalPassos = duracao / (1000 / fps);
    const incremento = valorFinal / totalPassos;
    let passoAtual = 0;

    const intervalo = setInterval(() => {
        valorAtual += incremento;
        passoAtual++;

        if (passoAtual >= totalPassos) {
            valorAtual = valorFinal;
            clearInterval(intervalo);
        }

        elemento.innerText = formatarMoeda(valorAtual);
    }, 1000 / fps);
}

// ==========================================
// 2. BUSCAR DADOS DO BANCO
// ==========================================
async function carregarDashboard() {
    try {
        const resposta = await fetch(`/dashboard/${userId}`);
        const dados = await resposta.json();

        if (resposta.ok) {
            transacoesGlobais = dados;
            aplicarFiltro();
        } else {
            console.error("Erro ao carregar dados:", dados.erro);
        }
    } catch (erro) {
        console.error("Erro de conexão:", erro);
    }
}

// ==========================================
// SISTEMA DE FILTRO DE TEMPO
// ==========================================
function aplicarFiltro() {
    const dropdownFiltro = document.getElementById('filtro-tempo');
    if (!dropdownFiltro) return;

    const filtro = dropdownFiltro.value;
    const hoje = new Date();

    const dadosFiltrados = transacoesGlobais.filter(item => {
        if (filtro === 'tudo') return true;
        if (!item.data) return true;

        const dataItem = new Date(item.data + 'T12:00:00');
        const diffTempo = Math.abs(hoje - dataItem);
        const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));

        if (filtro === 'semanal') return diffDias <= 7;
        if (filtro === 'mensal') return dataItem.getMonth() === hoje.getMonth() && dataItem.getFullYear() === hoje.getFullYear();
        if (filtro === 'trimestral') return diffDias <= 90;
        if (filtro === 'semestral') return diffDias <= 180;
        if (filtro === 'anual') return dataItem.getFullYear() === hoje.getFullYear();

        return true;
    });

    atualizarTela(dadosFiltrados);
}

// ==========================================
// 3. ATUALIZAR A TELA (Números e Tabela)
// ==========================================
function atualizarTela(dadosParaExibir) {
    totalReceitas = 0;
    totalGastos = 0;

    const somaCategorias = {};
    const categoriasGastos = [];
    const valoresGastos = [];

    const tabela = document.getElementById("tabela-lancamentos");
    if (tabela) tabela.innerHTML = "";

    dadosParaExibir.forEach(item => {
        if (item.categoria.includes("Receita")) {
            totalReceitas += item.total;
        } else {
            totalGastos += item.total;
            const nomeCategoria = item.categoria.replace('Gasto - ', '');
            somaCategorias[nomeCategoria] = (somaCategorias[nomeCategoria] || 0) + item.total;
        }

        let dataFormatada = "Sem Data";
        if (item.data) {
            const dataObj = new Date(item.data + 'T12:00:00');
            dataFormatada = dataObj.toLocaleDateString('pt-BR');
        }

        if (tabela) {
            tabela.innerHTML += `
                <tr>
                    <td class="desc-cell">
                        <div class="icon-box ${item.categoria.includes('Receita') ? 'icon-receita' : 'icon-gasto'}">
                            <i class="fa-solid ${item.categoria.includes('Receita') ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                        </div>
                        ${item.descricao || 'Lançamento Antigo'}
                    </td>
                    <td><span class="badge ${item.categoria.includes('Receita') ? 'badge-success' : 'badge-danger'}">${item.categoria}</span></td>
                    <td style="color: ${item.categoria.includes('Receita') ? 'var(--success)' : 'var(--danger)'};">${formatarMoeda(item.total)}</td>
                    <td style="color: var(--muted);">${dataFormatada}</td>
                </tr>
            `;
        }
    });

    for (const [cat, valor] of Object.entries(somaCategorias)) {
        categoriasGastos.push(cat);
        valoresGastos.push(valor);
    }

    const saldoFinal = totalReceitas - totalGastos;

    const totalMovimentacao = totalReceitas + totalGastos;
    let percReceita = 0;
    let percGasto = 0;

    if (totalMovimentacao > 0) {
        percReceita = (totalReceitas / totalMovimentacao) * 100;
        percGasto = (totalGastos / totalMovimentacao) * 100;
    }

    const badgeReceita = document.getElementById("badge-receita");
    const badgeGasto = document.getElementById("badge-gasto");

    if (badgeReceita) badgeReceita.innerHTML = `<i class="fa-solid fa-caret-up"></i> ${percReceita.toFixed(1).replace('.', ',')}%`;
    if (badgeGasto) badgeGasto.innerHTML = `<i class="fa-solid fa-caret-down"></i> ${percGasto.toFixed(1).replace('.', ',')}%`;

    atualizarMetaHome();

    animarNumero("totalReceita", totalReceitas);
    animarNumero("totalGasto", totalGastos);
    animarNumero("saldo", saldoFinal);

    desenharGraficos(categoriasGastos, valoresGastos, totalReceitas, totalGastos, saldoFinal);
}
// ==========================================
// MENU DE PERFIL (TOP BAR)
// ==========================================
function toggleProfileMenu() {
    const profileSection = document.querySelector('.profile-section');
    if (profileSection) {
        profileSection.classList.toggle('active');
    }
}

// Fechar o menu se clicar fora dele
document.addEventListener('click', function(event) {
    const profileSection = document.querySelector('.profile-section');
    if (profileSection && !profileSection.contains(event.target)) {
        profileSection.classList.remove('active');
    }
});
// ==========================================
// MODO PRIVACIDADE
// ==========================================
function togglePrivacidade() {
    privacidadeAtiva = !privacidadeAtiva;
    const elementosValores = [
        document.getElementById('meta-valor-atual'),
        document.getElementById('totalReceita'),
        document.getElementById('totalGasto'),
        document.getElementById('saldo')
    ];

    elementosValores.forEach(el => {
        if (el) {
            if (privacidadeAtiva) {
                el.innerText = 'R$ ••••••';
            } else {
                el.innerText = el.getAttribute('data-valor-original');
            }
        }
    });
}

// ==========================================
// 4. DESENHAR OS GRÁFICOS (Chart.js)
// ==========================================
function desenharGraficos(labelsPizza, dadosPizza, receitas, gastos, saldoFinal) {
    const corTexto = '#94a3b8';

    const ctxPizza = document.getElementById('financeChart');
    if (ctxPizza) {
        if (graficoPizza) graficoPizza.destroy();
        if (dadosPizza.length > 0) {
            graficoPizza = new Chart(ctxPizza.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: labelsPizza,
                    datasets: [{
                        data: dadosPizza,
                        backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                        borderWidth: 0,
                        hoverOffset: 5
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: corTexto } } },
                    cutout: '75%'
                }
            });
        }
    }

    const ctxPizzaGrande = document.getElementById('pizzaChartGrande');
    if (ctxPizzaGrande) {
        if (graficoPizzaGrande) graficoPizzaGrande.destroy();
        if (dadosPizza.length > 0) {
            graficoPizzaGrande = new Chart(ctxPizzaGrande.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: labelsPizza,
                    datasets: [{
                        data: dadosPizza,
                        backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'],
                        borderWidth: 0,
                        hoverOffset: 15
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { color: corTexto, padding: 20, font: { size: 14 } }
                        }
                    },
                    cutout: '65%'
                }
            });
        }
    }

    const ctxFluxo = document.getElementById('fluxoCaixaChart');
    if (ctxFluxo) {
        if (graficoFluxo) graficoFluxo.destroy();
        graficoFluxo = new Chart(ctxFluxo.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Período Selecionado'],
                datasets: [
                    { label: 'Receitas', data: [receitas], backgroundColor: '#10b981', borderRadius: 4 },
                    { label: 'Gastos', data: [gastos], backgroundColor: '#ef4444', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: corTexto } } },
                scales: {
                    y: { ticks: { color: corTexto }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { ticks: { color: corTexto }, grid: { display: false } }
                }
            }
        });
    }

    const ctxSaldo = document.getElementById('saldoChart');
    if (ctxSaldo) {
        if (graficoSaldo) graficoSaldo.destroy();
        graficoSaldo = new Chart(ctxSaldo.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Início', 'Meio', 'Atual'],
                datasets: [{
                    data: [0, saldoFinal / 2, saldoFinal],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false, min: 0 } },
                layout: { padding: 0 }
            }
        });
    }
}

// ==========================================
// 5. ADICIONAR NOVO LANÇAMENTO E CATEGORIA
// ==========================================
async function adicionarNovoLancamento() {
    const descricao = document.getElementById('descInput').value || "Sem Descrição";
    const categoria = document.getElementById('catInput').value;
    let valorStr = document.getElementById('valorInput').value;
    const dataEscolhida = document.getElementById('dataInput').value || new Date().toISOString().split('T')[0];

    if (!valorStr || parseFloat(valorStr) <= 0) {
        mostrarToast("Por favor, insira um valor válido acima de zero.", "error");
        return;
    }

    const novoGasto = {
        user_id: userId,
        categoria: categoria,
        descricao: descricao,
        valor: parseFloat(valorStr),
        data: dataEscolhida
    };

    try {
        const resposta = await fetch('/gastos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoGasto)
        });

        if (resposta.ok) {
            document.getElementById('descInput').value = "";
            document.getElementById('valorInput').value = "";
            document.getElementById('dataInput').value = "";
            carregarDashboard();

            mostrarToast("Lançamento registado com sucesso!", "success");
        } else {
            mostrarToast("Ocorreu um erro ao guardar.", "error");
        }
    } catch (erro) {
        mostrarToast("Erro de ligação ao servidor.", "error");
    }
}

function adicionarCategoriaCustomizada() {
    const nome = document.getElementById('novaCatNome').value.trim();

    if (!nome) {
        mostrarToast("Por favor, digita um nome para a categoria.", "error");
        return;
    }

    const select = document.getElementById('catInput');

    const novaOpcao = document.createElement('option');
    novaOpcao.value = `Gasto - ${nome}`;
    novaOpcao.text = `Gasto - ${nome}`;

    select.appendChild(novaOpcao);

    document.getElementById('novaCatNome').value = "";
    mostrarToast(`A categoria "${nome}" foi adicionada ao menu de lançamentos!`, "success");

    setTimeout(() => {
        navegarPara('view-home');
    }, 1500);
}

// ==========================================
// 6. FUNÇÕES DA CENTRAL DE METAS
// ==========================================
function renderizarMetas() {
    const container = document.getElementById('lista-metas-detalhada');
    if (!container) return;

    container.innerHTML = "";
    let totalGuardado = 0;

    metasGlobais.forEach(meta => {
        totalGuardado += meta.atual;
        let percentagem = (meta.atual / meta.objetivo) * 100;
        if (percentagem > 100) percentagem = 100;

        container.innerHTML += `
            <div style="background: var(--bg-input); padding: 20px; border-radius: 12px; border: 1px solid var(--color-border);">
                <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                    <span style="font-weight: 600; font-size: 16px; color: white;">${meta.icone} ${meta.nome}</span>
                    <span style="color: var(--text-muted); font-size: 14px;">
                        <strong style="color: white;">${formatarMoeda(meta.atual)}</strong> / ${formatarMoeda(meta.objetivo)} 
                        <span style="color: ${meta.cor}; margin-left: 8px; font-weight: bold;">${percentagem.toFixed(1)}%</span>
                    </span>
                </div>
                <div class="progress-bar-container" style="height: 12px; background-color: var(--bg-dark); margin: 10px 0;">
                    <div class="progress-fill" style="width: ${percentagem}%; background: ${meta.cor}; border-radius: 10px; transition: width 1s ease;"></div>
                </div>
                <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
                    <button onclick="adicionarDinheiroMeta(${meta.id})" style="background: transparent; border: 1px solid var(--color-primary); color: var(--color-primary); padding: 6px 16px; border-radius: 6px; cursor: pointer; transition: 0.2s;">
                        <i class="fa-solid fa-piggy-bank"></i> Guardar Dinheiro
                    </button>
                </div>
            </div>
        `;
    });

    const badgeGuardado = document.getElementById('total-guardado-badge');
    if (badgeGuardado) badgeGuardado.innerText = `${formatarMoeda(totalGuardado)} Guardados no Total`;

    atualizarMetaHome();
}

function criarNovaMeta() {
    const nome = document.getElementById('nomeMetaInput').value.trim();
    const objetivo = parseFloat(document.getElementById('valorObjetivoInput').value);
    const atual = parseFloat(document.getElementById('valorGuardadoInput').value) || 0;

    if (!nome || !objetivo || objetivo <= 0) {
        mostrarToast("Preenche o nome e um objetivo válido.", "error");
        return;
    }

    const icones = ["✈️", "🚗", "🏠", "💻", "💍", "🎓", "🎮", "🚀"];
    const cores = ["#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#3b82f6"];

    const iconeAleatorio = icones[Math.floor(Math.random() * icones.length)];
    const corAleatoria = cores[Math.floor(Math.random() * cores.length)];

    const novaMeta = {
        id: Date.now(),
        nome: nome,
        objetivo: objetivo,
        atual: atual,
        icone: iconeAleatorio,
        cor: corAleatoria
    };

    metasGlobais.push(novaMeta);
    salvarMetas();
    renderizarMetas();

    document.getElementById('nomeMetaInput').value = "";
    document.getElementById('valorObjetivoInput').value = "";
    document.getElementById('valorGuardadoInput').value = "";

    mostrarToast(`A meta "${nome}" foi criada!`, "success");
}

function adicionarDinheiroMeta(id) {
    const valorStr = prompt("Quanto dinheiro queres enviar para esta meta? (R$)");
    if (!valorStr) return;

    const valor = parseFloat(valorStr);
    if (isNaN(valor) || valor <= 0) {
        mostrarToast("Valor inválido.", "error");
        return;
    }

    const metaIndex = metasGlobais.findIndex(m => m.id === id);
    if (metaIndex > -1) {
        metasGlobais[metaIndex].atual += valor;
        salvarMetas();
        renderizarMetas();
        mostrarToast(`R$ ${valor.toFixed(2)} guardados com sucesso!`, "success");
    }
}

function atualizarMetaHome() {
    const progressoFil = document.getElementById('meta-progress-fill');
    const percentualBadge = document.getElementById('meta-percentual-badge');
    const valorAtualTexto = document.getElementById('meta-valor-atual');
    const nomeObjetivo = document.getElementById('meta-objetivo');
    const tituloMetaHome = document.querySelector('.card-meta .meta-header h3');

    if (!progressoFil || metasGlobais.length === 0) return;

    const metaPrincipal = metasGlobais[0];

    let percentagem = (metaPrincipal.atual / metaPrincipal.objetivo) * 100;
    if (percentagem > 100) percentagem = 100;

    if (tituloMetaHome) tituloMetaHome.innerText = `${metaPrincipal.icone} Meta: ${metaPrincipal.nome}`;
    if (nomeObjetivo) nomeObjetivo.innerText = `Objetivo: ${formatarMoeda(metaPrincipal.objetivo)}`;

    setTimeout(() => { progressoFil.style.width = `${percentagem}%`; }, 500);

    if (percentualBadge) percentualBadge.innerText = `${Math.round(percentagem)}%`;
    if (valorAtualTexto) {
        valorAtualTexto.innerText = formatarMoeda(metaPrincipal.atual);
        valorAtualTexto.setAttribute('data-valor-original', formatarMoeda(metaPrincipal.atual));
    }
}

// ==========================================
// SISTEMA DE NOTIFICAÇÕES (TOAST E HISTÓRICO)
// ==========================================
function mostrarToast(mensagem, tipo = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;

    const icone = tipo === 'success' ? 'fa-check-circle' : (tipo === 'info' ? 'fa-info-circle' : 'fa-circle-exclamation');

    toast.innerHTML = `
        <i class="fa-solid ${icone}"></i>
        <span>${mensagem}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    const iconSino = document.querySelector('.notification-icon');
    if (iconSino) {
        iconSino.classList.add('ringing');
        setTimeout(() => iconSino.classList.remove('ringing'), 600);
    }

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3500);

    adicionarNotificacaoPainel(mensagem, tipo, icone);
}

function adicionarNotificacaoPainel(mensagem, tipo, iconeClass) {
    const nova = {
        id: Date.now(),
        mensagem: mensagem,
        tipo: tipo,
        icone: iconeClass,
        data: new Date().toISOString()
    };

    historicoNotificacoes.unshift(nova);

    if (historicoNotificacoes.length > 20) historicoNotificacoes.pop();

    localStorage.setItem('notificacoes_historico', JSON.stringify(historicoNotificacoes));
    renderizarNotificacoes();

    if (!painelNotifAberto) {
        const dot = document.getElementById('notif-dot');
        if (dot) dot.style.display = 'block';
    }
}

function renderizarNotificacoes() {
    const lista = document.getElementById('lista-notificacoes');
    if (!lista) return;

    if (historicoNotificacoes.length === 0) {
        lista.innerHTML = '<div class="notif-vazia">Sem notificações recentes.</div>';
        const dot = document.getElementById('notif-dot');
        if (dot) dot.style.display = 'none';
        return;
    }

    lista.innerHTML = "";
    historicoNotificacoes.forEach(notif => {
        const dataObj = new Date(notif.data);
        const hora = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const dataStr = dataObj.toLocaleDateString('pt-BR');

        const corClass = notif.tipo === 'success' ? 'var(--text-success)' : (notif.tipo === 'info' ? '#4facfe' : 'var(--text-danger)');

        lista.innerHTML += `
            <div class="notif-item">
                <div class="notif-icon" style="color: ${corClass}">
                    <i class="fa-solid ${notif.icone}"></i>
                </div>
                <div class="notif-content">
                    <p>${notif.mensagem}</p>
                    <span class="notif-time">${dataStr} às ${hora}</span>
                </div>
            </div>
        `;
    });
}

function toggleNotificacoes() {
    const painel = document.getElementById('painel-notificacoes');
    if (!painel) return;

    painelNotifAberto = !painelNotifAberto;

    if (painelNotifAberto) {
        painel.classList.add('aberto');
        const dot = document.getElementById('notif-dot');
        if (dot) dot.style.display = 'none';
    } else {
        painel.classList.remove('aberto');
    }
}

function limparNotificacoes() {
    historicoNotificacoes = [];
    localStorage.removeItem('notificacoes_historico');
    renderizarNotificacoes();
    toggleNotificacoes();
}

// ==========================================
// 7. INTELIGÊNCIA ARTIFICIAL E SAIR
// ==========================================
async function analisar() {
    const btn = document.querySelector('.btn-ia');
    const display = document.getElementById('ia-response');

    const saldoAtual = totalReceitas - totalGastos;
    const objetivoMeta = 5000;

    if (btn) btn.innerText = "IA Pensando...";
    if (display) display.innerText = "Analisando suas finanças...";

    try {
        const filtro = document.getElementById('filtro-tempo').value || 'tudo';
        let textoFiltro = "Todo o Período";
        const dropdownFiltro = document.getElementById('filtro-tempo');
        if (dropdownFiltro) {
            const opcaoSelecionada = document.querySelector(`#filtro-tempo option[value="${filtro}"]`);
            if (opcaoSelecionada) textoFiltro = opcaoSelecionada.innerText;
        }
        
        const tomEscolhido = localStorage.getItem('ia_tone') || "um consultor financeiro motivador, amigável e otimista";

        // AQUI ESTAVA O ERRO DE DUPLICAÇÃO! AGORA HÁ APENAS UM FETCH!
        const response = await fetch('/analisar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transacoes: transacoesGlobais,
                saldoAtual: saldoAtual,
                objetivoMeta: objetivoMeta,
                tom_ia: tomEscolhido
            })
        });

        const data = await response.json();

        if (display) display.innerText = "Análise concluída!";

        mostrarModalIA(data.mensagem);

        mostrarToast("A IA gerou um novo relatório de análise para ti.", "info");

    } catch (error) {
        if (display) display.innerText = "Erro ao consultar a IA.";
        console.error(error);
    } finally {
        if (btn) btn.innerText = "Consultar IA";
    }
}

function mostrarModalIA(texto) {
    const velha = document.getElementById('modal-ia');
    if (velha) velha.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-ia';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.8); backdrop-filter: blur(5px);
        display: flex; justify-content: center; align-items: center; z-index: 9999;
    `;

    const textoFormatado = texto
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

    const card = document.createElement('div');
    card.style.cssText = `
        background: var(--card-bg, #1a1f2b); border: 1px solid var(--primary, #8b5cf6);
        padding: 30px; border-radius: 16px; max-width: 500px; width: 90%;
        color: white; box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);
    `;

    card.innerHTML = `
        <h2 style="color: var(--primary, #8b5cf6); margin-bottom: 15px;">
            <i class="fa-solid fa-robot"></i> Análise do Assistente IA
        </h2>
        <div style="line-height: 1.6; color: var(--text-muted, #94a3b8); font-size: 1rem; max-height: 60vh; overflow-y: auto;">
            ${textoFormatado}
        </div>
        <button onclick="document.getElementById('modal-ia').remove()" class="btn-primary" style="margin-top: 20px; width: 100%; padding: 10px; border-radius: 8px; border: none; cursor: pointer; background: #8b5cf6; color: white; font-weight: bold;">Fechar Insights</button>
    `;

    modal.appendChild(card);
    document.body.appendChild(modal);
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}

// ==========================================
// 8. PAINEL DE CONFIGURAÇÕES
// ==========================================
let painelConfigAberto = false;

function toggleConfiguracoes() {
    const painel = document.getElementById('painel-configuracoes');
    if (!painel) return;
    painelConfigAberto = !painelConfigAberto;
    if (painelConfigAberto) {
        painel.classList.add('aberto');
    } else {
        painel.classList.remove('aberto');
    }
}

function toggleTema() {
    document.body.classList.toggle('light-mode');
    const isClaro = document.body.classList.contains('light-mode');
    localStorage.setItem('tema', isClaro ? 'claro' : 'escuro');
    mostrarToast(isClaro ? "Modo Claro ativado!" : "Modo Escuro ativado!", "success");
}

function carregarConfiguracoesSalvas() {
    const tema = localStorage.getItem('tema');
    if (tema === 'claro') document.body.classList.add('light-mode');

    const tom = localStorage.getItem('ia_tone');
    if (tom) {
        const select = document.getElementById('ia-tone-select');
        if (select) select.value = tom;
    }
}

function salvarTomIA() {
    const select = document.getElementById('ia-tone-select');
    if (select) {
        localStorage.setItem('ia_tone', select.value);
        mostrarToast("Personalidade da IA atualizada!", "success");
    }
}

function apagarDadosLocais() {
    if (confirm("Tens a certeza? Isto vai apagar as tuas metas e notificações locais!")) {
        localStorage.removeItem('metas_financeiras');
        localStorage.removeItem('notificacoes_historico');

        metasGlobais = [{ id: 1, nome: "Reserva de Emergência", objetivo: 5000, atual: 0, icone: "🎯", cor: "#4facfe" }];
        historicoNotificacoes = [];

        renderizarMetas();
        renderizarNotificacoes();

        mostrarToast("Os teus dados locais foram resetados.", "info");
        toggleConfiguracoes();
    }
}

window.onload = () => {
    carregarConfiguracoesSalvas();
    carregarDashboard();
    renderizarMetas();
    renderizarNotificacoes();
};