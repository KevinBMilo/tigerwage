USE tigerwage;

INSERT INTO job_postings
  (title, company, location, work_mode, employment_type, salary_min, salary_max, description, skills, posted_date)
VALUES
  ('Night Watchman', 'Wayne Enterprises', 'Atlanta, GA', 'hybrid', 'full_time', 70000, 90000,
   'Build and maintain features across our Angular front end and Node.js services. You''ll pair with senior engineers, write tests, and ship to production every week.',
   JSON_ARRAY('Angular', 'TypeScript', 'Node.js', 'MySQL'), CURDATE() - INTERVAL 1 DAY),

  ('Journalist', 'Daily Planet', 'Remote (US)', 'remote', 'full_time', 80000, 105000,
   'Create accessible, responsive patient-facing screens in Angular. Work closely with designers to turn mockups into polished, well-tested components.',
   JSON_ARRAY('Angular', 'RxJS', 'TypeScript', 'Accessibility'), CURDATE() - INTERVAL 2 DAY),

  ('Scientist', 'Star Labs', 'Austin, TX', 'hybrid', 'full_time', 95000, 125000,
   'Design and build APIs on AWS Lambda and API Gateway. Own services end to end, from data modeling in MySQL to monitoring in production.',
   JSON_ARRAY('Node.js', 'AWS Lambda', 'API Gateway', 'MySQL'), CURDATE() - INTERVAL 3 DAY),

  ('Geologist', 'Luthor Corp', 'Chicago, IL', 'onsite', 'full_time', 75000, 95000,
   'Join a small team building internal reporting tools. Great fit for someone early in their career who wants mentorship and real ownership.',
   JSON_ARRAY('TypeScript', 'Node.js', 'SQL', 'Git'), CURDATE() - INTERVAL 4 DAY),

  ('Bioengineer', 'Cadmus', 'Denver, CO', 'remote', 'contract', 60, 80,
   'Six-month contract helping migrate legacy services to AWS. Experience with S3, Lambda, and infrastructure as code is a plus.',
   JSON_ARRAY('AWS', 'S3', 'Lambda', 'TypeScript'), CURDATE() - INTERVAL 5 DAY),

  ('Curator', 'Museum of Antiquities', 'Raleigh, NC', 'hybrid', 'internship', 22, 28,
   'Summer internship building features for our online learning platform. You''ll ship real code, attend code reviews, and present a project at the end.',
   JSON_ARRAY('HTML', 'CSS', 'JavaScript', 'Angular'), CURDATE() - INTERVAL 6 DAY),

  ('Forensics Specialist', 'Central City Police Dept', 'Seattle, WA', 'remote', 'full_time', 100000, 135000,
   'Work across our publishing platform: Angular front end, Node.js APIs, and a MySQL database serving millions of readers.',
   JSON_ARRAY('Angular', 'Node.js', 'MySQL', 'Redis'), CURDATE() - INTERVAL 8 DAY),

  ('Associate Software Engineer', 'Kord Omniversal Research', 'Boston, MA', 'onsite', 'full_time', 85000, 100000,
   'Build secure customer-facing tools in a regulated environment. We value clean code, thorough testing, and clear communication.',
   JSON_ARRAY('TypeScript', 'Angular', 'Security', 'Testing'), CURDATE() - INTERVAL 10 DAY);