"""
Ponto de Entrada da Aplicação BVX 360
Hackathon Fatecou 2026 / BVX Tecnologia

Execute: python main.py
Acesse: http://localhost:8000
"""
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Iniciando Plataforma BVX 360 na porta {port}...")
    print(f"Acesse no navegador: http://localhost:{port}")
    uvicorn.run("backend.app:app", host="0.0.0.0", port=port)
