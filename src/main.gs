function dailyBugSync() {
  console.log("🚀 Starting dailyBugSync");

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Bug Tracker") || createSheet();

  const yesterday = new Date(Date.now() - 604800000); // 1 week
  const bugs = getSlackBugs(yesterday);
  console.log("🐛 Retrieved " + bugs.length + " bugs from Slack");

  if (bugs.length === 0) {
    console.log("⚠️ No new bugs or updates found");
    return;
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const fullDetailsIndex = headers.indexOf("Full Details");
  const assignedToIndex = headers.indexOf("Assigned to");
  const statusIndex = headers.indexOf("Status");

  let newBugs = 0;
  let updatedBugs = 0;

  const extractMsgId = url => {
    if (!url) return null;
    const match = url.match(/p(\d+)/); // Use \d+ to be flexible with ID length
    return match ? match[1] : null;
  };

  bugs.forEach(bug => {
    if (bug.type === "new") {
      const bugMsgId = extractMsgId(bug.fullDetails);
      // Check if a bug with the same message ID already exists
      const bugExists = rows.some(row => extractMsgId(row[fullDetailsIndex]) === bugMsgId);

      if (!bugExists) {
        sheet.appendRow([
          bug.environment,
          bug.createdOn,
          bug.priority,
          bug.fullDetails,
          bug.addedToJira,
          bug.assignedTo,
          bug.status
        ]);
        newBugs++;
      }
    } else if (bug.type === "update" && bug.originalBugId) {
      // Find the row that contains the original bug ID
      const rowIndex = rows.findIndex(row => {
        const rowMsgId = extractMsgId(row[fullDetailsIndex]);
        return rowMsgId === bug.originalBugId;
      }) + 2;

      if (rowIndex > 1) { // rowIndex is 2 or greater if found
        sheet.getRange(rowIndex, statusIndex + 1).setValue(bug.status);
        // REFINEMENT: Also handle 'Assigned to' from the update message if present
        if (bug.assignedTo && bug.assignedTo !== "N/A") {
          sheet.getRange(rowIndex, assignedToIndex + 1).setValue(bug.assignedTo);
        }
        updatedBugs++;
        console.log(`Updated bug ${bug.originalBugId} with status: ${bug.status}`);
      } else {
        console.log(`Could not find original bug for update: ${bug.originalBugId}`);
      }
    }
  });

  console.log(`\n Sync completed: ${newBugs} new, ${updatedBugs} updated`);
}


function getSlackBugs(date) {
  const channelId = "C1234567890"; // Replace with actual channel ID
  const token = "xoxb-YOUR_SLACK_BOT_TOKEN"; // Replace with actual bot token
  const oldest = Math.floor(date.getTime() / 1000);
  const bugs = [];
  let cursor = null;

  do {
    let url = `https://slack.com/api/conversations.history?channel=${channelId}&oldest=${oldest}&limit=100`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: "Bearer " + token }
    });
    const result = JSON.parse(response.getContentText());
    if (!result.ok) {
      console.error("❌ Slack API error:", result.error);
      break;
    }

    const pageMessages = result.messages || [];

    pageMessages.forEach(msg => {
      const text = msg.text || "";
      const timestamp = new Date(Number(msg.ts) * 1000);
      const isBugSubmission = (text.includes("*Status :*") || text.includes("Status :")) &&
                              (text.includes("*Summary:*") || text.includes("Summary:"));
      const isStatusUpdate = text.includes("New Status:");
      const permalink = `https://slack.com/archives/${channelId}/p${msg.ts.replace('.', '')}`;

      if (isBugSubmission) {
        bugs.push({
          type: "new",
          environment: extractFieldValue(text, "*Environment:*") || "Unknown",
          createdOn: timestamp,
          priority: extractPriority(text) || "Unknown",
          fullDetails: permalink,
          addedToJira: extractFieldValue(text, "*Added to Jira?*") || "No",
          assignedTo: extractFieldValue(text, "*Assigned to:*") || "Unassigned",
          status: extractFieldValue(text, "*Status :*") || "New",
        });
      } else if (isStatusUpdate) {
        const originalBugId = extractOriginalBugId(text);
        const newStatus = extractStatusFromUpdate(text);

        if (originalBugId && newStatus) {
          // REFINEMENT: Simplify the bug object to only what's needed
          bugs.push({
            type: "update",
            originalBugId: originalBugId,
            status: newStatus,
            assignedTo: extractFieldValue(text, "*Assigned to:*") || "N/A"
          });
          console.log(`Found status update: ${originalBugId} -> ${newStatus}`);
        }
      }
    });
    cursor = result.response_metadata?.next_cursor;
  } while (cursor);

  return bugs;
}

// Function for getting the ID from the update text
function extractOriginalBugId(text) {
  const match = text.match(/https:\/\/[^\/]+\.slack\.com\/archives\/[^\/]+\/p(\d+)/);
  return match ? match[1] : null;
}

// Function to get status from an update.
function extractStatusFromUpdate(text) {
  const match = text.match(/New Status:\s*([\s\S]*?)(?:\s*\(edited\))?$/);
  return match ? match[1].trim() : null;
}
