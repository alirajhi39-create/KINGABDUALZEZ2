// Shared server code lives outside api/ so Vercel deploys only the route handler.
import { randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.TEACHER_ACCESS_CODE && process.env.TEACHER_ACCESS_CODE.length >= 8);
}

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

export function newCode(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(length), (byte) => alphabet[byte % alphabet.length]).join("");
}

let schemaReady: Promise<void> | null = null;

export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = createSchema().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

async function createSchema() {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS lesson_classrooms (
      id text PRIMARY KEY,
      name text NOT NULL,
      access_code text NOT NULL UNIQUE,
      active_strategy text NOT NULL DEFAULT 'brainstorm',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`ALTER TABLE lesson_classrooms ADD COLUMN IF NOT EXISTS lesson_controls jsonb NOT NULL DEFAULT '{}'::jsonb`;
  await sql`
    CREATE TABLE IF NOT EXISTS lesson_students (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      classroom_id text NOT NULL REFERENCES lesson_classrooms(id),
      display_name text NOT NULL,
      pin_hash text NOT NULL,
      pin_salt text NOT NULL,
      joined_at timestamptz NOT NULL DEFAULT now(),
      last_seen timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS lesson_students_name_unique ON lesson_students (classroom_id, lower(display_name))`;
  await sql`
    CREATE TABLE IF NOT EXISTS lesson_sessions (
      token_hash text PRIMARY KEY,
      role text NOT NULL CHECK (role IN ('student', 'teacher')),
      student_id uuid REFERENCES lesson_students(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS lesson_progress (
      student_id uuid PRIMARY KEY REFERENCES lesson_students(id) ON DELETE CASCADE,
      current_page integer NOT NULL DEFAULT 0,
      visited_pages integer[] NOT NULL DEFAULT ARRAY[0],
      quiz_score integer,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS quiz_total integer`;
  await sql`
    CREATE TABLE IF NOT EXISTS lesson_contests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      classroom_id text NOT NULL REFERENCES lesson_classrooms(id),
      code text NOT NULL UNIQUE,
      title text NOT NULL,
      status text NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'live', 'finished')),
      question_index integer NOT NULL DEFAULT 0,
      question_count integer NOT NULL DEFAULT 10,
      seconds_per_question integer NOT NULL DEFAULT 30,
      question_started_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      finished_at timestamptz
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS lesson_one_active_contest ON lesson_contests (classroom_id) WHERE status IN ('lobby', 'live')`;
  await sql`
    CREATE TABLE IF NOT EXISTS lesson_board_results (
      id uuid PRIMARY KEY,
      classroom_id text NOT NULL REFERENCES lesson_classrooms(id),
      team_a text NOT NULL,
      team_b text NOT NULL,
      score_a integer NOT NULL,
      score_b integer NOT NULL,
      question_count integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS lesson_contest_participants (
      contest_id uuid NOT NULL REFERENCES lesson_contests(id) ON DELETE CASCADE,
      student_id uuid NOT NULL REFERENCES lesson_students(id) ON DELETE CASCADE,
      joined_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (contest_id, student_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS lesson_contest_answers (
      contest_id uuid NOT NULL REFERENCES lesson_contests(id) ON DELETE CASCADE,
      student_id uuid NOT NULL REFERENCES lesson_students(id) ON DELETE CASCADE,
      question_index integer NOT NULL,
      option_index integer NOT NULL,
      is_correct boolean NOT NULL,
      points integer NOT NULL,
      answered_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (contest_id, student_id, question_index)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS lesson_login_attempts (
      key text PRIMARY KEY,
      attempts integer NOT NULL DEFAULT 1,
      window_started_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    INSERT INTO lesson_classrooms (id, name, access_code)
    VALUES ('main', 'الفصل ٦ ب', ${newCode()})
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`UPDATE lesson_classrooms SET name = 'الفصل ٦ ب' WHERE id = 'main' AND name <> 'الفصل ٦ ب'`;
}