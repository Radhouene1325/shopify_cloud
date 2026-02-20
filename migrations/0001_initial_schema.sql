-- Migration number: 0001 	 2026-02-20T01:27:31.998Z
CREATE TABLE IF NOT EXISTS descreption (
  id TEXT PRIMARY KEY,
  short_description TEXT,
  detailed_description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);