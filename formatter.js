/**
 * Formats an array of GitHub events into readable terminal lines.
 */
function formatEvents(events) {
  return events.map((event) => {
    const repo = event.repo.name;
    const time = formatTime(event.created_at);
    const action = describeEvent(event);
    return `  ${time}  ${action}  [${repo}]`;
  });
}

function describeEvent(event) {
  const p = event.payload;

  switch (event.type) {
    case "PushEvent": {
      const count = p.commits?.length ?? 0;
      return `Pushed ${count} commit${count !== 1 ? "s" : ""}`;
    }
    case "IssuesEvent":
      return `${capitalize(p.action)} issue #${p.issue?.number}: "${truncate(p.issue?.title)}"`;
    case "IssueCommentEvent":
      return `Commented on issue #${p.issue?.number}`;
    case "PullRequestEvent":
      return `${capitalize(p.action)} PR #${p.pull_request?.number}: "${truncate(p.pull_request?.title)}"`;
    case "PullRequestReviewEvent":
      return `Reviewed PR #${p.pull_request?.number}`;
    case "PullRequestReviewCommentEvent":
      return `Commented on PR #${p.pull_request?.number} review`;
    case "WatchEvent":
      return `Starred`;
    case "ForkEvent":
      return `Forked → ${p.forkee?.full_name}`;
    case "CreateEvent":
      return `Created ${p.ref_type}${p.ref ? ` "${p.ref}"` : ""}`;
    case "DeleteEvent":
      return `Deleted ${p.ref_type} "${p.ref}"`;
    case "ReleaseEvent":
      return `${capitalize(p.action)} release "${p.release?.tag_name}"`;
    case "PublicEvent":
      return `Made repository public`;
    case "MemberEvent":
      return `${capitalize(p.action)} member @${p.member?.login}`;
    case "GollumEvent": {
      const pages = p.pages?.length ?? 0;
      return `Updated ${pages} wiki page${pages !== 1 ? "s" : ""}`;
    }
    case "CommitCommentEvent":
      return `Commented on a commit`;
    default:
      return event.type.replace("Event", "");
  }
}

/** Converts ISO timestamp to a compact relative label */
function formatTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "just now  ";
  if (mins < 60) return `${mins}m ago   `.slice(0, 10);
  if (hours < 24) return `${hours}h ago   `.slice(0, 10);
  return `${days}d ago   `.slice(0, 10);
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function truncate(str, max = 50) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

module.exports = { formatEvents };
