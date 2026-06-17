export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS repositories (
  id              TEXT PRIMARY KEY,
  github_url      TEXT NOT NULL UNIQUE,
  owner           TEXT NOT NULL,
  name            TEXT NOT NULL,
  default_branch  TEXT NOT NULL DEFAULT 'main',
  description     TEXT,
  language        TEXT,
  stars           INTEGER NOT NULL DEFAULT 0,
  clone_status    TEXT NOT NULL DEFAULT 'pending'
                  CHECK(clone_status IN ('pending','queued','cloning','cloned','failed')),
  parse_status    TEXT NOT NULL DEFAULT 'pending'
                  CHECK(parse_status IN ('pending','queued','parsing','parsed','failed')),
  embed_status    TEXT NOT NULL DEFAULT 'pending'
                  CHECK(embed_status IN ('pending','queued','embedding','embedded','failed')),
  last_synced_at  TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id              TEXT PRIMARY KEY,
  repo_id         TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  type            TEXT NOT NULL
                  CHECK(type IN ('clone','parse','embed','index','generate_docs','generate_architecture')),
  status          TEXT NOT NULL DEFAULT 'queued'
                  CHECK(status IN ('queued','running','completed','failed','cancelled')),
  error           TEXT,
  progress        INTEGER NOT NULL DEFAULT 0,
  started_at      TEXT,
  completed_at    TEXT,
  created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_repo_id ON jobs(repo_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_repos_github_url ON repositories(github_url);

CREATE TABLE IF NOT EXISTS parsed_symbols (
  id              TEXT PRIMARY KEY,
  repo_id         TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  symbol_type     TEXT NOT NULL
                  CHECK(symbol_type IN ('function','class','interface','type','import','export','component','api_route')),
  file_path       TEXT NOT NULL,
  line_number     INTEGER NOT NULL,
  column_number   INTEGER NOT NULL,
  exported        INTEGER NOT NULL DEFAULT 0,
  source_code     TEXT NOT NULL,
  metadata        TEXT NOT NULL DEFAULT '{}',
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dependencies (
  id              TEXT PRIMARY KEY,
  repo_id         TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  source_id       TEXT NOT NULL,
  target_id       TEXT,
  source_symbol   TEXT NOT NULL,
  target_symbol   TEXT NOT NULL,
  source_file     TEXT NOT NULL,
  target_file     TEXT NOT NULL,
  relationship    TEXT NOT NULL
                  CHECK(relationship IN ('imports','exports','extends','implements','composes')),
  created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_symbols_repo_id ON parsed_symbols(repo_id);
CREATE INDEX IF NOT EXISTS idx_symbols_name ON parsed_symbols(name);
CREATE INDEX IF NOT EXISTS idx_symbols_type ON parsed_symbols(symbol_type);
CREATE INDEX IF NOT EXISTS idx_dependencies_repo_id ON dependencies(repo_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_source ON dependencies(source_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_target ON dependencies(target_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_relation ON dependencies(relationship);
CREATE INDEX IF NOT EXISTS idx_symbols_repo_type ON parsed_symbols(repo_id, symbol_type);
CREATE INDEX IF NOT EXISTS idx_dependencies_repo_relation ON dependencies(repo_id, relationship);

CREATE TABLE IF NOT EXISTS documents (
  id              TEXT PRIMARY KEY,
  repo_id         TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  doc_type        TEXT NOT NULL
                  CHECK(doc_type IN ('readme','api_doc','setup_guide','architecture_doc','feature_doc')),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  content         TEXT NOT NULL,
  word_count      INTEGER NOT NULL DEFAULT 0,
  model           TEXT NOT NULL DEFAULT '',
  generated_at    TEXT NOT NULL,
  created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_repo_id ON documents(repo_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);
`;
