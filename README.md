# 🛡️ Plataforma BVX 360: Inteligência, Prevenção e Ação

> **XX Semana de Tecnologia e Hackathon FATECOU 2026**  
> **Desafio BVX Tecnologia:** *"CLIENTE 360! Quem precisa da nossa atenção antes que um problema aconteça?"*  
> **Grupo:** **Fundação**  
> **Integrantes da Equipe:** **Adolfo**, **Brisa** e **João Lucas**  
> **Compromisso ODS (ONU):** **ODS 8** (Trabalho Decente e Crescimento Econômico) & **ODS 9** (Indústria, Inovação e Infraestrutura).

---

## 🎯 1. Visão Geral do Projeto

A **BVX 360** é uma plataforma de inteligência preditiva e suporte proativo desenvolvida sob medida para a **BVX Tecnologia**. 

Com uma carteira de mais de **5.000 PDVs**, 20+ cidades e R$ 2M transacionados diariamente para uma equipe de 15 colaboradores, o acompanhamento reativo é insustentável. A plataforma BVX 360 centraliza e traduz a telemetria técnica e comportamental dos clientes em um **Índice de Saúde (Customer Health Score - CHS de 0 a 100)**, permitindo à equipe antecipar problemas, priorizar atendimentos e erradicar o churn.

---

## 🏗️ 2. Os 3 Pilares do Desafio BVX

A solução monitora continuamente os três pilares críticos apontados pela BVX:

1. **📦 Versionamento:** Monitora a defasagem entre a versão instalada no PDV e a versão homologada (5.4.2), prevenindo instabilidades e chamados recorrentes.
2. **💾 Backups:** Inspeciona a periodicidade (dias sem backup) e integridade dos arquivos em nuvem, eliminando o risco catastrófico de perda de dados fiscais e de estoque.
3. **📉 Churn (Sinais de Abandono):** Cruza a variação percentual de vendas/uso diário com o histórico de chamados de suporte nos últimos 30 dias.

---

## 🧮 3. Cálculo Explicável do Índice de Saúde (Health Score)

Diferente de modelos "caixa-preta", o Health Score da BVX 360 é **100% explicável e transparente** para a equipe de suporte:

$$\text{Health Score} = (\text{Score}_{\text{Backup}} \times 0.30) + (\text{Score}_{\text{Versão}} \times 0.25) + (\text{Score}_{\text{Vendas}} \times 0.25) + (\text{Score}_{\text{Chamados}} \times 0.20)$$

### Faixas de Risco:
* 🔴 **0 a 49 - ALTO RISCO (Priorizar Atendimento):** Falhas críticas de backup, versão defasada ou queda acentuada de vendas.
* 🟡 **50 a 74 - ATENÇÃO (Acompanhar Sinais):** Desvios moderados de uso ou versão anterior.
* 🟢 **75 a 100 - BAIXO RISCO (Cliente Saudável):** Operação estável, backup diário íntegro e versão homologada.

---

## 🚀 4. Diferenciais de Alto Impacto

### ⚡ A. Simulador de Impacto ("E se...?")
Permite que o atendente ou gestor simule em tempo real o ganho de pontuação antes de entrar em contato:
* *"E se atualizarmos para a versão 5.4.2?"* (+20 pts)
* *"E se executarmos a rotina de backup hoje?"* (+30 pts)
* *"E se concluirmos os chamados abertos?"* (+15 pts)

### 🤖 B. Copiloto de IA Integrado (FreeLLMAPI)
Utilizando o motor local FreeLLMAPI com fallback inteligente entre provedores gratuitos:
* **Diagnóstico Preditivo:** A IA resume em 3 linhas a causa-raiz da vulnerabilidade do cliente e prescreve o plano de ação ideal.
* **Scripts de Atendimento Personalizados em 1 Clique:** Redige mensagens empáticas e consultivas para envio imediato via **WhatsApp Web** ou **E-mail**, eliminando a fricção de contato.

### 🧠 C. Machine Learning (Clusterização K-Means)
Identificação de clusters comportamentais ocultos (ex: *"Clientes Silenciosos"* que reduzem faturamento sem abrir chamados).

---

## 🌍 5. Alinhamento aos Objetivos de Desenvolvimento Sustentável (ODS)

* **ODS 8 (Trabalho Decente e Crescimento Econômico):** Protege comerciantes locais contra perdas fiscais, paradas operacionais e riscos de falência por perda de dados.
* **ODS 9 (Indústria, Inovação e Infraestrutura):** Promove infraestrutura de TI resiliente, automação de processos e segurança cibernética para o comércio regional.

---

## 💻 6. Como Executar Localmente

### Pré-requisitos
* Python 3.10+
* FreeLLMAPI rodando na porta `3001` (para as funções de IA)

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/BDantas1983/hackathon-2026.git
   cd hackathon-2026
   ```

2. **Instale as dependências:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Inicie a aplicação:**
   ```bash
   python main.py
   ```

4. **Acesse no navegador:**
   👉 `http://localhost:8000`

---

## ☁️ 7. Guia de Deploy

* **Frontend:** Pronto para Vercel ou Netlify (pasta `frontend/`).
* **Backend:** Pronto para Render, Railway ou Fly.io (`uvicorn backend.app:app --host 0.0.0.0 --port $PORT`).
