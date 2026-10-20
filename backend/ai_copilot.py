"""
Copiloto de IA - BVX Tecnologia 360
Conecta ao FreeLLMAPI local (com rotação de chaves gratuitas) para gerar:
1. Diagnóstico executivo e recomendações prescritivas para o atendente de suporte.
2. Scripts personalizados de contato via WhatsApp ou E-mail em 1 clique.
"""
from openai import OpenAI
import os

# Configuração do cliente FreeLLMAPI
API_KEY = os.getenv("FREELLM_API_KEY", "freellmapi-e1c9bac55bc136db7ecbbca846d14dc27bf101f279302cda")
BASE_URL = os.getenv("FREELLM_BASE_URL", "http://localhost:3001/v1")

client = OpenAI(
    base_url=BASE_URL,
    api_key=API_KEY
)

def gerar_diagnostico_cliente(cliente: dict) -> dict:
    """
    Gera diagnóstico analítico e ações recomendadas para a equipe interna da BVX.
    """
    prompt = f"""
Você é o Copiloto de Inteligência Artificial da BVX Tecnologia, focado em Sucesso do Cliente e Prevenção de Churn.
Analise a telemetria do seguinte cliente:

- Nome Fantasia: {cliente.get('nome_fantasia')}
- Responsável: {cliente.get('responsavel')}
- Cidade: {cliente.get('cidade')} - {cliente.get('uf')}
- Versão Instalada: {cliente.get('versao_sistema')} (Versão Atual Homologada: {cliente.get('versao_atual_homologada')})
- Dias sem Backup: {cliente.get('dias_sem_backup')} dias (Integridade: {'OK' if cliente.get('backup_integro') else 'Falha/Corrompido'})
- Variação nas Vendas no último mês: {cliente.get('variacao_vendas_pct')}%
- Chamados de Suporte nos últimos 30 dias: {cliente.get('chamados_ultimos_30d')}
- Faturamento Diário Estimado: R$ {cliente.get('faturamento_diario_estimado', 0):,.2f}
- Health Score Atual: {cliente.get('health_score', 'N/A')}/100 ({cliente.get('risco', 'N/A')})

Responda em formato estruturado e direto:
1. DIAGNÓSTICO (máximo 3 frases diretas explicando o porquê o cliente está nesse estado de risco).
2. IMPACTO NO NEGÓCIO (qual o risco real para a BVX e para o comerciante).
3. PLANO DE AÇÃO PRIORITÁRIO (3 passos práticos para o atendente da BVX executar hoje).
"""
    try:
        response = client.chat.completions.create(
            model="auto",
            messages=[
                {"role": "system", "content": "Você é um especialista em Customer Success e Suporte Técnico para ERPs comerciais."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.4
        )
        conteudo = response.choices[0].message.content
        return {
            "sucesso": True,
            "diagnostico": conteudo,
            "modelo_utilizado": "FreeLLMAPI Auto-Fallback"
        }
    except Exception as e:
        # Fallback offline inteligente caso a API local esteja reiniciando
        fallback = f"""
**DIAGNÓSTICO AUTOMÁTICO (Offline Mode):**
O cliente {cliente.get('nome_fantasia')} apresenta vulnerabilidade crítica devido à defasagem da versão ({cliente.get('versao_sistema')}) e {cliente.get('dias_sem_backup')} dias sem rotina de backup válida. A oscilação de {cliente.get('variacao_vendas_pct')}% nas vendas sinaliza possível desuso ou instabilidade operacional.

**PLANO DE AÇÃO IMEDIATO:**
1. Realizar contato ativo com {cliente.get('responsavel')} ({cliente.get('telefone')}).
2. Agendar atualização remota assistida para a versão homologada 5.4.2.
3. Forçar sincronização imediata do backup em nuvem com validação de hash.
"""
        return {
            "sucesso": False,
            "erro": str(e),
            "diagnostico": fallback,
            "modelo_utilizado": "Regras Locais (Fallback)"
        }

def gerar_mensagem_contato(cliente: dict, canal: str = "whatsapp") -> dict:
    """
    Gera uma mensagem altamente empática, consultiva e profissional para o cliente.
    """
    prompt = f"""
Crie uma mensagem curta, extremamente cordial e profissional para ser enviada pela equipe de Sucesso do Cliente da BVX Tecnologia para o comerciante.

Dados:
- Responsável: {cliente.get('responsavel')}
- Estabelecimento: {cliente.get('nome_fantasia')}
- Canal: {canal.upper()}
- Pontos de atenção a abordar com delicadeza:
  * Manutenção preventiva gratuita da rotina de backup (segurança dos dados fiscais e de estoque).
  * Atualização gratuita para os novos recursos da versão {cliente.get('versao_atual_homologada')}.
  * Suporte proativo para saber como o sistema pode ajudá-lo a acelerar as vendas este mês.

Regras:
- Não cause pânico.
- Mostre cuidado e parceria ("Queremos garantir que seu estabelecimento esteja 100% protegido e rodando liso").
- Chame para uma ação rápida (ex: 'podemos agendar 10 minutos hoje à tarde para realizarmos isso remotamente sem custo?').
- Não inclua placeholders como [Seu Nome], use 'Equipe BVX Tecnologia'.
"""
    try:
        response = client.chat.completions.create(
            model="auto",
            messages=[
                {"role": "system", "content": "Você é especialista em atendimento ao cliente empático e proativo."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5
        )
        msg = response.choices[0].message.content
        return {
            "sucesso": True,
            "mensagem": msg,
            "canal": canal
        }
    except Exception as e:
        msg_fallback = (
            f"Olá {cliente.get('responsavel')}, tudo bem? Aqui é da equipe da BVX Tecnologia! "
            f"Passando para cuidar do {cliente.get('nome_fantasia')}. Notamos que sua versão do sistema "
            f"possui novas atualizações gratuitas de desempenho e queremos fazer uma checagem preventiva no seu backup, "
            f"garantindo a total segurança dos seus dados fiscais. "
            f"Podemos agendar 10 minutinhos hoje para fazermos essa atualização remota rápida sem nenhum custo?"
        )
        return {
            "sucesso": False,
            "mensagem": msg_fallback,
            "canal": canal
        }
