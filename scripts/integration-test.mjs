import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

const ROOT = process.cwd();
const PORT = 34000 + Math.floor(Math.random() * 1000);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const DB_PATH = path.join(ROOT, "data", "reservasi-online-integration.db");
const SETUP_TOKEN = "integration-setup-token-123";

const ADMIN = {
  name: "Admin Integrasi",
  email: "admin@integration.test",
  pin: "492731",
};
const WRONG_PIN = "000000";

const today = todayDateString();
const tomorrow = addDays(today, 1);

let passed = 0;
let failed = false;
let server = null;
const serverLogs = [];

function todayDateString() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return `${map.year}-${map.month}-${map.day}`;
}

function addDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function check(label, condition, detail = "") {
  if (!condition) {
    throw new Error(`${label}${detail ? `: ${detail}` : ""}`);
  }
  passed += 1;
  console.log(`PASS ${label}`);
}

function formatDetail(response) {
  const body = response.json
    ? JSON.stringify(response.json)
    : response.text.slice(0, 200);
  return `status=${response.status} body=${body}`;
}

function checkStatus(label, response, expected) {
  check(label, response.status === expected, formatDetail(response));
}

function errorCode(response) {
  return response.json?.error?.code ?? null;
}

function cookieFrom(response) {
  const raw = rawSetCookie(response);
  if (!raw) return null;
  return raw.split(";")[0];
}

function rawSetCookie(response) {
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
  return setCookies[0] ?? response.headers.get("set-cookie") ?? "";
}

async function api(pathname, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  if (options.cookie) headers.cookie = options.cookie;
  if (options.body !== undefined) headers["content-type"] = "application/json";

  const response = await fetch(`${BASE_URL}${pathname}`, {
    method: options.method ?? "GET",
    headers,
    body:
      options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(20000),
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    status: response.status,
    json,
    text,
    cookie: cookieFrom(response),
    rawSetCookie: rawSetCookie(response),
  };
}

function cleanupDatabaseFiles() {
  for (const suffix of ["", "-wal", "-shm"]) {
    const file = DB_PATH + suffix;
    if (fs.existsSync(file)) fs.rmSync(file);
  }
}

async function fetchPage(pathname, options = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    headers: options.cookie ? { cookie: options.cookie } : {},
    redirect: "manual",
    signal: AbortSignal.timeout(60000),
  });
  const text = await response.text();
  return {
    status: response.status,
    location: response.headers.get("location") ?? "",
    text,
  };
}

function checkPage(label, page, expectedText) {
  check(label, page.status === 200, `status=${page.status}`);
  check(
    `${label} contains expected content`,
    page.text.includes(expectedText),
    `missing "${expectedText}"`,
  );
}

function checkRedirect(label, page, target) {
  check(
    label,
    [301, 302, 303, 307, 308].includes(page.status),
    `status=${page.status}`,
  );
  check(
    `${label} redirects to ${target}`,
    page.location.includes(target),
    `location=${page.location}`,
  );
}

function lookupReservationId(bookingCode) {
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  try {
    const row = db
      .prepare("SELECT id FROM reservations WHERE booking_code = ?")
      .get(bookingCode);
    if (!row) throw new Error(`Reservation not found in database: ${bookingCode}`);
    return row.id;
  } finally {
    db.close();
  }
}

function executeSql(sql, params = []) {
  const db = new DatabaseSync(DB_PATH);
  try {
    db.exec("PRAGMA busy_timeout = 5000;");
    return db.prepare(sql).run(...params);
  } finally {
    db.close();
  }
}

function readLoginState() {
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  try {
    return db
      .prepare(
        "SELECT scope, attempt_count, locked_until FROM admin_login_state ORDER BY scope",
      )
      .all();
  } finally {
    db.close();
  }
}

function clearLoginState() {
  executeSql("DELETE FROM admin_login_state");
}

function expireLoginLock() {
  executeSql("UPDATE admin_login_state SET locked_until = ?", [
    new Date(Date.now() - 60_000).toISOString(),
  ]);
}

async function restartServer() {
  stopServer();
  await new Promise((resolve) => setTimeout(resolve, 1500));
  startServer();
  await waitForServer();
}

function runMigration() {
  const result = spawnSync(
    process.execPath,
    [path.join(ROOT, "scripts", "db-migrate.mjs")],
    {
      cwd: ROOT,
      env: { ...process.env, RESERVASI_ONLINE_DB_PATH: DB_PATH },
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `Migration failed: ${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    );
  }
}

function startServer() {
  server = spawn(
    process.execPath,
    [
      path.join(ROOT, "node_modules", "next", "dist", "bin", "next"),
      "dev",
      "--port",
      String(PORT),
    ],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        RESERVASI_ONLINE_DB_PATH: DB_PATH,
        ADMIN_SETUP_TOKEN: SETUP_TOKEN,
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  const collect = (chunk) => {
    serverLogs.push(String(chunk));
    if (serverLogs.length > 200) serverLogs.shift();
  };
  server.stdout.on("data", collect);
  server.stderr.on("data", collect);
}

async function waitForServer(timeoutMs = 90000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (server.exitCode !== null) {
      throw new Error(
        `Next dev exited early with code ${server.exitCode}.\n${serverLogs.join("")}`,
      );
    }
    try {
      const response = await fetch(`${BASE_URL}/api/public/availability`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) return;
    } catch {
      // server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`Timed out waiting for Next dev.\n${serverLogs.join("")}`);
}

function stopServer() {
  if (!server || server.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    server.kill("SIGTERM");
  }
}

async function run() {
  cleanupDatabaseFiles();
  runMigration();
  startServer();
  await waitForServer();

  console.log(`\nReservasi online integration test (${BASE_URL}, ${today})\n`);

  const wrongSetup = await api("/api/setup", {
    method: "POST",
    body: { setupToken: "wrong-token", ...ADMIN },
  });
  checkStatus("Setup rejects wrong token", wrongSetup, 403);
  check("Wrong setup error code", errorCode(wrongSetup) === "INVALID_SETUP_TOKEN");

  const setup = await api("/api/setup", {
    method: "POST",
    body: { setupToken: SETUP_TOKEN, ...ADMIN },
  });
  checkStatus("Setup creates first admin", setup, 201);

  const duplicateSetup = await api("/api/setup", {
    method: "POST",
    body: { setupToken: SETUP_TOKEN, ...ADMIN },
  });
  checkStatus("Setup cannot run twice", duplicateSetup, 409);
  check("Duplicate setup error code", errorCode(duplicateSetup) === "ADMIN_ALREADY_EXISTS");

  const adminLogin = await api("/api/auth/login", {
    method: "POST",
    body: { pin: ADMIN.pin },
  });
  checkStatus("Admin login succeeds", adminLogin, 200);
  const adminCookie = adminLogin.cookie;
  check("Admin login sets session cookie", Boolean(adminCookie));
  check(
    "Login response never exposes the PIN hash",
    !adminLogin.text.includes("$pbkdf2") && !adminLogin.text.includes("$argon2"),
  );
  check(
    "Login response contains no PIN field",
    !("pin" in (adminLogin.json?.data ?? {})) &&
      !("pinHash" in (adminLogin.json?.data ?? {})),
  );
  check(
    "Session cookie is HttpOnly and SameSite=Lax",
    /httponly/i.test(adminLogin.rawSetCookie ?? "") &&
      /samesite=lax/i.test(adminLogin.rawSetCookie ?? ""),
    adminLogin.rawSetCookie ?? "no set-cookie",
  );

  const unauthenticated = await api("/api/admin/settings");
  checkStatus("Admin API rejects anonymous access", unauthenticated, 401);

  const settings = await api("/api/admin/settings", {
    method: "PATCH",
    cookie: adminCookie,
    body: { onlineBookingEnabled: true, defaultDailyQuota: 2 },
  });
  checkStatus("Admin sets default quota to 2", settings, 200);
  check(
    "Default quota persisted",
    settings.json?.data?.settings?.defaultDailyQuota === 2,
  );

  const crossOrigin = await api("/api/public/reservations", {
    method: "POST",
    headers: { origin: "https://evil.example" },
    body: {
      customerName: "Cross Origin",
      customerPhone: "081234567890",
      bookingDate: today,
    },
  });
  checkStatus("Cross-origin mutation rejected", crossOrigin, 403);
  check("Cross-origin error code", errorCode(crossOrigin) === "FORBIDDEN_ORIGIN");

  const invalidPhone = await api("/api/public/reservations", {
    method: "POST",
    body: {
      customerName: "Telepon Salah",
      customerPhone: "123",
      bookingDate: today,
    },
  });
  checkStatus("Invalid phone rejected", invalidPhone, 400);
  check(
    "Invalid phone returns field error",
    typeof invalidPhone.json?.error?.fields?.customerPhone === "string",
  );

  const pastBooking = await api("/api/public/reservations", {
    method: "POST",
    body: {
      customerName: "Masa Lalu",
      customerPhone: "081234567890",
      bookingDate: addDays(today, -1),
    },
  });
  checkStatus("Past date booking rejected", pastBooking, 400);
  check("Past date error code", errorCode(pastBooking) === "DATE_IN_PAST");

  const malformedStatus = await api(
    "/api/public/reservations/status?code=CQ-ABC",
  );
  checkStatus("Malformed booking code rejected", malformedStatus, 400);
  check(
    "Malformed code error code",
    errorCode(malformedStatus) === "VALIDATION_ERROR",
  );

  const missingStatus = await api(
    "/api/public/reservations/status?code=CQ-ZZZZZZZZ",
  );
  checkStatus("Unknown booking code returns 404", missingStatus, 404);
  check(
    "Unknown code error code",
    errorCode(missingStatus) === "RESERVATION_NOT_FOUND",
  );

  const booking1 = await api("/api/public/reservations", {
    method: "POST",
    body: {
      customerName: "Pelanggan Satu",
      customerPhone: "081111111111",
      bookingDate: today,
    },
  });
  checkStatus("Public booking 1 succeeds", booking1, 201);
  check("Booking 1 gets queue number 1", booking1.json?.data?.booking?.queueNumber === 1);
  check(
    "Booking 1 code format is valid",
    /^CQ-[A-Z2-7]{8}$/.test(booking1.json?.data?.booking?.bookingCode ?? ""),
  );
  check("Booking 1 is CONFIRMED", booking1.json?.data?.booking?.status === "CONFIRMED");
  const reservation1 = booking1.json.data.booking;
  const reservation1Id = lookupReservationId(reservation1.bookingCode);

  const booking2 = await api("/api/public/reservations", {
    method: "POST",
    body: {
      customerName: "Pelanggan Dua",
      customerPhone: "082222222222",
      bookingDate: today,
    },
  });
  checkStatus("Public booking 2 succeeds", booking2, 201);
  check("Booking 2 gets queue number 2", booking2.json?.data?.booking?.queueNumber === 2);
  const reservation2Id = lookupReservationId(booking2.json.data.booking.bookingCode);

  const booking3AfterFull = await api("/api/public/reservations", {
    method: "POST",
    body: {
      customerName: "Pelanggan Tiga",
      customerPhone: "083333333333",
      bookingDate: today,
    },
  });
  checkStatus("Booking over quota rejected", booking3AfterFull, 409);
  check("Over-quota error code", errorCode(booking3AfterFull) === "QUOTA_FULL");

  const availabilityFull = await api("/api/public/availability");
  checkStatus("Public availability loads", availabilityFull, 200);
  const todayAvailability = availabilityFull.json?.data?.days?.find(
    (day) => day.date === today,
  );
  check("Availability shows 2 booked of 2", todayAvailability?.booked === 2);
  check("Availability shows 0 remaining", todayAvailability?.remaining === 0);

  const status1 = await api(
    `/api/public/reservations/status?code=${reservation1.bookingCode}`,
  );
  checkStatus("Public status lookup succeeds", status1, 200);
  check("Public status masks phone", status1.json?.data?.reservation?.customerPhoneMasked === "+62••••1111");
  check("Confirmed booking shows position 1", status1.json?.data?.reservation?.position === 1);
  check(
    "Public status omits raw phone",
    !("customerPhone" in (status1.json?.data?.reservation ?? {})),
  );

  const checkIn1 = await api(
    `/api/admin/reservations/${reservation1Id}/transition`,
    { method: "POST", cookie: adminCookie, body: { action: "check_in" } },
  );
  checkStatus("Admin checks in booking 1", checkIn1, 200);
  check("Booking 1 becomes WAITING", checkIn1.json?.data?.reservation?.status === "WAITING");

  const statusWaiting = await api(
    `/api/public/reservations/status?code=${reservation1.bookingCode}`,
  );
  check(
    "Waiting booking still shows position 1",
    statusWaiting.json?.data?.reservation?.position === 1,
  );

  const walkIn = await api("/api/admin/walk-ins", {
    method: "POST",
    cookie: adminCookie,
    body: { customerName: "Walk-in Satu" },
  });
  checkStatus("Admin creates walk-in", walkIn, 201);
  check("Walk-in gets queue number W-1", walkIn.json?.data?.walkIn?.queueNumber === 1);
  check("Walk-in is WAITING", walkIn.json?.data?.walkIn?.status === "WAITING");
  const walkIn1 = walkIn.json.data.walkIn;

  const callOnline1 = await api("/api/admin/queue/call", {
    method: "POST",
    cookie: adminCookie,
    body: { kind: "ONLINE" },
  });
  checkStatus("Admin calls next online reservation", callOnline1, 200);
  check("Booking 1 is called", callOnline1.json?.data?.reservation?.id === reservation1Id);
  check("Called reservation is CALLED", callOnline1.json?.data?.reservation?.status === "CALLED");

  const callWalkIn1 = await api("/api/admin/queue/call", {
    method: "POST",
    cookie: adminCookie,
    body: { kind: "WALK_IN" },
  });
  checkStatus("Admin calls walk-in while online is still called", callWalkIn1, 200);
  check("Walk-in becomes CALLED", callWalkIn1.json?.data?.walkIn?.status === "CALLED");

  const startReservation1 = await api(
    `/api/admin/reservations/${reservation1Id}/transition`,
    { method: "POST", cookie: adminCookie, body: { action: "start" } },
  );
  checkStatus("Admin starts online service", startReservation1, 200);
  check(
    "Reservation becomes IN_SERVICE",
    startReservation1.json?.data?.reservation?.status === "IN_SERVICE",
  );

  const startWalkIn1 = await api(
    `/api/admin/walk-ins/${walkIn1.id}/transition`,
    { method: "POST", cookie: adminCookie, body: { action: "start" } },
  );
  checkStatus("Admin starts walk-in service while online is still active", startWalkIn1, 200);
  check("Walk-in becomes IN_SERVICE", startWalkIn1.json?.data?.walkIn?.status === "IN_SERVICE");

  const completeReservation1 = await api(
    `/api/admin/reservations/${reservation1Id}/transition`,
    { method: "POST", cookie: adminCookie, body: { action: "complete" } },
  );
  checkStatus("Admin completes online service", completeReservation1, 200);
  check(
    "Reservation becomes COMPLETED",
    completeReservation1.json?.data?.reservation?.status === "COMPLETED",
  );
  check(
    "Completion timestamp recorded",
    Boolean(completeReservation1.json?.data?.reservation?.completedAt),
  );

  const completeWalkIn1 = await api(
    `/api/admin/walk-ins/${walkIn1.id}/transition`,
    { method: "POST", cookie: adminCookie, body: { action: "complete" } },
  );
  checkStatus("Admin completes walk-in service", completeWalkIn1, 200);
  check("Walk-in becomes COMPLETED", completeWalkIn1.json?.data?.walkIn?.status === "COMPLETED");

  const availabilityReleased = await api("/api/public/availability");
  const todayReleased = availabilityReleased.json?.data?.days?.find(
    (day) => day.date === today,
  );
  check("Completed booking frees quota", todayReleased?.booked === 1);
  check("One slot is available again", todayReleased?.remaining === 1);

  const booking3 = await api("/api/public/reservations", {
    method: "POST",
    body: {
      customerName: "Pelanggan Tiga",
      customerPhone: "083333333333",
      bookingDate: today,
    },
  });
  checkStatus("Booking succeeds after quota is freed", booking3, 201);
  check("Booking 3 gets queue number 3", booking3.json?.data?.booking?.queueNumber === 3);
  const reservation3 = booking3.json.data.booking;
  const reservation3Id = lookupReservationId(reservation3.bookingCode);

  const cancel2 = await api(
    `/api/admin/reservations/${reservation2Id}/transition`,
    { method: "POST", cookie: adminCookie, body: { action: "cancel" } },
  );
  checkStatus("Admin cancels booking 2", cancel2, 200);
  check("Booking 2 becomes CANCELLED", cancel2.json?.data?.reservation?.status === "CANCELLED");

  const closeTomorrow = await api("/api/admin/dates", {
    method: "PUT",
    cookie: adminCookie,
    body: { date: tomorrow, maxQuota: null, isClosed: true },
  });
  checkStatus("Admin closes tomorrow", closeTomorrow, 200);
  check("Closed date active count is reported", closeTomorrow.json?.data?.activeCount === 0);

  const bookingClosedDate = await api("/api/public/reservations", {
    method: "POST",
    body: {
      customerName: "Tanggal Tutup",
      customerPhone: "085555555555",
      bookingDate: tomorrow,
    },
  });
  checkStatus("Booking on closed date rejected", bookingClosedDate, 409);
  check("Closed date error code", errorCode(bookingClosedDate) === "DATE_CLOSED");

  const reduceQuota = await api("/api/admin/dates", {
    method: "PUT",
    cookie: adminCookie,
    body: { date: today, maxQuota: 1, isClosed: false },
  });
  checkStatus("Admin sets today quota override to 1", reduceQuota, 200);
  check("Override reports active count 1", reduceQuota.json?.data?.activeCount === 1);

  const bookingOverReducedQuota = await api("/api/public/reservations", {
    method: "POST",
    body: {
      customerName: "Melebihi Kuota",
      customerPhone: "086666666666",
      bookingDate: today,
    },
  });
  checkStatus("Lowered quota rejects new booking", bookingOverReducedQuota, 409);

  const checkIn3 = await api(
    `/api/admin/reservations/${reservation3Id}/transition`,
    { method: "POST", cookie: adminCookie, body: { action: "check_in" } },
  );
  checkStatus("Admin checks in booking 3", checkIn3, 200);

  const aCall3 = await api("/api/admin/queue/call", {
    method: "POST",
    cookie: adminCookie,
    body: { kind: "ONLINE" },
  });
  checkStatus("Admin calls online booking after earlier services finish", aCall3, 200);
  check("Booking 3 is called", aCall3.json?.data?.reservation?.id === reservation3Id);

  const aStart3 = await api(
    `/api/admin/reservations/${reservation3Id}/transition`,
    { method: "POST", cookie: adminCookie, body: { action: "start" } },
  );
  checkStatus("Admin starts booking 3", aStart3, 200);

  const aComplete3 = await api(
    `/api/admin/reservations/${reservation3Id}/transition`,
    { method: "POST", cookie: adminCookie, body: { action: "complete" } },
  );
  checkStatus("Admin completes booking 3", aComplete3, 200);

  const booking5 = await api("/api/public/reservations", {
    method: "POST",
    body: {
      customerName: "Pelanggan No-show",
      customerPhone: "084444444444",
      bookingDate: today,
    },
  });
  checkStatus("Booking succeeds after completion", booking5, 201);
  check("Booking 5 gets queue number 4", booking5.json?.data?.booking?.queueNumber === 4);
  const reservation5 = booking5.json.data.booking;
  const reservation5Id = lookupReservationId(reservation5.bookingCode);

  const checkIn5 = await api(
    `/api/admin/reservations/${reservation5Id}/transition`,
    { method: "POST", cookie: adminCookie, body: { action: "check_in" } },
  );
  checkStatus("Admin checks in booking 5", checkIn5, 200);

  const aCall5 = await api("/api/admin/queue/call", {
    method: "POST",
    cookie: adminCookie,
    body: { kind: "ONLINE" },
  });
  checkStatus("Admin calls booking 5", aCall5, 200);

  const aNoShow5 = await api(
    `/api/admin/reservations/${reservation5Id}/transition`,
    { method: "POST", cookie: adminCookie, body: { action: "no_show" } },
  );
  checkStatus("Admin marks booking 5 as no-show", aNoShow5, 200);
  check("Booking 5 becomes NO_SHOW", aNoShow5.json?.data?.reservation?.status === "NO_SHOW");

  const availabilityAfterNoShow = await api("/api/public/availability");
  const todayAfterNoShow = availabilityAfterNoShow.json?.data?.days?.find(
    (day) => day.date === today,
  );
  check("No-show frees the active slot", todayAfterNoShow?.booked === 0);

  const removedCapsterApi = await api("/api/admin/capsters", { cookie: adminCookie });
  checkStatus("Removed capster API returns 404", removedCapsterApi, 404);

  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  try {
    const reservationRows = db
      .prepare(
        "SELECT status, COUNT(*) AS count FROM reservations GROUP BY status ORDER BY status",
      )
      .all();
    const reservationCounts = Object.fromEntries(
      reservationRows.map((row) => [row.status, Number(row.count)]),
    );
    check(
      "Database stores 4 reservations",
      Object.values(reservationCounts).reduce((sum, count) => sum + count, 0) === 4,
    );
    check("Database has 2 completed reservations", reservationCounts.COMPLETED === 2);
    check("Database has 1 cancelled reservation", reservationCounts.CANCELLED === 1);
    check("Database has 1 no-show reservation", reservationCounts.NO_SHOW === 1);

    const codes = db
      .prepare("SELECT booking_code AS code FROM reservations ORDER BY queue_number")
      .all()
      .map((row) => row.code);
    check("All stored booking codes are valid", codes.every((code) => /^CQ-[A-Z2-7]{8}$/.test(code)));
    check("All stored booking codes are unique", new Set(codes).size === codes.length);

    const queueNumbers = db
      .prepare("SELECT queue_number AS number FROM reservations ORDER BY queue_number")
      .all()
      .map((row) => Number(row.number));
    check(
      "Queue numbers stay sequential per day",
      JSON.stringify(queueNumbers) === JSON.stringify([1, 2, 3, 4]),
    );

    const walkInCounts = db
      .prepare("SELECT status, COUNT(*) AS count FROM walk_ins GROUP BY status")
      .all();
    check(
      "Database stores 1 completed walk-in",
      walkInCounts.length === 1 &&
        walkInCounts[0].status === "COMPLETED" &&
        Number(walkInCounts[0].count) === 1,
    );

    const barbersTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'barbers'")
      .get();
    check("Capster table is removed", !barbersTable);

    const reservationColumns = db.prepare("PRAGMA table_info(reservations)").all();
    check(
      "Reservations have no capster assignment column",
      !reservationColumns.some((column) => column.name === "assigned_barber_id"),
    );

    const walkInColumns = db.prepare("PRAGMA table_info(walk_ins)").all();
    check(
      "Walk-ins have no capster assignment column",
      !walkInColumns.some((column) => column.name === "assigned_barber_id"),
    );

    const sessions = db
      .prepare("SELECT token_hash AS hash FROM sessions")
      .all();
    check(
      "Session tokens are stored as 64-char hashes",
      sessions.every((row) => /^[0-9a-f]{64}$/.test(row.hash)),
    );
    check("Only the admin has an active session", sessions.length === 1);
    const adminToken = adminCookie?.split("=")[1] ?? "";
    check(
      "Raw session token is never stored",
      !sessions.some((row) => row.hash === adminToken),
    );

    const userRows = db
      .prepare("SELECT email, role FROM users ORDER BY email")
      .all();
    check("Database stores only one user account", userRows.length === 1);
    check(
      "Only the admin account remains",
      userRows[0]?.email === ADMIN.email && userRows[0]?.role === "ADMIN",
    );

    const pinHashes = db.prepare("SELECT pin_hash AS hash FROM users").all();
    check(
      "Admin PIN is stored as a PBKDF2 hash",
      pinHashes.length === 1 &&
        typeof pinHashes[0].hash === "string" &&
        pinHashes[0].hash.startsWith("$pbkdf2$"),
    );
    check(
      "Plain PIN is never stored in the users table",
      !JSON.stringify(pinHashes).includes(ADMIN.pin),
    );
  } finally {
    db.close();
  }

  checkPage(
    "Home page renders",
    await fetchPage("/"),
    "RESERVASI",
  );
  checkPage("Booking page renders", await fetchPage("/booking"), "Pilih tanggal");
  checkPage(
    "Public status page renders initial booking",
    await fetchPage(
      `/booking/status?code=${encodeURIComponent(reservation1.bookingCode)}`,
    ),
    "Status antrean",
  );
  checkPage("Login page renders", await fetchPage("/login"), "Masuk ke Reservasi online");
  checkRedirect(
    "Setup redirects once admin exists",
    await fetchPage("/setup"),
    "/login",
  );
  checkRedirect("Anonymous admin is redirected", await fetchPage("/admin"), "/login");

  const removedBarberRoute = await fetchPage("/barber");
  check("Removed barber route returns 404", removedBarberRoute.status === 404);
  const removedBarberQueueRoute = await fetchPage("/barber/queue");
  check("Removed barber queue route returns 404", removedBarberQueueRoute.status === 404);
  const removedAdminBarberPage = await fetchPage("/admin/barbers", {
    cookie: adminCookie,
  });
  check("Removed admin barber page returns 404", removedAdminBarberPage.status === 404);
  const removedBarberApi = await api("/api/barber/queue/call", {
    method: "POST",
    cookie: adminCookie,
    body: { kind: "ONLINE" },
  });
  checkStatus("Removed barber API returns 404", removedBarberApi, 404);

  const adminPages = [
    ["/admin", "Dashboard"],
    ["/admin/reservations", "Manajemen reservasi"],
    ["/admin/walk-ins", "Antrean walk-in"],
    ["/admin/settings", "Pengaturan operasional"],
    ["/admin/reports", "Laporan operasional"],
  ];

  const removedCapsterPage = await fetchPage("/admin/capsters", {
    cookie: adminCookie,
  });
  check("Removed admin capster page returns 404", removedCapsterPage.status === 404);
  const removedCapsterApiPage = await api("/api/admin/capsters", {
    cookie: adminCookie,
  });
  checkStatus("Removed capster API returns 404", removedCapsterApiPage, 404);
  for (const [pathname, expectedText] of adminPages) {
    checkPage(
      `Admin page ${pathname} renders`,
      await fetchPage(pathname, { cookie: adminCookie }),
      expectedText,
    );
  }

  const logout = await api("/api/auth/logout", {
    method: "POST",
    cookie: adminCookie,
    body: {},
  });
  checkStatus("Admin logout succeeds", logout, 200);
  const afterLogout = await api("/api/admin/settings", { cookie: adminCookie });
  checkStatus("Logged-out cookie is invalid", afterLogout, 401);

  // ---------- PIN security: lockout, rate limit, sessions ----------
  clearLoginState();

  const wrongPin1 = await api("/api/auth/login", {
    method: "POST",
    body: { pin: WRONG_PIN },
  });
  checkStatus("Wrong PIN attempt 1 is rejected", wrongPin1, 401);
  check(
    "Wrong PIN attempt 1 reports remaining attempts",
    wrongPin1.json?.error?.message?.includes("Sisa percobaan: 2"),
    formatDetail(wrongPin1),
  );
  check(
    "Wrong PIN attempt 1 does not lock the login",
    readLoginState().every((row) => !row.locked_until),
  );

  const wrongPin2 = await api("/api/auth/login", {
    method: "POST",
    body: { pin: WRONG_PIN },
  });
  checkStatus("Wrong PIN attempt 2 is rejected", wrongPin2, 401);
  check(
    "Wrong PIN attempt 2 does not lock the login",
    readLoginState().every((row) => !row.locked_until),
  );

  const wrongPin3 = await api("/api/auth/login", {
    method: "POST",
    body: { pin: WRONG_PIN },
  });
  checkStatus("Wrong PIN attempt 3 locks the source", wrongPin3, 429);
  check(
    "Lock message is clear and generic",
    wrongPin3.json?.error?.message ===
      "Terlalu banyak percobaan. Silakan coba lagi dalam 15 menit.",
    formatDetail(wrongPin3),
  );

  const sourceLockedRow = readLoginState().find((row) =>
    row.scope.startsWith("source:"),
  );
  const sourceLockMinutes = sourceLockedRow?.locked_until
    ? (new Date(sourceLockedRow.locked_until).getTime() - Date.now()) / 60000
    : 0;
  check(
    "Source lock lasts about 15 minutes",
    sourceLockMinutes > 14 && sourceLockMinutes <= 15.5,
    `minutes=${sourceLockMinutes}`,
  );
  const globalAfterSource = readLoginState().find(
    (row) => row.scope === "global",
  );
  check(
    "Global lock is not triggered by a single source (anti-DoS)",
    !globalAfterSource?.locked_until,
    formatDetail({ json: globalAfterSource }),
  );

  const correctDuringSourceLock = await api("/api/auth/login", {
    method: "POST",
    body: { pin: ADMIN.pin },
  });
  checkStatus(
    "Correct PIN from locked source is rejected",
    correctDuringSourceLock,
    429,
  );
  check(
    "Rejected lock attempt sets no session cookie",
    !correctDuringSourceLock.cookie,
  );

  // Sumber baru tetap bisa login selama belum mencapai ambang global —
  // ini yang mencegah satu pihak mengunci admin sepenuhnya (DoS login).
  const correctFromNewSource = await api("/api/auth/login", {
    method: "POST",
    headers: {
      "x-forwarded-for": "203.0.113.7",
    },
    body: { pin: ADMIN.pin },
  });
  checkStatus(
    "Correct PIN from a new source still works before global lock",
    correctFromNewSource,
    200,
  );
  const newSourceCookie = correctFromNewSource.cookie;
  check("New-source login sets a session cookie", Boolean(newSourceCookie));

  const logoutNewSource = await api("/api/auth/logout", {
    method: "POST",
    cookie: newSourceCookie,
  });
  checkStatus("Logout from new source succeeds", logoutNewSource, 200);

  // Naikkan hitungan global ke ambang dengan beberapa sumber berbeda.
  clearLoginState();
  for (let index = 0; index < 10; index += 1) {
    const attempt = await api("/api/auth/login", {
      method: "POST",
      headers: { "x-forwarded-for": `198.51.100.${index + 1}` },
      body: { pin: WRONG_PIN },
    });
    if (attempt.status !== 401 && attempt.status !== 429) {
      check(
        "Global threshold attempt stays in 401/429 range",
        false,
        `status=${attempt.status}`,
      );
      break;
    }
  }
  const globalLockedRow = readLoginState().find(
    (row) => row.scope === "global",
  );
  const globalLockMinutes = globalLockedRow?.locked_until
    ? (new Date(globalLockedRow.locked_until).getTime() - Date.now()) / 60000
    : 0;
  check(
    "Global lock engages after enough failures from multiple sources",
    globalLockMinutes > 14 && globalLockMinutes <= 15.5,
    `minutes=${globalLockMinutes}`,
  );

  const cookieSwap = await api("/api/auth/login", {
    method: "POST",
    headers: {
      cookie: `cq_session=${"a".repeat(64)}`,
      "x-forwarded-for": "203.0.113.99",
    },
    body: { pin: ADMIN.pin },
  });
  checkStatus("Global lock blocks every source", cookieSwap, 429);

  await restartServer();
  const afterRestart = await api("/api/auth/login", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.50" },
    body: { pin: ADMIN.pin },
  });
  checkStatus("Lock still applies after a server restart", afterRestart, 429);

  // Concurrent failures must not exceed the global verification budget.
  clearLoginState();
  const concurrentAttempts = await Promise.all(
    Array.from({ length: 15 }, (_, index) =>
      api("/api/auth/login", {
        method: "POST",
        headers: { "x-forwarded-for": `192.0.2.${index + 1}` },
        body: { pin: WRONG_PIN },
      }),
    ),
  );
  const verifiedFailures = concurrentAttempts.filter(
    (attempt) => attempt.status === 401,
  ).length;
  const lockedAttempts = concurrentAttempts.filter(
    (attempt) => attempt.status === 429,
  ).length;
  check(
    "Concurrent requests verify at most the global budget",
    verifiedFailures <= 10 && verifiedFailures + lockedAttempts === 15,
    `401=${verifiedFailures} 429=${lockedAttempts}`,
  );
  const concurrentCorrect = await api("/api/auth/login", {
    method: "POST",
    headers: { "x-forwarded-for": "192.0.2.200" },
    body: { pin: ADMIN.pin },
  });
  checkStatus(
    "Correct PIN after a concurrent burst is rejected",
    concurrentCorrect,
    429,
  );

  // The lock window ends: attempts must be allowed again with a fresh counter.
  expireLoginLock();
  const afterExpiry = await api("/api/auth/login", {
    method: "POST",
    body: { pin: ADMIN.pin },
  });
  checkStatus("Login succeeds after the lock expires", afterExpiry, 200);
  check("Post-expiry login sets a session cookie", Boolean(afterExpiry.cookie));
  check(
    "Successful login resets attempt counters",
    readLoginState().every(
      (row) => Number(row.attempt_count) === 0 && !row.locked_until,
    ),
  );
  const expirySession = await api("/api/admin/settings", {
    cookie: afterExpiry.cookie,
  });
  checkStatus("Post-expiry session reaches admin API", expirySession, 200);

  const changePinEndpoint = await api("/api/auth/change-pin", {
    method: "POST",
    body: { pin: "123456" },
  });
  checkStatus("No public endpoint changes the admin PIN", changePinEndpoint, 404);

  const secondAdmin = await api("/api/setup", {
    method: "POST",
    body: {
      setupToken: SETUP_TOKEN,
      name: "Admin Kedua",
      email: "second@integration.test",
      pin: "123456",
    },
  });
  checkStatus("Setup cannot create another admin", secondAdmin, 409);
  check(
    "Second setup is rejected with conflict code",
    errorCode(secondAdmin) === "ADMIN_ALREADY_EXISTS",
  );

  const mutationWithoutSession = await api("/api/admin/dates", {
    method: "PUT",
    body: { date: today, maxQuota: 5, isClosed: false },
  });
  checkStatus(
    "Admin configuration mutation without session is rejected",
    mutationWithoutSession,
    401,
  );

  const finalLogout = await api("/api/auth/logout", {
    method: "POST",
    cookie: afterExpiry.cookie,
    body: {},
  });
  checkStatus("Post-expiry session can log out", finalLogout, 200);
  const expiredCookie = await api("/api/admin/settings", {
    cookie: afterExpiry.cookie,
  });
  checkStatus("Logged-out post-expiry cookie stops working", expiredCookie, 401);

  console.log(`\nAll ${passed} integration checks passed.`);
}

try {
  await run();
} catch (error) {
  failed = true;
  console.error(`\nFAIL ${error instanceof Error ? error.message : String(error)}`);
  if (serverLogs.length > 0) {
    console.error("\n--- Next dev logs (tail) ---");
    console.error(serverLogs.slice(-40).join(""));
  }
  process.exitCode = 1;
} finally {
  stopServer();
  if (!failed) {
    cleanupDatabaseFiles();
  } else {
    console.error(`Integration database kept for debugging: ${DB_PATH}`);
  }
}
