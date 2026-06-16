const fs = require("fs");
const path = require("path");

const root = process.argv[2] || process.cwd();
const logArg = process.argv[3] || process.env.DATE_BACKFILL_LOG || "date-backfill-rerun.out.log";
const logPath = path.isAbsolute(logArg) ? logArg : path.join(root, logArg);
const dataPath = path.join(root, "data", "news", "historical-seed.json");

function parseLog() {
  let tail = "";
  let updatedAt = "n/a";
  let updatedAgeSeconds = "n/a";
  try {
    const stats = fs.statSync(logPath);
    updatedAt = stats.mtime.toISOString();
    updatedAgeSeconds = String(Math.max(0, Math.floor((Date.now() - stats.mtimeMs) / 1000)));
    const raw = fs.readFileSync(logPath);
    let log;

    // Batch/cmd redirection on Windows can leave this log in UTF-16LE-ish form.
    if (raw.length >= 2 && raw[1] === 0x00) {
      log = raw.toString("utf16le");
    } else {
      log = raw.toString("utf8");
    }

    log = log.replace(/\u0000/g, "");
    tail = log.slice(-20000);
  } catch {
    return {
      processed: "n/a",
      verified: "n/a",
      changed: "n/a",
      checkpoint: "n/a",
      updatedAt,
      updatedAgeSeconds,
      lastEvent: "n/a",
    };
  }

  const processedMatches = [...tail.matchAll(/Processed (\d+\/\d+) \| verified=(\d+) \| changed=(\d+)/g)];
  const checkpointMatches = [...tail.matchAll(/Checkpoint saved at (\d+)/g)];
  const lastEvent = tail
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-1)[0] || "n/a";

  const lastProcessed = processedMatches[processedMatches.length - 1];
  const lastCheckpoint = checkpointMatches[checkpointMatches.length - 1];

  return {
    processed: lastProcessed ? lastProcessed[1] : "n/a",
    verified: lastProcessed ? lastProcessed[2] : "n/a",
    changed: lastProcessed ? lastProcessed[3] : "n/a",
    checkpoint: lastCheckpoint ? lastCheckpoint[1] : "n/a",
    updatedAt,
    updatedAgeSeconds,
    lastEvent,
  };
}

function parseData() {
  const rows = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  let estimated = 0;
  let verified = 0;
  let resolved = 0;
  let googleEstimatedResolved = 0;
  let directEstimatedResolved = 0;
  let unresolvedEstimated = 0;

  for (const row of rows) {
    if (row.is_estimated) estimated += 1;
    if (row.date_source && row.date_source !== "fallback_estimate") verified += 1;
    if (row.resolved_url) resolved += 1;
    if (row.is_estimated && row.resolved_url && /news\.google\.com/i.test(row.resolved_url)) {
      googleEstimatedResolved += 1;
    }
    if (row.is_estimated && row.resolved_url && !/news\.google\.com/i.test(row.resolved_url)) {
      directEstimatedResolved += 1;
    }
    if (row.is_estimated && !row.resolved_url) {
      unresolvedEstimated += 1;
    }
  }

  return {
    total: rows.length,
    estimated,
    verified,
    resolved,
    googleEstimatedResolved,
    directEstimatedResolved,
    unresolvedEstimated,
  };
}

const log = parseLog();
const data = parseData();

const lines = [
  `LIVE_PROCESSED=${log.processed}`,
  `LIVE_VERIFIED=${log.verified}`,
  `LIVE_CHANGED=${log.changed}`,
  `LAST_CHECKPOINT=${log.checkpoint}`,
  `LOG_UPDATED_AT=${log.updatedAt}`,
  `LOG_UPDATED_AGE_SECONDS=${log.updatedAgeSeconds}`,
  `LAST_EVENT=${log.lastEvent}`,
  `SAVED_TOTAL=${data.total}`,
  `SAVED_ESTIMATED=${data.estimated}`,
  `SAVED_VERIFIED=${data.verified}`,
  `SAVED_RESOLVED=${data.resolved}`,
  `SAVED_GOOGLE_ESTIMATED_RESOLVED=${data.googleEstimatedResolved}`,
  `SAVED_DIRECT_ESTIMATED_RESOLVED=${data.directEstimatedResolved}`,
  `SAVED_UNRESOLVED_ESTIMATED=${data.unresolvedEstimated}`,
];

process.stdout.write(lines.join("\n"));
