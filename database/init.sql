-- Initialize CRM Database
CREATE DATABASE crm_database;
CREATE USER crm_user WITH PASSWORD 'crm_password';

-- Connect to the database
\c crm_database;

-- Grant all privileges to crm_user
GRANT ALL PRIVILEGES ON DATABASE crm_database TO crm_user;
GRANT ALL ON SCHEMA public TO crm_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO crm_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO crm_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO crm_user;

-- Grant CREATE privileges
GRANT CREATE ON SCHEMA public TO crm_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO crm_user;

-- Make crm_user the owner of the database
ALTER DATABASE crm_database OWNER TO crm_user;
