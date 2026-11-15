import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { contestQuestions } from "../server/questions";
import { databaseConfigured, ensureSchema, getSql, newCode } from "../server/db";
import { teachingStrategies } from "../src/strategies";
import { normalizeLessonControls } from "../src/lessonControls";
import type { ContestStatus, SchoolRole } from "../src/schoolTypes";

type Payload = Record<string, unknown>;
type Auth = { role: SchoolRole; studentId: string | null; tokenHash: string };

class ApiError extends Error {
  constructor(message: string, public status = 400, public code = "invalid_request") {
    super(message);
  }
}

function respond(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function secureEqual(first: string, second: string) {
  const a = Buffer.from(first);
  const b = Buffer.from(second);
  return a.length === b.length && timingSafeEqual(a, b);
}

function uuid(value: unknown) {
  const id = text(value);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new ApiError("معرّف المسابقة غير صحيح.");
  }
  return id;
}

async function checkAttempts(key: string) {
  const sql = getSql();
  const rows = await sql`SELECT attempts, window_started_at FROM lesson_login_attempts WHERE key = ${key}`;
  if (rows[0] && Number(rows[0].attempts) >= 5 && Date.now() - new Date(String(rows[0].window_started_at)).getTime() < 10 * 60_000) {
    throw new ApiError("محاولات كثيرة. انتظر عشر دقائق ثم حاول مرة أخرى.", 429, "rate_limited");
  }
}

async function recordFailure(key: string) {
  const sql = getSql();
  await sql`
    INSERT INTO lesson_login_attempts (key, attempts, window_started_at)
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN lesson_login_attempts.window_started_at < now() - interval '10 minutes'
        THEN 1 ELSE lesson_login_attempts.attempts + 1 END,
      window_started_at = CASE WHEN lesson_login_attempts.window_started_at < now() - interval '10 minutes'
        THEN now() ELSE lesson_login_attempts.window_started_at END
  `;
}

async function clearFailures(key: string) {
  const sql = getSql();
  await sql`DELETE FROM lesson_login_attempts WHERE key = ${key}`;
}

async function issueSession(role: SchoolRole, studentId: string | null, name: string) {
  const sql = getSql();
  const token = randomBytes(32).toString("base64url");
  await sql`
    INSERT INTO lesson_sessions (token_hash, role, student_id, expires_at)
    VALUES (${hash(token)}, ${role}, ${studentId}, now() + interval '30 days')
  `;
  return { token, role, name, studentId: studentId ?? undefined };
}

async function authenticate(request: Request, required?: SchoolRole): Promise<Auth> {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer || bearer.length > 160) throw new ApiError("يرجى تسجيل الدخول من جديد.", 401, "unauthorized");
  const tokenHash = hash(bearer);
  const sql = getSql();
  const rows = await sql`
    SELECT role, student_id FROM lesson_sessions
    WHERE token_hash = ${tokenHash} AND expires_at > now()
  `;
  if (!rows[0]) throw new ApiError("انتهت الجلسة. سجّل الدخول من جديد.", 401, "unauthorized");
  const role = String(rows[0].role) as SchoolRole;
  if (required && role !== required) throw new ApiError("ليس لديك صلاحية لهذا الإجراء.", 403, "forbidden");
  return { role, studentId: rows[0].student_id ? String(rows[0].student_id) : null, tokenHash };
}

function contestSummary(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    code: String(row.code),
    title: String(row.title),
    status: String(row.status) as ContestStatus,
    questionIndex: Number(row.question_index),
    questionCount: Number(row.question_count),
    secondsPerQuestion: Number(row.seconds_per_question),
    participantCount: Number(row.participant_count ?? 0),
    createdAt: String(row.created_at),
  };
}

async function teacherLogin(request: Request, body: Payload) {
  const supplied = text(body.code);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const key = hash(`teacher:${ip}`);
  await checkAttempts(key);
  if (!supplied || !secureEqual(supplied, process.env.TEACHER_ACCESS_CODE ?? "")) {
    await recordFailure(key);
    throw new ApiError("رمز دخول المعلم غير صحيح.", 401, "invalid_credentials");
  }
  await clearFailures(key);
  return { session: await issueSession("teacher", null, "المعلم") };
}

async function studentLogin(request: Request, body: Payload) {
  const sql = getSql();
  const name = text(body.name).replace(/\s+/g, " ");
  const pin = normalDigits(text(body.pin));
  const classroomCode = text(body.classroomCode).toUpperCase();
  if (name.length < 2 || name.length > 40 || !/^\d{4,6}$/.test(pin) || classroomCode.length !== 6) {
    throw new ApiError("أدخل اسمك ورمز الصف ورمزاً شخصياً من ٤ إلى ٦ أرقام.");
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const key = hash(`student:${name.toLowerCase()}:${ip}`);
  await checkAttempts(key);
  const classroom = await sql`SELECT id FROM lesson_classrooms WHERE id = 'main' AND access_code = ${classroomCode}`;
  if (!classroom[0]) {
    await recordFailure(key);
    throw new ApiError("رمز الصف أو بيانات الدخول غير صحيحة.", 401, "invalid_credentials");
  }
  const existing = await sql`
    SELECT id, pin_hash, pin_salt FROM lesson_students
    WHERE classroom_id = 'main' AND lower(display_name) = lower(${name})
  `;
  let studentId: string;
  if (existing[0]) {
    const candidate = scryptSync(pin, String(existing[0].pin_salt), 64);
    const stored = Buffer.from(String(existing[0].pin_hash), "hex");
    if (candidate.length !== stored.length || !timingSafeEqual(candidate, stored)) {
      await recordFailure(key);
      throw new ApiError("رمز الصف أو بيانات الدخول غير صحيحة.", 401, "invalid_credentials");
    }
    studentId = String(existing[0].id);
    await sql`UPDATE lesson_students SET last_seen = now() WHERE id = ${studentId}::uuid`;
  } else {
    const salt = randomBytes(16).toString("hex");
    const pinHash = scryptSync(pin, salt, 64).toString("hex");
    const created = await sql`
      INSERT INTO lesson_students (classroom_id, display_name, pin_hash, pin_salt)
      VALUES ('main', ${name}, ${pinHash}, ${salt})
      ON CONFLICT DO NOTHING RETURNING id
    `;
    if (!created[0]) throw new ApiError("هذا الاسم مستخدم. ادخل برمزك الشخصي أو اطلب المساعدة من المعلم.", 409);
    studentId = String(created[0].id);
  }
  await clearFailures(key);
  return { session: await issueSession("student", studentId, name) };
}

async function studentOverview(studentId: string) {
  const sql = getSql();
  const [classroom] = await sql`SELECT name, active_strategy, lesson_controls FROM lesson_classrooms WHERE id = 'main'`;
  const [progress] = await sql`
    SELECT current_page, visited_pages, quiz_score, quiz_total, updated_at FROM lesson_progress
    WHERE student_id = ${studentId}::uuid
  `;
  const contests = await sql`
    SELECT c.*, (SELECT count(*)::integer FROM lesson_contest_participants WHERE contest_id = c.id) AS participant_count
    FROM lesson_contests c
    JOIN lesson_contest_participants cp ON cp.contest_id = c.id
    WHERE cp.student_id = ${studentId}::uuid
    ORDER BY c.created_at DESC LIMIT 5
  `;
  await sql`UPDATE lesson_students SET last_seen = now() WHERE id = ${studentId}::uuid`;
  return {
    classroom: { name: String(classroom.name), activeStrategy: String(classroom.active_strategy), controls: normalizeLessonControls(classroom.lesson_controls) },
    progress: {
      currentPage: Number(progress?.current_page ?? 0),
      visited: Array.isArray(progress?.visited_pages) ? progress.visited_pages.map(Number) : [0],
      quizScore: progress?.quiz_score == null ? null : Number(progress.quiz_score),
      quizTotal: progress?.quiz_total == null ? null : Number(progress.quiz_total),
      updatedAt: progress?.updated_at ? String(progress.updated_at) : undefined,
    },
    joinedContests: contests.map((row) => contestSummary(row)),
  };
}

async function teacherOverview() {
  const sql = getSql();
  const [classroom] = await sql`SELECT name, access_code, active_strategy, lesson_controls FROM lesson_classrooms WHERE id = 'main'`;
  const students = await sql`
    SELECT s.id, s.display_name, s.joined_at, s.last_seen,
      coalesce(p.current_page, 0) AS current_page,
      coalesce(cardinality(p.visited_pages), 1) AS visited_count,
      p.quiz_score, p.quiz_total
    FROM lesson_students s LEFT JOIN lesson_progress p ON p.student_id = s.id
    WHERE s.classroom_id = 'main' ORDER BY s.joined_at DESC
  `;
  const contests = await sql`
    SELECT c.*, (SELECT count(*)::integer FROM lesson_contest_participants WHERE contest_id = c.id) AS participant_count
    FROM lesson_contests c WHERE c.classroom_id = 'main'
    ORDER BY c.created_at DESC LIMIT 12
  `;
  const boardResults = await sql`
    SELECT id, team_a, team_b, score_a, score_b, question_count, created_at
    FROM lesson_board_results WHERE classroom_id = 'main'
    ORDER BY created_at DESC LIMIT 10
  `;
  return {
    classroom: {
      name: String(classroom.name),
      accessCode: String(classroom.access_code),
      activeStrategy: String(classroom.active_strategy),
      controls: normalizeLessonControls(classroom.lesson_controls),
    },
    students: students.map((student) => ({
      id: String(student.id),
      name: String(student.display_name),
      joinedAt: String(student.joined_at),
      lastSeen: String(student.last_seen),
      currentPage: Number(student.current_page),
      visitedCount: Number(student.visited_count),
      quizScore: student.quiz_score == null ? null : Number(student.quiz_score),
      quizTotal: student.quiz_total == null ? null : Number(student.quiz_total),
    })),
    contests: contests.map((row) => contestSummary(row)),
    boardResults: boardResults.map((row) => ({
      id: String(row.id),
      teamA: String(row.team_a),
      teamB: String(row.team_b),
      scoreA: Number(row.score_a),
      scoreB: Number(row.score_b),
      questionCount: Number(row.question_count),
      createdAt: String(row.created_at),
    })),
  };
}

async function saveBoardResult(body: Payload) {
  const sql = getSql();
  const gameId = uuid(body.gameId);
  const teamA = text(body.teamA).replace(/\s+/g, " ");
  const teamB = text(body.teamB).replace(/\s+/g, " ");
  const scoreA = number(body.scoreA);
  const scoreB = number(body.scoreB);
  const questionCount = number(body.questionCount);
  if (teamA.length < 2 || teamA.length > 30 || teamB.length < 2 || teamB.length > 30
    || ![5, 10].includes(questionCount)
    || !Number.isInteger(scoreA) || !Number.isInteger(scoreB)
    || scoreA < 0 || scoreB < 0 || scoreA > questionCount * 10 || scoreB > questionCount * 10
    || scoreA % 10 !== 0 || scoreB % 10 !== 0) {
    throw new ApiError("نتيجة مسابقة السبورة غير صحيحة.");
  }
  await sql`
    INSERT INTO lesson_board_results (id, classroom_id, team_a, team_b, score_a, score_b, question_count)
    VALUES (${gameId}::uuid, 'main', ${teamA}, ${teamB}, ${scoreA}, ${scoreB}, ${questionCount})
    ON CONFLICT (id) DO NOTHING
  `;
  const [saved] = await sql`
    SELECT id, team_a, team_b, score_a, score_b, question_count, created_at
    FROM lesson_board_results WHERE id = ${gameId}::uuid AND classroom_id = 'main'
  `;
  return { result: {
    id: String(saved.id),
    teamA: String(saved.team_a),
    teamB: String(saved.team_b),
    scoreA: Number(saved.score_a),
    scoreB: Number(saved.score_b),
    questionCount: Number(saved.question_count),
    createdAt: String(saved.created_at),
  } };
}

async function saveProgress(studentId: string, body: Payload) {
  const sql = getSql();
  const currentPage = number(body.currentPage);
  if (currentPage < 0 || currentPage > 5) throw new ApiError("الصفحة غير صحيحة.");
  const visited = Array.isArray(body.visited)
    ? [...new Set([...body.visited.map(Number).filter((page) => Number.isInteger(page) && page >= 0 && page <= 5), currentPage])]
    : [currentPage];
  const quizScore = body.quizScore == null ? null : number(body.quizScore);
  if (quizScore !== null && (quizScore < 0 || quizScore > 10)) throw new ApiError("الدرجة غير صحيحة.");
  const quizTotal = body.quizTotal == null ? (quizScore === null ? null : 10) : number(body.quizTotal);
  if (quizTotal !== null && (quizTotal < 1 || quizTotal > 10 || (quizScore !== null && quizScore > quizTotal))) throw new ApiError("عدد أسئلة الاختبار غير صحيح.");
  await sql`
    INSERT INTO lesson_progress (student_id, current_page, visited_pages, quiz_score, quiz_total)
    VALUES (${studentId}::uuid, ${currentPage}, string_to_array(${visited.join(",")}, ',')::integer[], ${quizScore}, ${quizTotal})
    ON CONFLICT (student_id) DO UPDATE SET
      current_page = excluded.current_page,
      visited_pages = excluded.visited_pages,
      quiz_score = coalesce(excluded.quiz_score, lesson_progress.quiz_score),
      quiz_total = coalesce(excluded.quiz_total, lesson_progress.quiz_total),
      updated_at = now()
  `;
  return { saved: true };
}

async function createContest(body: Payload) {
  const sql = getSql();
  const title = text(body.title).slice(0, 80);
  const questionCount = number(body.questionCount);
  const secondsPerQuestion = number(body.secondsPerQuestion);
  if (title.length < 3 || ![5, 10].includes(questionCount) || ![15, 20, 30, 45, 60].includes(secondsPerQuestion)) {
    throw new ApiError("تحقق من عنوان المسابقة وعدد أسئلتها والوقت المحدد.");
  }
  const active = await sql`SELECT id FROM lesson_contests WHERE classroom_id = 'main' AND status IN ('lobby', 'live') LIMIT 1`;
  if (active[0]) throw new ApiError("أنهِ المسابقة الحالية قبل إنشاء مسابقة جديدة.", 409);
  const code = newCode();
  const [contest] = await sql`
    INSERT INTO lesson_contests (classroom_id, code, title, question_count, seconds_per_question)
    VALUES ('main', ${code}, ${title}, ${questionCount}, ${secondsPerQuestion})
    RETURNING *
  `;
  return { contest: contestSummary({ ...contest, participant_count: 0 }) };
}

async function controlContest(body: Payload) {
  const sql = getSql();
  const contestId = uuid(body.contestId);
  const command = text(body.command);
  const [contest] = await sql`SELECT * FROM lesson_contests WHERE id = ${contestId}::uuid AND classroom_id = 'main'`;
  if (!contest) throw new ApiError("لم يتم العثور على المسابقة.", 404);
  if (command === "start" && contest.status === "lobby") {
    await sql`UPDATE lesson_contests SET status = 'live', question_index = 0, question_started_at = now() WHERE id = ${contestId}::uuid`;
  } else if (command === "next" && contest.status === "live") {
    if (Number(contest.question_index) + 1 >= Number(contest.question_count)) {
      await sql`UPDATE lesson_contests SET status = 'finished', finished_at = now() WHERE id = ${contestId}::uuid`;
    } else {
      await sql`UPDATE lesson_contests SET question_index = question_index + 1, question_started_at = now() WHERE id = ${contestId}::uuid`;
    }
  } else if (command === "finish" && contest.status !== "finished") {
    await sql`UPDATE lesson_contests SET status = 'finished', finished_at = now() WHERE id = ${contestId}::uuid`;
  } else {
    throw new ApiError("لا يمكن تنفيذ هذا الإجراء في حالة المسابقة الحالية.", 409);
  }
  return { updated: true };
}

async function joinContest(studentId: string, body: Payload) {
  const sql = getSql();
  const code = text(body.code).toUpperCase();
  const [contest] = await sql`
    SELECT id FROM lesson_contests WHERE code = ${code} AND status IN ('lobby', 'live') AND classroom_id = 'main'
  `;
  if (!contest) throw new ApiError("رمز المسابقة غير صحيح أو أن المسابقة انتهت.", 404);
  const contestId = String(contest.id);
  await sql`
    INSERT INTO lesson_contest_participants (contest_id, student_id)
    VALUES (${contestId}::uuid, ${studentId}::uuid) ON CONFLICT DO NOTHING
  `;
  return { contestId };
}

async function contestState(auth: Auth, body: Payload) {
  const sql = getSql();
  const contestId = uuid(body.contestId);
  const [contest] = await sql`SELECT * FROM lesson_contests WHERE id = ${contestId}::uuid AND classroom_id = 'main'`;
  if (!contest) throw new ApiError("لم يتم العثور على المسابقة.", 404);
  let joined = auth.role === "teacher";
  if (auth.role === "student") {
    const rows = await sql`
      SELECT 1 FROM lesson_contest_participants
      WHERE contest_id = ${contestId}::uuid AND student_id = ${auth.studentId}::uuid
    `;
    joined = Boolean(rows[0]);
    if (!joined) throw new ApiError("انضم إلى المسابقة أولاً باستخدام رمزها.", 403);
  }
  const leaderboardRows = await sql`
    SELECT s.id AS student_id, s.display_name,
      coalesce(sum(a.points), 0)::integer AS points,
      coalesce(sum(CASE WHEN a.is_correct THEN 1 ELSE 0 END), 0)::integer AS correct_count
    FROM lesson_contest_participants cp
    JOIN lesson_students s ON s.id = cp.student_id
    LEFT JOIN lesson_contest_answers a ON a.contest_id = cp.contest_id AND a.student_id = cp.student_id
    WHERE cp.contest_id = ${contestId}::uuid
    GROUP BY s.id, s.display_name, cp.joined_at
    ORDER BY points DESC, cp.joined_at ASC
  `;
  const [counter] = await sql`
    SELECT count(*)::integer AS total FROM lesson_contest_answers
    WHERE contest_id = ${contestId}::uuid AND question_index = ${Number(contest.question_index)}
  `;
  const status = String(contest.status) as ContestStatus;
  const index = Number(contest.question_index);
  const seconds = Number(contest.seconds_per_question);
  const timeLeft = status === "live" && contest.question_started_at
    ? Math.max(0, Math.ceil((new Date(String(contest.question_started_at)).getTime() + seconds * 1000 - Date.now()) / 1000))
    : 0;
  const source = contestQuestions[index];
  let myAnswer;
  if (auth.role === "student" && status !== "lobby") {
    const [answer] = await sql`
      SELECT option_index, is_correct, points FROM lesson_contest_answers
      WHERE contest_id = ${contestId}::uuid AND student_id = ${auth.studentId}::uuid AND question_index = ${index}
    `;
    if (answer) myAnswer = {
      optionIndex: Number(answer.option_index),
      correct: Boolean(answer.is_correct),
      points: Number(answer.points),
      correctIndex: source.correctIndex,
    };
  }
  return {
    ...contestSummary({ ...contest, participant_count: leaderboardRows.length }),
    timeLeft,
    question: status === "live" ? { number: index + 1, total: Number(contest.question_count), prompt: source.prompt, options: [...source.options] } : undefined,
    leaderboard: leaderboardRows.map((entry) => ({
      studentId: String(entry.student_id),
      name: String(entry.display_name),
      points: Number(entry.points),
      correctCount: Number(entry.correct_count),
    })),
    answersCount: Number(counter.total),
    joined,
    myAnswer,
    correctIndex: auth.role === "teacher" ? source.correctIndex : undefined,
  };
}

async function answerContest(studentId: string, body: Payload) {
  const sql = getSql();
  const contestId = uuid(body.contestId);
  const optionIndex = number(body.optionIndex);
  const [contest] = await sql`SELECT * FROM lesson_contests WHERE id = ${contestId}::uuid AND status = 'live' AND classroom_id = 'main'`;
  if (!contest) throw new ApiError("المسابقة غير متاحة الآن.", 409);
  const questionIndex = Number(contest.question_index);
  const question = contestQuestions[questionIndex];
  if (!question || optionIndex < 0 || optionIndex >= question.options.length) throw new ApiError("الإجابة المختارة غير صحيحة.");
  const [participant] = await sql`
    SELECT 1 FROM lesson_contest_participants WHERE contest_id = ${contestId}::uuid AND student_id = ${studentId}::uuid
  `;
  if (!participant) throw new ApiError("انضم إلى المسابقة أولاً.", 403);
  const seconds = Number(contest.seconds_per_question);
  const timeLeft = Math.max(0, Math.ceil((new Date(String(contest.question_started_at)).getTime() + seconds * 1000 - Date.now()) / 1000));
  if (timeLeft <= 0) throw new ApiError("انتهى وقت الإجابة لهذا السؤال.", 409);
  const correct = optionIndex === question.correctIndex;
  const points = correct ? 100 + Math.floor((timeLeft / seconds) * 50) : 0;
  const saved = await sql`
    INSERT INTO lesson_contest_answers (contest_id, student_id, question_index, option_index, is_correct, points)
    SELECT ${contestId}::uuid, ${studentId}::uuid, ${questionIndex}, ${optionIndex}, ${correct}, ${points}
    FROM lesson_contests c
    WHERE c.id = ${contestId}::uuid AND c.status = 'live' AND c.question_index = ${questionIndex}
      AND c.question_started_at + c.seconds_per_question * interval '1 second' > now()
    ON CONFLICT DO NOTHING RETURNING points
  `;
  if (!saved[0]) throw new ApiError("تمت الإجابة من قبل، أو انتهى وقت السؤال.", 409);
  return { correct, points, correctIndex: question.correctIndex };
}

export async function GET() {
  if (!databaseConfigured()) return respond({ online: false, setupRequired: true });
  try {
    await ensureSchema();
    return respond({ online: true, setupRequired: false });
  } catch (error) {
    console.error("Neon connection failed", error);
    return respond({ online: false, setupRequired: false, error: "تعذر الاتصال بقاعدة البيانات. تحقق من إعدادات Neon." }, 503);
  }
}

export async function POST(request: Request) {
  if (!databaseConfigured()) return respond({ error: "لم تُضبط متغيرات Neon ورمز المعلم بعد.", code: "setup_required" }, 503);
  try {
    await ensureSchema();
    let body: Payload;
    try {
      body = await request.json() as Payload;
    } catch {
      throw new ApiError("بيانات الطلب غير صالحة.");
    }
    const action = text(body.action);
    if (action === "teacher-login") return respond(await teacherLogin(request, body));
    if (action === "student-login") return respond(await studentLogin(request, body));

    const auth = await authenticate(request);
    if (action === "logout") {
      const sql = getSql();
      await sql`DELETE FROM lesson_sessions WHERE token_hash = ${auth.tokenHash}`;
      return respond({ signedOut: true });
    }
    if (action === "student-overview") {
      if (auth.role !== "student" || !auth.studentId) throw new ApiError("هذا الإجراء للطلاب فقط.", 403);
      return respond(await studentOverview(auth.studentId));
    }
    if (action === "save-progress") {
      if (auth.role !== "student" || !auth.studentId) throw new ApiError("هذا الإجراء للطلاب فقط.", 403);
      return respond(await saveProgress(auth.studentId, body));
    }
    if (action === "teacher-overview") {
      if (auth.role !== "teacher") throw new ApiError("هذا الإجراء للمعلم فقط.", 403);
      return respond(await teacherOverview());
    }
    if (action === "set-strategy" && auth.role === "teacher") {
      const id = text(body.strategyId);
      if (!teachingStrategies.some((strategy) => strategy.id === id)) throw new ApiError("الاستراتيجية غير صحيحة.");
      const sql = getSql();
      await sql`UPDATE lesson_classrooms SET active_strategy = ${id} WHERE id = 'main'`;
      return respond({ updated: true });
    }
    if (action === "update-lesson-controls" && auth.role === "teacher") {
      const raw = body.controls;
      if (!raw || typeof raw !== "object") throw new ApiError("إعدادات الدرس غير صحيحة.");
      const input = raw as Record<string, unknown>;
      if (Array.isArray(input.quizQuestionIds) && input.quizQuestionIds.length === 0) throw new ApiError("يجب إبقاء سؤال واحد على الأقل في الاختبار.");
      if (input.teacherQuestion && typeof input.teacherQuestion === "object") {
        const prompt = text((input.teacherQuestion as Record<string, unknown>).prompt);
        if (prompt.length < 8 || prompt.length > 250) throw new ApiError("سؤال المعلم يجب أن يكون بين ٨ و٢٥٠ حرفاً.");
      }
      const controls = normalizeLessonControls(raw);
      const sql = getSql();
      await sql`UPDATE lesson_classrooms SET lesson_controls = ${JSON.stringify(controls)}::jsonb WHERE id = 'main'`;
      return respond({ updated: true, controls });
    }
    if (action === "regenerate-code" && auth.role === "teacher") {
      const code = newCode();
      const sql = getSql();
      await sql`UPDATE lesson_classrooms SET access_code = ${code} WHERE id = 'main'`;
      return respond({ accessCode: code });
    }
    if (action === "create-contest" && auth.role === "teacher") return respond(await createContest(body));
    if (action === "save-board-result" && auth.role === "teacher") return respond(await saveBoardResult(body));
    if (action === "control-contest" && auth.role === "teacher") return respond(await controlContest(body));
    if (action === "join-contest" && auth.role === "student" && auth.studentId) return respond(await joinContest(auth.studentId, body));
    if (action === "contest-state") return respond(await contestState(auth, body));
    if (action === "answer-contest" && auth.role === "student" && auth.studentId) return respond(await answerContest(auth.studentId, body));
    throw new ApiError("الإجراء غير متاح.", 404);
  } catch (error) {
    if (error instanceof ApiError) return respond({ error: error.message, code: error.code }, error.status);
    console.error("Lesson API error", error);
    return respond({ error: "تعذر تنفيذ الطلب. حاول مرة أخرى بعد قليل.", code: "server_error" }, 500);
  }
}