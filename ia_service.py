from openai import OpenAI

# Configura o cliente para apontar para o teu servidor FreeLLMAPI local
client = OpenAI(
    base_url="http://localhost:3001/v1",
    api_key="freellmapi-e1c9bac55bc136db7ecbbca846d14dc27bf101f279302cda"
)

def perguntar_ao_assistente(pergunta):
    response = client.chat.completions.create(
        model="auto",  # O FreeLLMAPI encarrega-se de escolher e fazer fallback entre as APIs gratuitas
        messages=[
            {"role": "system", "content": "És um assistente útil."},
            {"role": "user", "content": pergunta}
        ]
    )
    return response.choices[0].message.content

# Teste rápido
if __name__ == "__main__":
    resposta = perguntar_ao_assistente("Como automatizar uma tarefa em Python?")
    print(resposta)
