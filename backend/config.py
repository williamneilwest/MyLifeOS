import os


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-change-in-production')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://lifeos:lifeos@lifeos-db:5432/lifeos')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')
    AI_GATEWAY_URL = os.getenv('AI_GATEWAY_URL', 'http://ai-gateway:5000')
    AI_GATEWAY_CHAT_ENDPOINT = os.getenv('AI_GATEWAY_CHAT_ENDPOINT', '/api/chat')
    AI_GATEWAY_TIMEOUT_SECONDS = float(os.getenv('AI_GATEWAY_TIMEOUT_SECONDS', '20'))
    AI_GATEWAY_RETRIES = int(os.getenv('AI_GATEWAY_RETRIES', '2'))
    AI_GATEWAY_MODEL = os.getenv('AI_GATEWAY_MODEL', os.getenv('OPENAI_MODEL', 'gpt-4.1-mini'))
