/**
 * BVX 360 - Lógica Frontend
 * Consome os endpoints da API FastAPI e interage com o Copiloto de IA
 */

// URL pública padrão do Backend no Render
const RENDER_PROD_URL = 'https://hackathon-2026-6ni3.onrender.com';

// Detecta a URL base da API (suporte a localhost, Vercel e Render)
function obterApiBase() {
  const isLocal = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1');
  const isRender = window.location.origin.includes('onrender.com');
  if (isLocal || isRender) {
    return '';
  }
  const salva = localStorage.getItem('BVX_RENDER_API');
  if (salva) {
    return salva.replace(/\/$/, '');
  }
  return RENDER_PROD_URL;
}

let API_BASE = obterApiBase();

function atualizarStatusConexaoApi() {
  const label = document.getElementById('api-status-label');
  if (!label) return;
  const isLocal = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1');
  const isRender = window.location.origin.includes('onrender.com');
  if (isLocal) {
    label.innerText = 'API Local (8000)';
  } else if (isRender) {
    label.innerText = 'Render Ativo';
  } else {
    label.innerText = 'Render Conectado';
  }
}

function abrirConfigApi() {
  const atual = localStorage.getItem('BVX_RENDER_API') || '';
  const novaUrl = prompt(
    "Insira a URL pública do seu backend no Render (ex: https://bvx360-backend.onrender.com):\n\n(Deixe vazio para usar a rota relativa padrão)",
    atual
  );
  if (novaUrl !== null) {
    if (novaUrl.trim()) {
      localStorage.setItem('BVX_RENDER_API', novaUrl.trim());
    } else {
      localStorage.removeItem('BVX_RENDER_API');
    }
    window.location.reload();
  }
}

let allClients = [];
let currentFilter = 'all';
let filterBackupCritico = false;
let filterVersaoAntiga = false;
let filterAnomaliaIA = false;
let selectedClient = null;

// Instâncias Chart.js (controle de lifecycle)
let chartRiskDoughnut = null;
let chartRadarPillars = null;
let chartTopMelhores = null;
let chartTopPiores = null;
let chartTopValencia = null;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
  atualizarStatusConexaoApi();
  carregarEstatisticas();
  carregarAlertas();
  carregarClientes();
  configurarEventos();
});

// ==================== REQUISIÇÕES DA API ====================

async function carregarEstatisticas() {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard/stats`);
    if (!res.ok) throw new Error('Erro ao buscar stats');
    const data = await res.json();

    document.getElementById('avg-health-score').innerText = data.media_health_score;
    document.getElementById('avg-health-fill').style.width = `${data.media_health_score}%`;
    
    document.getElementById('count-high-risk').innerText = data.distribuicao_risco.alto_risco;
    document.getElementById('pct-high-risk').innerText = `${data.distribuicao_risco.pct_alto_risco}% da base ativa`;

    document.getElementById('count-attention').innerText = data.distribuicao_risco.atencao;
    document.getElementById('pct-attention').innerText = `${data.distribuicao_risco.pct_atencao}% da base ativa`;

    document.getElementById('count-healthy').innerText = data.distribuicao_risco.baixo_risco;
    document.getElementById('pct-healthy').innerText = `${data.distribuicao_risco.pct_baixo_risco}% da base ativa`;

    const faturamentoFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(data.faturamento_diario_monitorado);
    document.getElementById('total-revenue').innerText = faturamentoFormatado;

    // === GRÁFICO DOUGHNUT: Distribuição de Risco ===
    renderizarGraficoDoughnut(
      data.distribuicao_risco.alto_risco,
      data.distribuicao_risco.atencao,
      data.distribuicao_risco.baixo_risco
    );

  } catch (err) {
    console.error('Falha ao carregar KPIs:', err);
  }
}

async function carregarAlertas() {
  try {
    const res = await fetch(`${API_BASE}/api/alerts`);
    if (!res.ok) throw new Error('Erro ao buscar alertas');
    const alertas = await res.json();

    const container = document.getElementById('alerts-container');
    const countBadge = document.getElementById('alerts-count-badge');
    countBadge.innerText = `${alertas.length} alertas ativos`;

    container.innerHTML = alertas.map(a => `
      <div class="alert-item-card" onclick="selecionarClientePorId(${a.client_id})">
        <div class="alert-item-client">⚠️ ${a.cliente} (${a.cidade})</div>
        <div class="alert-item-msg">${a.mensagem}</div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Falha ao carregar alertas:', err);
  }
}

async function carregarClientes() {
  try {
    const res = await fetch(`${API_BASE}/api/clients`);
    if (!res.ok) throw new Error('Erro ao buscar clientes');
    allClients = await res.json();
    renderizarListaClientes();
    
    // Auto-seleciona o primeiro cliente da lista (geralmente o mais crítico)
    if (allClients.length > 0 && !selectedClient) {
      selecionarCliente(allClients[0]);
    }
  } catch (err) {
    console.error('Falha ao carregar clientes:', err);
  }
}

// ==================== FILTRAGEM E RENDERIZAÇÃO ====================

function renderizarListaClientes() {
  const container = document.getElementById('clients-list');
  const countBadge = document.getElementById('filtered-clients-count');
  const termoBusca = document.getElementById('search-input').value.toLowerCase().trim();

  let filtrados = allClients.filter(c => {
    // Filtro de risco
    if (currentFilter !== 'all' && c.risco !== currentFilter) {
      return false;
    }
    // Filtro backup
    if (filterBackupCritico && c.dias_sem_backup < 3 && c.backup_integro) {
      return false;
    }
    // Filtro versão antiga
    if (filterVersaoAntiga && c.versao_sistema.startsWith('5.4')) {
      return false;
    }
    // Filtro anomalia IA (Isolation Forest)
    if (filterAnomaliaIA && !c.alerta_anomalia) {
      return false;
    }
    // Busca textual
    if (termoBusca) {
      const matchNome = c.nome_fantasia.toLowerCase().includes(termoBusca);
      const matchPdv = c.codigo_pdv.toLowerCase().includes(termoBusca);
      const matchCidade = c.cidade.toLowerCase().includes(termoBusca);
      const matchResp = c.responsavel.toLowerCase().includes(termoBusca);
      if (!matchNome && !matchPdv && !matchCidade && !matchResp) return false;
    }
    return true;
  });

  countBadge.innerText = `${filtrados.length} clientes`;

  if (filtrados.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 40px 10px; color: var(--text-dim);">
        Nenhum cliente encontrado com os filtros selecionados.
      </div>
    `;
    return;
  }

  container.innerHTML = filtrados.map(c => {
    const isSelected = selectedClient && selectedClient.id === c.id;
    const bubbleClass = c.health_score < 50 ? 'score-bubble-high' : (c.health_score < 75 ? 'score-bubble-med' : 'score-bubble-low');
    
    // Tags dinâmicas
    let tagsHtml = '';
    if (c.dias_sem_backup >= 3 || !c.backup_integro) {
      tagsHtml += `<span class="mini-tag tag-backup-bad">💾 Backup ${c.dias_sem_backup}d</span>`;
    }
    if (!c.versao_sistema.startsWith('5.4')) {
      tagsHtml += `<span class="mini-tag tag-version-bad">📦 v${c.versao_sistema}</span>`;
    }
    if (c.variacao_vendas_pct <= -20) {
      tagsHtml += `<span class="mini-tag tag-backup-bad">📉 Vendas ${c.variacao_vendas_pct}%</span>`;
    }
    if (c.alerta_anomalia) {
      tagsHtml += `<span class="mini-tag tag-ai-anomaly" title="${c.tipo_anomalia || 'Anomalia multivariada detectada por IA'}">⚡ IA: Anomalia</span>`;
    }

    return `
      <div class="client-item-row ${isSelected ? 'selected' : ''}" onclick="selecionarClientePorId(${c.id})">
        <div class="client-primary">
          <div class="client-name-text">${c.nome_fantasia}</div>
          <div class="client-sub-meta">${c.codigo_pdv} • ${c.cidade} - ${c.uf} • ${c.responsavel}</div>
          <div class="client-tags-row">${tagsHtml}</div>
        </div>
        <div class="client-score-col">
          <div class="client-score-bubble ${bubbleClass}">
            ${c.health_score}
          </div>
          <span style="font-size: 10px; color: var(--text-dim);">${c.risco}</span>
        </div>
      </div>
    `;
  }).join('');
}

function selecionarClientePorId(id) {
  const c = allClients.find(item => item.id === id);
  if (c) {
    selecionarCliente(c);
  }
}

function selecionarCliente(cliente) {
  selectedClient = cliente;
  renderizarListaClientes(); // Atualiza a seleção visual na lista

  document.getElementById('empty-detail-state').style.display = 'none';
  document.getElementById('client-detail-content').style.display = 'block';

  // Cabeçalho do Detalhe
  document.getElementById('detail-pdv-code').innerText = cliente.codigo_pdv;
  document.getElementById('detail-city-tag').innerText = `${cliente.cidade} - ${cliente.uf}`;
  document.getElementById('detail-cluster-tag').innerText = cliente.cluster_nome || 'Cluster Padrão';
  document.getElementById('detail-name').innerText = cliente.nome_fantasia;
  document.getElementById('detail-responsible').innerText = cliente.responsavel;
  document.getElementById('detail-phone').innerText = cliente.telefone;
  document.getElementById('detail-terminals').innerText = cliente.quantidade_terminais;

  // Gauge do Health Score
  const scoreVal = document.getElementById('detail-score-value');
  const riskBadge = document.getElementById('detail-risk-badge');
  const gaugeCircle = document.getElementById('gauge-circle');

  scoreVal.innerText = cliente.health_score;
  riskBadge.innerText = cliente.risco;
  riskBadge.style.color = cliente.cor_risco;
  riskBadge.style.borderColor = cliente.cor_risco;
  gaugeCircle.style.borderColor = cliente.cor_risco;
  gaugeCircle.style.boxShadow = `0 0 20px ${cliente.cor_risco}40`;

  // Banner de Anomalia Detectada por IA (Isolation Forest)
  const anomalyBanner = document.getElementById('detail-anomaly-banner');
  const anomalyDesc = document.getElementById('detail-anomaly-desc');
  if (anomalyBanner && anomalyDesc) {
    if (cliente.alerta_anomalia) {
      anomalyBanner.style.display = 'flex';
      anomalyDesc.innerText = cliente.tipo_anomalia 
        ? `${cliente.tipo_anomalia} - Identificado pelo modelo preditivo Isolation Forest.`
        : 'Padrão atípico multivariado identificado nos pilares operacionais.';
    } else {
      anomalyBanner.style.display = 'none';
    }
  }

  // 01. Pilar Versionamento
  document.getElementById('pillar-version-val').innerText = cliente.versao_sistema;
  const isHomologado = cliente.versao_sistema.startsWith('5.4');
  document.getElementById('pillar-version-status').innerText = isHomologado 
    ? 'Versão Homologada e Estável' 
    : `Defasada (Versão Homologada: ${cliente.versao_atual_homologada})`;
  document.getElementById('pillar-version-status').style.color = isHomologado ? 'var(--color-success)' : 'var(--color-warning)';

  // 02. Pilar Backup
  document.getElementById('pillar-backup-val').innerText = cliente.dias_sem_backup === 0 ? 'Hoje' : `Há ${cliente.dias_sem_backup} dias`;
  const backupOk = cliente.dias_sem_backup <= 1 && cliente.backup_integro;
  document.getElementById('pillar-backup-status').innerText = backupOk 
    ? `Íntegro (${cliente.tamanho_backup_mb} MB)` 
    : (!cliente.backup_integro ? 'Falha de Integridade / Risco' : 'Atraso Crítico');
  document.getElementById('pillar-backup-status').style.color = backupOk ? 'var(--color-success)' : 'var(--color-danger)';

  // 03. Pilar Vendas / Utilização
  const sinalVendas = cliente.variacao_vendas_pct >= 0 ? `+${cliente.variacao_vendas_pct}%` : `${cliente.variacao_vendas_pct}%`;
  document.getElementById('pillar-sales-val').innerText = sinalVendas;
  const vendasOk = cliente.variacao_vendas_pct >= -10;
  document.getElementById('pillar-sales-status').innerText = vendasOk ? 'Uso Normal do PDV' : 'Sinal de Abandono (Churn)';
  document.getElementById('pillar-sales-status').style.color = vendasOk ? 'var(--color-success)' : 'var(--color-danger)';

  // 04. Pilar Chamados
  document.getElementById('pillar-tickets-val').innerText = `${cliente.chamados_ultimos_30d} chamados`;
  const chamadosOk = cliente.chamados_ultimos_30d <= 2;
  document.getElementById('pillar-tickets-status').innerText = chamadosOk ? 'Demanda Estável' : 'Alto Volume de Dúvidas/Bugs';
  document.getElementById('pillar-tickets-status').style.color = chamadosOk ? 'var(--color-success)' : 'var(--color-warning)';

  // Reseta controles do Simulador
  document.getElementById('sim-check-version').checked = false;
  document.getElementById('sim-check-backup').checked = false;
  document.getElementById('sim-check-tickets').checked = false;
  
  document.getElementById('sim-current-score').innerText = cliente.health_score;
  document.getElementById('sim-projected-score').innerText = cliente.health_score;
  document.getElementById('sim-diff-badge').innerText = '+0 pts';
  document.getElementById('sim-feedback-text').innerText = 'Selecione as ações acima para simular a recuperação do cliente.';

  // === GRÁFICO RADAR: Atualiza pilares 360° ===
  if (cliente.detalhe_subscores) {
    renderizarGraficoRadar(cliente.detalhe_subscores);
  }
}

// ==================== SIMULADOR DE IMPACTO ====================

async function executarSimulacao() {
  if (!selectedClient) return;

  const simVersao = document.getElementById('sim-check-version').checked;
  const simBackup = document.getElementById('sim-check-backup').checked;
  const simChamados = document.getElementById('sim-check-tickets').checked;

  try {
    const res = await fetch(`${API_BASE}/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: selectedClient.id,
        simula_versao: simVersao,
        simula_backup: simBackup,
        simula_chamados: simChamados
      })
    });
    if (!res.ok) throw new Error('Erro na simulação');
    const data = await res.json();

    document.getElementById('sim-current-score').innerText = data.score_original;
    document.getElementById('sim-projected-score').innerText = data.score_simulado;
    
    const ganho = data.ganho_pontos;
    document.getElementById('sim-diff-badge').innerText = `+${ganho} pts`;

    if (ganho > 0) {
      document.getElementById('sim-feedback-text').innerHTML = `
        Com essas ações preventivas, o cliente evolui de <strong>${data.risco_original}</strong> para 
        <strong style="color:var(--color-success);">${data.risco_simulado}</strong>, reduzindo o risco de churn!
      `;
    } else {
      document.getElementById('sim-feedback-text').innerText = 'Nenhuma intervenção selecionada no momento.';
    }

  } catch (err) {
    console.error('Falha ao simular impacto:', err);
  }
}

// ==================== COPILOTO DE IA ====================

function abrirModal(titulo, icone, subtitulo) {
  const modal = document.getElementById('ai-modal');
  document.getElementById('modal-title').innerText = titulo;
  document.getElementById('modal-type-icon').innerText = icone;
  document.getElementById('modal-subtitle').innerText = subtitulo;
  
  document.getElementById('modal-loading').style.display = 'block';
  document.getElementById('modal-text-content').innerText = '';
  document.getElementById('modal-whatsapp-link').style.display = 'none';

  modal.style.display = 'flex';
}

function fecharModal() {
  document.getElementById('ai-modal').style.display = 'none';
}

async function acionarDiagnosticoIA() {
  if (!selectedClient) return;
  abrirModal(`Diagnóstico Preditivo: ${selectedClient.nome_fantasia}`, '🔍', 'Motor Analítico BVX via FreeLLMAPI');

  try {
    const res = await fetch(`${API_BASE}/api/ai/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: selectedClient.id })
    });
    const data = await res.json();
    document.getElementById('modal-loading').style.display = 'none';
    document.getElementById('modal-text-content').innerText = data.diagnostico;
  } catch (err) {
    document.getElementById('modal-loading').style.display = 'none';
    document.getElementById('modal-text-content').innerText = 'Erro ao processar com a IA. Tente novamente.';
  }
}

async function acionarMensagemIA(canal) {
  if (!selectedClient) return;
  const isWhatsapp = canal === 'whatsapp';
  const icone = isWhatsapp ? '💬' : '✉️';
  const canalNome = isWhatsapp ? 'WhatsApp' : 'E-mail Preventivo';
  
  abrirModal(`Script de Contato (${canalNome})`, icone, `Destinatário: ${selectedClient.responsavel} - ${selectedClient.nome_fantasia}`);

  try {
    const res = await fetch(`${API_BASE}/api/ai/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: selectedClient.id,
        canal: canal
      })
    });
    const data = await res.json();
    document.getElementById('modal-loading').style.display = 'none';
    document.getElementById('modal-text-content').innerText = data.mensagem;

    if (isWhatsapp) {
      const waLink = document.getElementById('modal-whatsapp-link');
      const telDigitos = selectedClient.telefone.replace(/\D/g, '');
      const waUrl = `https://wa.me/55${telDigitos}?text=${encodeURIComponent(data.mensagem)}`;
      waLink.href = waUrl;
      waLink.style.display = 'inline-flex';
    }
  } catch (err) {
    document.getElementById('modal-loading').style.display = 'none';
    document.getElementById('modal-text-content').innerText = 'Erro ao gerar mensagem com a IA. Tente novamente.';
  }
}

// ==================== CONFIGURAÇÃO DE EVENTOS ====================

function configurarEventos() {
  // Filtros de Risco
  document.querySelectorAll('.filter-chip[data-filter]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-chip[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      renderizarListaClientes();
    });
  });

  // Filtro Backup Crítico
  const btnBackup = document.getElementById('filter-backup-btn');
  btnBackup.addEventListener('click', () => {
    filterBackupCritico = !filterBackupCritico;
    btnBackup.classList.toggle('active', filterBackupCritico);
    renderizarListaClientes();
  });

  // Filtro Versão Antiga
  const btnVersao = document.getElementById('filter-version-btn');
  btnVersao.addEventListener('click', () => {
    filterVersaoAntiga = !filterVersaoAntiga;
    btnVersao.classList.toggle('active', filterVersaoAntiga);
    renderizarListaClientes();
  });

  // Filtro Anomalias IA (Isolation Forest)
  const btnAnomaly = document.getElementById('filter-anomaly-btn');
  if (btnAnomaly) {
    btnAnomaly.addEventListener('click', () => {
      filterAnomaliaIA = !filterAnomaliaIA;
      btnAnomaly.classList.toggle('active', filterAnomaliaIA);
      renderizarListaClientes();
    });
  }

  // Exportar Ficha 360 em PDF / Impressão
  const btnExportPdf = document.getElementById('btn-export-pdf');
  if (btnExportPdf) {
    btnExportPdf.addEventListener('click', () => {
      if (!selectedClient) {
        alert('Selecione um cliente para exportar o relatório 360.');
        return;
      }
      window.print();
    });
  }

  // Modal de Análise Estratégica de Extremos (Colab / Top 10)
  const btnExtremos = document.getElementById('btn-open-extremos-modal');
  if (btnExtremos) {
    btnExtremos.addEventListener('click', abrirModalExtremos);
  }

  const btnCloseExtremos = document.getElementById('modal-extremos-close-btn');
  if (btnCloseExtremos) {
    btnCloseExtremos.addEventListener('click', fecharModalExtremos);
  }

  const btnCloseExtremosBottom = document.getElementById('modal-extremos-close-bottom-btn');
  if (btnCloseExtremosBottom) {
    btnCloseExtremosBottom.addEventListener('click', fecharModalExtremos);
  }

  const modalExtremos = document.getElementById('modal-extremos');
  if (modalExtremos) {
    modalExtremos.addEventListener('click', (e) => {
      if (e.target.id === 'modal-extremos') fecharModalExtremos();
    });
  }

  const btnPrintExtremos = document.getElementById('modal-extremos-print-btn');
  if (btnPrintExtremos) {
    btnPrintExtremos.addEventListener('click', () => {
      window.print();
    });
  }

  // Abas do Modal de Extremos
  const tabInterativo = document.getElementById('tab-btn-interativo');
  const tabOriginal = document.getElementById('tab-btn-original');
  const viewInterativo = document.getElementById('view-extremos-interativo');
  const viewOriginal = document.getElementById('view-extremos-original');

  if (tabInterativo && tabOriginal) {
    tabInterativo.addEventListener('click', () => {
      tabInterativo.classList.add('active');
      tabOriginal.classList.remove('active');
      viewInterativo.style.display = 'block';
      viewOriginal.style.display = 'none';
    });

    tabOriginal.addEventListener('click', () => {
      tabOriginal.classList.add('active');
      tabInterativo.classList.remove('active');
      viewInterativo.style.display = 'none';
      viewOriginal.style.display = 'block';
    });
  }

  // Busca textual
  document.getElementById('search-input').addEventListener('input', () => {
    renderizarListaClientes();
  });

  // Checkboxes do Simulador
  document.getElementById('sim-check-version').addEventListener('change', executarSimulacao);
  document.getElementById('sim-check-backup').addEventListener('change', executarSimulacao);
  document.getElementById('sim-check-tickets').addEventListener('change', executarSimulacao);

  // Botões de IA
  document.getElementById('btn-ai-diagnose').addEventListener('click', acionarDiagnosticoIA);
  document.getElementById('btn-ai-whatsapp').addEventListener('click', () => acionarMensagemIA('whatsapp'));
  document.getElementById('btn-ai-email').addEventListener('click', () => acionarMensagemIA('email'));

  // Fechar Modal
  document.getElementById('modal-close-btn').addEventListener('click', fecharModal);
  document.getElementById('ai-modal').addEventListener('click', (e) => {
    if (e.target.id === 'ai-modal') fecharModal();
  });

  // Copiar Texto do Modal
  document.getElementById('modal-copy-btn').addEventListener('click', () => {
    const text = document.getElementById('modal-text-content').innerText;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('modal-copy-btn');
      const original = btn.innerHTML;
      btn.innerHTML = '<span>✅ Copiado!</span>';
      setTimeout(() => {
        btn.innerHTML = original;
      }, 2000);
    });
  });
}

// ==================== GRÁFICOS CHART.JS ====================

function renderizarGraficoDoughnut(altoRisco, atencao, baixoRisco) {
  const ctx = document.getElementById('chart-risk-doughnut');
  if (!ctx) return;

  if (chartRiskDoughnut) {
    chartRiskDoughnut.destroy();
  }

  chartRiskDoughnut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Alto Risco', 'Atenção', 'Saudável'],
      datasets: [{
        data: [altoRisco, atencao, baixoRisco],
        backgroundColor: [
          'rgba(220, 38, 38, 0.85)',
          'rgba(217, 119, 6, 0.85)',
          'rgba(22, 163, 74, 0.85)'
        ],
        borderColor: [
          'rgba(220, 38, 38, 1)',
          'rgba(217, 119, 6, 1)',
          'rgba(22, 163, 74, 1)'
        ],
        borderWidth: 2,
        hoverOffset: 8,
        borderRadius: 4,
        spacing: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#64748b',
            font: {
              family: "'Montserrat', sans-serif",
              size: 12,
              weight: '600'
            },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 12
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleFont: { family: "'Montserrat', sans-serif", weight: '700' },
          bodyFont: { family: "'Open Sans', sans-serif" },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((context.parsed / total) * 100).toFixed(1);
              return ` ${context.label}: ${context.parsed} clientes (${pct}%)`;
            }
          }
        }
      },
      animation: {
        animateRotate: true,
        duration: 1000,
        easing: 'easeOutQuart'
      }
    }
  });
}

function renderizarGraficoRadar(subscores) {
  const ctx = document.getElementById('chart-radar-pillars');
  if (!ctx) return;

  if (chartRadarPillars) {
    chartRadarPillars.destroy();
  }

  const labels = ['Backup', 'Versionamento', 'Vendas', 'Chamados'];
  const valores = [
    subscores.backup,
    subscores.versao,
    subscores.vendas,
    subscores.chamados
  ];

  // Benchmark "ideal" para comparação visual
  const benchmark = [100, 100, 100, 100];

  chartRadarPillars = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Cliente Atual',
          data: valores,
          backgroundColor: 'rgba(5, 102, 95, 0.20)',
          borderColor: 'rgba(5, 102, 95, 0.9)',
          borderWidth: 2.5,
          pointBackgroundColor: '#05665f',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: true
        },
        {
          label: 'Referência Ideal',
          data: benchmark,
          backgroundColor: 'rgba(0, 141, 133, 0.06)',
          borderColor: 'rgba(0, 141, 133, 0.35)',
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointBackgroundColor: 'rgba(0, 141, 133, 0.5)',
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 25,
            display: true,
            color: '#94a3b8',
            font: { size: 10, family: "'Open Sans', sans-serif" },
            backdropColor: 'transparent'
          },
          grid: {
            color: 'rgba(226, 232, 240, 0.6)',
            lineWidth: 1
          },
          angleLines: {
            color: 'rgba(226, 232, 240, 0.5)'
          },
          pointLabels: {
            color: '#1e293b',
            font: {
              family: "'Montserrat', sans-serif",
              size: 12,
              weight: '700'
            },
            padding: 8
          }
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#64748b',
            font: {
              family: "'Montserrat', sans-serif",
              size: 11,
              weight: '600'
            },
            padding: 14,
            usePointStyle: true,
            pointStyleWidth: 10
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleFont: { family: "'Montserrat', sans-serif", weight: '700' },
          bodyFont: { family: "'Open Sans', sans-serif" },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              return ` ${context.dataset.label}: ${context.parsed.r}/100`;
            }
          }
        }
      },
      animation: {
        duration: 800,
        easing: 'easeOutQuart'
      }
    }
  });
}

// ==================== MODAL DE EXTREMOS & RISCO DE VALÊNCIA ====================

function abrirModalExtremos() {
  const modal = document.getElementById('modal-extremos');
  if (!modal) return;
  modal.style.display = 'flex';
  renderizarGraficosExtremos();
}

function fecharModalExtremos() {
  const modal = document.getElementById('modal-extremos');
  if (modal) modal.style.display = 'none';
}

function renderizarGraficosExtremos() {
  if (!allClients || allClients.length === 0) return;

  // 1. Top 10 Melhores Clientes (Maior Saúde)
  const top10Melhores = [...allClients]
    .sort((a, b) => b.health_score - a.health_score)
    .slice(0, 10);

  // 2. Top 10 Piores Clientes (Críticos / Risco Churn)
  const top10Piores = [...allClients]
    .sort((a, b) => a.health_score - b.health_score)
    .slice(0, 10);

  // 3. Risco de Valência Técnica (Sem Backup + Sistema Antigo)
  let top10Valencia = [...allClients]
    .filter(c => c.dias_sem_backup >= 2 || !c.versao_sistema.startsWith('5.4'))
    .sort((a, b) => b.dias_sem_backup - a.dias_sem_backup)
    .slice(0, 10);

  if (top10Valencia.length === 0) {
    top10Valencia = [...allClients].sort((a, b) => b.dias_sem_backup - a.dias_sem_backup).slice(0, 10);
  }

  // --- Gráfico 1: Melhores (Horizontal) ---
  const ctxMelhores = document.getElementById('chart-top-melhores');
  if (ctxMelhores) {
    if (chartTopMelhores) chartTopMelhores.destroy();
    chartTopMelhores = new Chart(ctxMelhores, {
      type: 'bar',
      data: {
        labels: top10Melhores.map(c => c.nome_fantasia),
        datasets: [{
          label: 'Health Score',
          data: top10Melhores.map(c => c.health_score),
          backgroundColor: [
            '#2e1065', '#3b0764', '#1e1b4b', '#1e3a8a', '#0369a1',
            '#0e7490', '#047857', '#059669', '#65a30d', '#84cc16'
          ],
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Health Score: ${ctx.parsed.x}/100`
            }
          }
        },
        scales: {
          x: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: { font: { family: "'Open Sans', sans-serif", size: 10 } }
          },
          y: {
            grid: { display: false },
            ticks: {
              font: { family: "'Montserrat', sans-serif", size: 10, weight: '600' },
              color: '#1e293b'
            }
          }
        }
      }
    });
  }

  // --- Gráfico 2: Piores (Horizontal) ---
  const ctxPiores = document.getElementById('chart-top-piores');
  if (ctxPiores) {
    if (chartTopPiores) chartTopPiores.destroy();
    chartTopPiores = new Chart(ctxPiores, {
      type: 'bar',
      data: {
        labels: top10Piores.map(c => c.nome_fantasia),
        datasets: [{
          label: 'Health Score',
          data: top10Piores.map(c => c.health_score),
          backgroundColor: [
            '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ea580c',
            '#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'
          ],
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Health Score: ${ctx.parsed.x}/100`
            }
          }
        },
        scales: {
          x: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: { font: { family: "'Open Sans', sans-serif", size: 10 } }
          },
          y: {
            grid: { display: false },
            ticks: {
              font: { family: "'Montserrat', sans-serif", size: 10, weight: '600' },
              color: '#1e293b'
            }
          }
        }
      }
    });
  }

  // --- Gráfico 3: Valência Técnica (Horizontal) ---
  const ctxValencia = document.getElementById('chart-top-valencia');
  if (ctxValencia) {
    if (chartTopValencia) chartTopValencia.destroy();
    const maxDias = Math.max(...top10Valencia.map(c => c.dias_sem_backup), 10);
    chartTopValencia = new Chart(ctxValencia, {
      type: 'bar',
      data: {
        labels: top10Valencia.map(c => `${c.nome_fantasia} (v${c.versao_sistema})`),
        datasets: [{
          label: 'Dias sem Backup',
          data: top10Valencia.map(c => c.dias_sem_backup),
          backgroundColor: [
            '#e0a96d', '#d98b68', '#c96a66', '#b34d67', '#973669',
            '#782468', '#581961', '#3b1251', '#260c3b', '#170624'
          ],
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Dias sem Backup: ${ctx.parsed.x} dias`
            }
          }
        },
        scales: {
          x: {
            min: 0,
            max: Math.ceil(maxDias * 1.2),
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: { font: { family: "'Open Sans', sans-serif", size: 10 } }
          },
          y: {
            grid: { display: false },
            ticks: {
              font: { family: "'Montserrat', sans-serif", size: 10, weight: '600' },
              color: '#1e293b'
            }
          }
        }
      }
    });
  }
}
