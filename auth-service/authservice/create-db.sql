-- User-Service: Tabela de Perfil do Usuário
CREATE TABLE IF NOT EXISTS users.user_profile (
    user_id UUID PRIMARY KEY REFERENCES auth.user_credentials(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(255),
    birth_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
