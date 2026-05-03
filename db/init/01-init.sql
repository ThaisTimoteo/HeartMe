CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS posts;
CREATE SCHEMA IF NOT EXISTS notifications;

CREATE TABLE IF NOT EXISTS auth.user_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.user_credentials(id) ON DELETE CASCADE,
    username VARCHAR(40) UNIQUE,
    name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(255),
    preferences TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users.user_profiles ADD COLUMN IF NOT EXISTS username VARCHAR(40);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_profiles_username ON users.user_profiles (LOWER(username)) WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS posts.post (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.user_credentials(id) ON DELETE CASCADE,
    title VARCHAR(255),
    content TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts.post_images (
    post_id UUID REFERENCES posts.post(id) ON DELETE CASCADE,
    images TEXT
);


CREATE TABLE IF NOT EXISTS posts.post_keywords (
    post_id UUID REFERENCES posts.post(id) ON DELETE CASCADE,
    keywords TEXT
);

CREATE TABLE IF NOT EXISTS posts.likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts.post(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.user_credentials(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_likes_post_user ON posts.likes (post_id, user_id);

CREATE TABLE IF NOT EXISTS notifications.notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES auth.user_credentials(id) ON DELETE CASCADE,
    actor_user_id UUID NOT NULL REFERENCES auth.user_credentials(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    message TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);


ALTER TABLE posts.post ALTER COLUMN content DROP NOT NULL;
