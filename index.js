#!/usr/bin/env node

const { fetchUserActivity } = require("./api");
const { formatEvents } = require("./formatter");

// --- Argument Parsing ---
const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help")) {
  console.log(`
Usage: github-activity <username> [options]

Options:
  --filter <EventType>   Filter by event type (e.g. PushEvent, WatchEvent)
  --token  <token>       GitHub personal access token (raises rate limit to 5000/hr)
  --limit  <number>      Max number of events to display (default: 30, max: 100)
  --help                 Show this help message

Examples:
  github-activity torvalds
  github-activity torvalds --filter PushEvent
  github-activity torvalds --limit 50 --token ghp_yourtoken
  `);
  process.exit(0);
}

const username = args[0];

// Parse named flags
function getFlag(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}

const filter = getFlag("--filter");
const token = getFlag("--token");
const limit = parseInt(getFlag("--limit") || "30", 10);

if (isNaN(limit) || limit < 1 || limit > 100) {
  console.error("Error: --limit must be a number between 1 and 100.");
  process.exit(1);
}

// Validate filter value is a known event type
const KNOWN_TYPES = [
  "PushEvent",
  "IssuesEvent",
  "IssueCommentEvent",
  "PullRequestEvent",
  "WatchEvent",
  "ForkEvent",
  "CreateEvent",
  "DeleteEvent",
  "PublicEvent",
  "MemberEvent",
  "ReleaseEvent",
  "GollumEvent",
  "CommitCommentEvent",
  "PullRequestReviewEvent",
  "PullRequestReviewCommentEvent",
];

if (filter && !KNOWN_TYPES.includes(filter)) {
  console.warn(
    `Warning: "${filter}" is not a recognized event type. Proceeding anyway.`,
  );
  console.warn(`Known types: ${KNOWN_TYPES.join(", ")}\n`);
}

process.on("unhandledRejection", (err) => {
  console.error("Unexpected error:", err.message);
  process.exit(1);
});

(async () => {
  const { events, rateLimit } = await fetchUserActivity({
    username,
    token,
    limit,
  });

  // Apply filter if provided
  const filtered = filter ? events.filter((e) => e.type === filter) : events;

  if (filtered.length === 0) {
    const msg = filter
      ? `No "${filter}" events found for ${username}.`
      : `No recent activity found for ${username}.`;
    console.log(msg);
  } else {
    console.log(`\nRecent activity for ${username}:\n`);
    const lines = formatEvents(filtered);
    lines.forEach((line) => console.log(line));
  }

  // Always show rate limit status at the end
  console.log(
    `\n── Rate Limit: ${rateLimit.remaining}/${rateLimit.limit} requests remaining`,
  );
  if (rateLimit.remaining < 10) {
    const resetTime = new Date(rateLimit.reset * 1000).toLocaleTimeString();
    console.warn(`   ⚠ Running low. Resets at ${resetTime}`);
  }
})();
