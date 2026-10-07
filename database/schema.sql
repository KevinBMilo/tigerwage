CREATE DATABASE IF NOT EXISTS occupation;
USE occupation;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email_verified_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  first_name VARCHAR(100) NULL AFTER email,
  last_name VARCHAR(100) NULL AFTER first_name,
  phone VARCHAR(30) NULL AFTER last_name,
  location VARCHAR(150) NULL AFTER phone,
  linkedin_url VARCHAR(500) NULL AFTER location,
  portfolio_url VARCHAR(500) NULL AFTER linkedin_url;

);

CREATE TABLE refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE email_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  purpose ENUM('verify_email', 'reset_password') NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE resumes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  size_bytes INT NOT NULL,
  s3_key VARCHAR(500) NOT NULL UNIQUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_resumes_user_nickname (user_id, nickname),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  company VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  status ENUM('applied','interviewing','offer','rejected') DEFAULT 'applied',
  applied_date DATE,
  interview_date DATE NULL,
  follow_up_date DATE NULL,
  notes TEXT,
  interview_reminder_sent_at DATETIME NULL,
  follow_up_reminder_sent_at DATETIME NULL,
  resume_id INT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, 
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
);

CREATE TABLE documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  file_name VARCHAR(255),
  content_type VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INT NOT NULL DEFAULT 0,
  s3_key VARCHAR(500),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_documents_s3_key (s3_key),
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);