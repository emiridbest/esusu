import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'a_default_secret_key'
    DEBUG = os.environ.get('DEBUG') == 'True'
    TESTING = os.environ.get('TESTING') == 'True'
    DATABASE_URI = os.environ.get('DATABASE_URI') or 'sqlite:///app.db' # Yet to set this up
    JSON_SORT_KEYS = False

class ProductionConfig(Config):
    DEBUG = False

class DevelopmentConfig(Config):
    DEBUG = True

class TestingConfig(Config):
    TESTING = True