# 🛡️ Plataforma BVX 360: Inteligência, Prevenção e Ação

<div align="center">

![BVX 360](frontend/assets/logo_bvx.png)

**XX Semana de Tecnologia • Hackathon FATECOU 2026**  
**Desafio BVX Tecnologia:** *"CLIENTE 360! Quem precisa da nossa atenção antes que um problema aconteça?"*  
**Foco Principal Selecionado:** **Desafio 3 — Churn / Sinais de Abandono (Prevenção e Retenção Ativa)**  

[![Status](https://img.shields.io/badge/Status-100%25%20Em%20Produção-16a34a?style=for-the-badge)](https://hackathon-2026-frontend-ten.vercel.app/)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel%20Edge%20CDN-black?style=for-the-badge&logo=vercel)](https://hackathon-2026-frontend-ten.vercel.app/)
[![Render](https://img.shields.io/badge/Backend%20API-Render%20Cloud-46E3B7?style=for-the-badge&logo=render)](https://hackathon-2026-6ni3.onrender.com)
[![Python](https://img.shields.io/badge/Python-3.10%2B%20%7C%20FastAPI-3776AB?style=for-the-badge&logo=python)](https://fastapi.tiangolo.com)
[![Machine Learning](https://img.shields.io/badge/ML-Isolation%20Forest%20(Scikit--Learn)-F7931E?style=for-the-badge&logo=scikit-learn)](scratch_colab.ipynb)

</div>

---

## 👥 Equipe & Governança

* **Grupo:** **Fundação**
* **Integrantes da Equipe:**
  * **Adolfo** (Apresentador / Pitch)
  * **Brisa** (Engenharia de Software / Produto)
  * **João Lucas** (Data & Inteligência Artificial)
* **Parceria Oficial:** **BVX Tecnologia LTDA**
* **Compromisso ODS (ONU):** 
  * 🌐 **ODS 8:** Trabalho Decente e Crescimento Econômico (proteção da estabilidade operacional de pequenos varejistas).
  * ⚙️ **ODS 9:** Indústria, Inovação e Infraestrutura (democratização de inteligência preditiva para o varejo regional).

---

## 🌐 Acesso Rápido aos Ambientes em Produção

| Camada | Provedor | URL Pública de Acesso | Descrição |
| :--- | :---: | :--- | :--- |
| **Frontend Web** | Vercel CDN | [🔗 hackathon-2026-frontend-ten.vercel.app](https://hackathon-2026-frontend-ten.vercel.app/) | Aplicação SPA em tempo real com telemetria ativa, gráficos Chart.js e simulador. |
| **Backend API** | Render Cloud | [🔗 hackathon-2026-6ni3.onrender.com](https://hackathon-2026-6ni3.onrender.com) | Microsserviço FastAPI assíncrono com motor de cálculo CHS e Machine Learning. |
| **Swagger OpenAPI** | Render Cloud | [🔗 /docs (Documentação Interativa)](https://hackathon-2026-6ni3.onrender.com/docs) | Catálogo completo de endpoints REST com testes interativos online. |
| **Código-Fonte** | GitHub | [🔗 github.com/BDantas1983/hackathon-2026](https://github.com/BDantas1983/hackathon-2026) | Repositório aberto com histórico de engenharia, commits semânticos e documentação. |

---

## 📁 Entregáveis Oficiais Homologados (Pasta `docs/`)

Todos os entregáveis exigidos pela banca julgadora do Hackathon FATECOU 2026 estão organizados e versionados na pasta [`docs/`](docs/):

1. **📄 Relatório Técnico Completo:** [`docs/relatorio_completo_bvx360.pdf`](docs/relatorio_completo_bvx360.pdf)  
   *Dossiê estrutural de 9 páginas com memorial de engenharia de dados, modelagem matemática, arquitetura de software e governança.*
2. **📊 Modelo Canvas Estratégico (PDF):** [`docs/modelo_canvas_bvx360.pdf`](docs/modelo_canvas_bvx360.pdf)  
   *Business Model Canvas e Lean Canvas consolidados em página única A4 Paisagem com métricas AARRR.*
3. **📝 Modelo Canvas (Markdown):** [`docs/modelo_canvas_bvx360.md`](docs/modelo_canvas_bvx360.md)  
   *Versão textual com aprofundamento estratégico pós-mentoria.*
4. **🎥 Vídeo Oficial do Pitch (2 Minutos):** [`docs/Pitch.mp4`](docs/Pitch.mp4)  
   *Demonstração prática ao vivo conduzida por Adolfo (1080p Full HD, 2m09s), provando funcionamento real dos 5 cliques de valor.*

---

## 🎯 1. O Desafio e a Visão de Negócio

A **BVX Tecnologia** atende mais de **5.000 pontos de venda (PDVs)** no comércio varejista essencial (supermercados, farmácias, postos de combustíveis, padarias e materiais de construção), monitorando mais de **R$ 1,13M em faturamento diário transacionado**.

### A Dor Operacional:
Historicamente, o modelo de suporte é **reativo** — o time é acionado quando o PDV já parou em horário de pico ou quando o comerciante solicita o cancelamento do contrato. Em **80%+ dos casos**, o cliente emitia sinais técnicos silenciosos de degradação semanas antes do churn:
* Falha reiterada na rotina de backups locais;
* Defasagem severa de versão do software;
* Queda abrupta de vendas/emissões fiscais sem nenhuma abertura de chamado de suporte (o *"Cliente Silencioso"*).

### A Solução BVX 360:
Converte o acompanhamento em um ecossistema **preditivo e prescritivo**, antecipando quebras operacionais em até **21 dias** e priorizando automaticamente a fila de atendimento da equipe de Help Desk e Customer Success.

---

## 🧮 2. Motor de Saúde do Cliente (Customer Health Score - CHS)

O índice de saúde é calculado de forma **100% explicável**, eliminando algoritmos de caixa-preta e permitindo aos técnicos compreender exatamente a causa-raiz de cada pontuação:

$$\text{CHS} = (\text{Subscore}_{\text{Backup}} \times 0.30) + (\text{Subscore}_{\text{Versão}} \times 0.25) + (\text{Subscore}_{\text{Vendas}} \times 0.25) + (\text{Subscore}_{\text{Chamados}} \times 0.20)$$

| Pilar de Telemetria | Peso | Lógica do Sub-Score (0 a 100) | Justificativa de Negócio |
| :--- | :---: | :--- | :--- |
| **01. Rotina de Backup** | **30%** | 0 dias = 100 pts. Até 30 dias: $100 - (dias \times 3.33)$. Falha de integridade corta 50%. | Previne perdas fiscais catastróficas junto à SEFAZ. |
| **02. Versão do Sistema** | **25%** | v5.4.x = 100 pts \| v5.3.x = 75 pts \| v5.2.x = 50 pts \| v5.0.x = 10 pts. | Garante conformidade fiscal e estabilidade de NFC-e. |
| **03. Variação de Vendas** | **25%** | Crescimento > +20% = 100 pts \| 0 a +20% = 90 pts \| Queda severa < -25% = 15 pts. | Detecta desuso do PDV ou encerramento de atividades. |
| **04. Suporte & Chamados** | **20%** | 1 a 3 chamados = 100 pts \| $\ge$ 10 chamados = 20 pts \| **0 chamados com vendas caindo = 20 pts**. | Pune excesso de suporte e identifica abandono silencioso. |

### Régua de Priorização & SLAs de Atendimento:
* 🔴 **0 a 49.9 pts — ALTO RISCO (Prioridade 1):** Intervenção imediata em até **24 horas**. Emissão de O.S. Preventiva e contato da liderança.
* 🟡 **50.0 a 74.9 pts — ATENÇÃO (Prioridade 2):** Agendamento de atualização remota e acompanhamento em até **72 horas**.
* 🟢 **75.0 a 100 pts — BAIXO RISCO (Prioridade 3):** Cliente estável, operação segura e atualização trimestral automática.

---

## 🤖 3. Diferenciais de Tecnologia & Produto

### ⚡ A. Simulador Interativo Prescritivo ("E se...?")
Permite que o operador ou gestor simule em tempo real qual será o novo Health Score e o ganho em pontos ao aplicar ações corretivas:
* *"Atualizar sistema para v5.4.2"* (+22 pts)
* *"Forçar sincronização de backup em nuvem"* (+30 pts)
* *"Sanear chamados críticos em aberto"* (+18 pts)

### 💬 B. Copiloto de Atendimento com IA Integrado
Aciona inteligência artificial generativa no backend para:
* Gerar **Briefing Executivo Interno** com diagnóstico de causa-raiz para o técnico de suporte;
* Redigir **Mensagem Humanizada e Empática para WhatsApp** pronta para cópia em 1 clique e envio ao tomador de decisão (comerciante).

### 🌲 C. Machine Learning: Isolation Forest (Detecção Não-Supervisionada)
Modelado e validado em um dataset de **5.000 estabelecimentos sintéticos** (`scratch_colab.ipynb`), o algoritmo caça padrões atípicos multivariados que regras rígidas não capturam:
* **Cliente Silencioso:** Vendas despencando com 0 chamados abertos (risco iminente de migração para concorrente);
* **Risco de Valência Técnica:** Sem backup há mais de 60 dias operando em versão legada obsoleta (risco iminente de corrupção de banco).

---

## 📑 4. Central de Relatórios & Governança A4

A plataforma inclui um menu dropdown suspenso com 4 documentos técnicos oficiais:
1. **Ordem de Serviço Preventiva (O.S. Oficial A4):** Protocolo padronizado com checklist de procedimentos para o técnico de campo e assinatura formal.
2. **Laudo Técnico de Conformidade e Segurança Digital (A4):** Documento consultivo para o comerciante com selos de segurança e certificação digital 2026.
3. **Dossiê Executivo de Risco & Retenção da Carteira (A4):** Painel macro para diretoria com volume de receita sob risco (R$ 189K/dia) e plano diretor.
4. **Gráfico de Decomposição de Perdas (Base 100):** Visualização analítica das fatias de penalidade de saúde por pilar.

---

## 🏗️ 5. Arquitetura do Repositório

```bash
hackathon-2026/
├── main.py                     # Ponto de entrada Uvicorn para deploy na nuvem ($PORT)
├── requirements.txt            # Dependências Python (FastAPI, Scikit-Learn, Playwright, etc.)
├── render.yaml                 # Manifesto de infraestrutura como código (IaC) para Render
├── vercel.json                 # Configurações de rotas e rewrites para Vercel
├── backend/                    # Microsserviço de Backend & Inteligência
│   ├── app.py                  # Aplicação FastAPI, rotas REST e CORS
│   ├── health_engine.py        # Motor algorítmico do CHS e Isolation Forest
│   ├── data_simulator.py       # Simulação estocástica de clientes e telemetria
│   └── ai_copilot.py           # Conexão com LLM para mensagens personalizadas
├── frontend/                   # Interface Single Page Application (SPA)
│   ├── index.html              # Estrutura HTML5 com modais e relatórios A4
│   ├── styles.css              # Design System oficial da BVX Tecnologia
│   ├── app.js                  # Lógica assíncrona, Chart.js e controle de estado
│   └── assets/                 # Logotipos oficiais, favicon e imagens
├── docs/                       # Entregáveis Oficiais do Hackathon
│   ├── relatorio_completo_bvx360.pdf  # Dossiê técnico completo (9 páginas A4)
│   ├── modelo_canvas_bvx360.pdf       # Modelo Canvas em A4 Paisagem
│   ├── modelo_canvas_bvx360.md        # Documentação detalhada do Canvas v2.0
│   └── Pitch.mp4                      # Vídeo gravado do pitch (1080p, 2m09s)
└── scratch_colab.ipynb         # Notebook de modelagem estatística e ML
```

---

## 💻 6. Execução Local

### Pré-requisitos
* Python 3.10 ou superior
* Git instalado

### Passo a Passo

```bash
# 1. Clone o repositório
git clone https://github.com/BDantas1983/hackathon-2026.git
cd hackathon-2026

# 2. Crie e ative um ambiente virtual (opcional)
python -m venv .venv
# No Windows:
.venv\Scripts\activate
# No Linux/Mac:
source .venv/bin/activate

# 3. Instale as dependências
pip install -r requirements.txt

# 4. Inicie o servidor local
python main.py

# 5. Acesse no navegador
# Frontend & Dashboard: http://localhost:8000
# Documentação da API: http://localhost:8000/docs
```

---

## 🏆 Grupo Fundação — Hackathon FATECOU 2026
*Desenvolvido com excelência técnica, inteligência preditiva e foco em valor real para a BVX Tecnologia.*
