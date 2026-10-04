USE occupation;

INSERT INTO users (email, password_hash)
VALUES ('demo@example.com', 'placeholder');

INSERT INTO applications (user_id, company, position, status, applied_date, notes) VALUES
(1, 'Acme Corp', 'Junior Developer', 'applied', '2026-09-20', 'Applied through LinkedIn'),
(1, 'Globex', 'Frontend Engineer', 'interviewing', '2026-09-15', 'Phone screen went well'),
(1, 'Initech', 'Full Stack Developer', 'rejected', '2026-09-01', NULL);