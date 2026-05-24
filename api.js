const https = require("https");

/**
 * Fetches recent activity for a GitHub user.
 * @param {object} opts
 * @param {string} opts.username  - GitHub username
 * @param {string|null} opts.token - Optional PAT for authenticated requests
 * @param {number} opts.limit     - Number of events to fetch (1–100)
 */
function fetchUserActivity({ username, token, limit }) {
  const perPage = Math.min(limit, 100);

  const headers = {
    "User-Agent": "github-activity-cli",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2026-03-10",
  };

  // Attach auth token if provided — raises limit from 60 to 5000 req/hr
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = {
    hostname: "api.github.com",
    path: `/users/${encodeURIComponent(username)}/events?per_page=${perPage}`,
    method: "GET",
    headers,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => (data += chunk));

      res.on("end", () => {
        // Extract rate limit info from response headers
        const rateLimit = {
          limit: parseInt(res.headers["x-ratelimit-limit"] || "60", 10),
          remaining: parseInt(res.headers["x-ratelimit-remaining"] || "0", 10),
          reset: parseInt(res.headers["x-ratelimit-reset"] || "0", 10),
        };

        // Handle specific HTTP errors before parsing body
        if (res.statusCode === 401) {
          console.error("Error: Bad credentials. Check your --token value.");
          process.exit(1);
        }

        if (res.statusCode === 403) {
          const resetTime = new Date(
            rateLimit.reset * 1000,
          ).toLocaleTimeString();
          console.error(`Error: Rate limit exceeded. Resets at ${resetTime}.`);
          console.error(
            "Tip: Pass --token <your_github_pat> to increase the limit to 5000/hr.",
          );
          process.exit(1);
        }

        if (res.statusCode === 404) {
          console.error(`Error: User "${username}" not found.`);
          process.exit(1);
        }

        if (res.statusCode !== 200) {
          console.error(`Error: GitHub API returned HTTP ${res.statusCode}.`);
          process.exit(1);
        }

        let events;
        try {
          events = JSON.parse(data);
        } catch {
          return reject(
            new Error("Failed to parse GitHub API response as JSON."),
          );
        }

        if (!Array.isArray(events)) {
          return reject(
            new Error("Unexpected response shape from GitHub API."),
          );
        }

        resolve({ events, rateLimit });
      });
    });

    req.on("error", (err) => {
      if (err.code === "ENOTFOUND") {
        console.error("Error: No internet connection or DNS failure.");
      } else {
        console.error("Network error:", err.message);
      }
      process.exit(1);
    });

    // Set a timeout so the CLI doesn't hang forever
    req.setTimeout(10000, () => {
      console.error("Error: Request timed out after 10 seconds.");
      req.destroy();
      process.exit(1);
    });

    req.end();
  });
}

module.exports = { fetchUserActivity };
