-- Initialize database with default schemas and data
-- This file is run automatically by PostgreSQL in Docker

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database if it doesn't exist (this is handled by Docker's POSTGRES_DB)
-- The database 'voice_sales_trainer' is already created by Docker

-- Grant permissions to the user
GRANT ALL PRIVILEGES ON DATABASE voice_sales_trainer TO voice_trainer;

-- Set default schema permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO voice_trainer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO voice_trainer;

-- Create indexes for better performance (will be created after tables are made by Alembic)
-- These will be added by the application's migration system