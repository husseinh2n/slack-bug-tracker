function dailyBugSync() {
  console.log("🚀 Starting dailyBugSync");

  // Get or create the Bug Tracker sheet
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("Bug Tracker") || createSheet();

  // Fetch bugs from the last x days
  const yesterday = new Date(Date.now() - 604800000); //604800000 is  7 days
  const bugs = getSlackBugs(yesterday);
  console.log("🐛 Retrieved " + bugs.length + " bugs from Slack");

  if (bugs.length === 0) {
    console.log("⚠️ No bugs found");
    return;
  }

  // Prepare sheet data and get column indices
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const environmentIndex = headers.indexOf("Environment");
  const createdOnIndex = headers.indexOf("Created on");
  const priorityIndex = headers.indexOf("Priority");
  const fullDetailsIndex = headers.indexOf("Full Details");
  const jiraIndex = headers.indexOf("Added to Jira?");
  const assignedToIndex = headers.indexOf("Assigned to");
  const statusIndex = headers.indexOf("Status");

  let newBugs = 0;
  let updatedBugs = 0;

  bugs.forEach(bug => {
    // Extract Slack message ID from permalink for deduplication
    const extractMsgId = url => {
      const match = url.match(/p(\d{16})$/);
      return match ? match[1] : null;
    };

    const bugMsgId = extractMsgId(bug.permalink);
    const rowIndex = rows.findIndex(row => extractMsgId(row[fullDetailsIndex]) === bugMsgId) + 2;

    // Append new bug if it doesn't exist
    if (bug.type === "new" && rowIndex === 1) {
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

    // Update existing bug if found
    } else if (bug.type === "update" && rowIndex > 1) {
      sheet.getRange(rowIndex, statusIndex + 1).setValue(bug.status);
      if (bug.assignedTo && bug.assignedTo !== "N/A") {
        sheet.getRange(rowIndex, assignedToIndex + 1).setValue(bug.assignedTo);
      }
      updatedBugs++;
    }
  });

  console.log("\n Sync completed: " + newBugs + " new, " + updatedBugs + " updated");
}

function getSlackBugs(date) {
  const channelId = "C1234567890"; // Replace with actual channel ID
  const token = "xoxb-YOUR_SLACK_BOT_TOKEN"; // Replace with actual bot token
  const oldest = Math.floor(date.getTime() / 1000);
  const bugs = [];
  let cursor = null;
  let pageCount = 0;
  const limit = 100;

  do {
    pageCount++;
    let url = `https://slack.com/api/conversations.history?channel=${channelId}&oldest=${oldest}&limit=${limit}`;
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
    let pageNewBugs = 0;
    let pageUpdates = 0;

    pageMessages.forEach(msg => {
      const text = msg.text || "";
      const timestamp = new Date(Number(msg.ts) * 1000);
      const hasStatus = text.includes("*Status :*");
      const hasSummary = text.includes("*Summary:*");
      const isBugSubmission = hasStatus && hasSummary;
      const isStatusUpdate = text.includes("New Status:");
      const permalink = `https://slack.com/archives/${channelId}/p${msg.ts.replace('.', '')}`;

      // Handle new bug reports
      if (isBugSubmission) {
        pageNewBugs++;
        bugs.push({
          type: "new",
          environment: extractFieldValue(text, "*Environment:*") || "Unknown",
          createdOn: timestamp,
          priority: extractPriority(text) || "Unknown",
          fullDetails: permalink,
          addedToJira: extractFieldValue(text, "*Added to Jira?*") || "No",
          assignedTo: extractFieldValue(text, "*Assigned to:*") || "Unassigned",
          status: extractFieldValue(text, "*Status :*") || "New",
          permalink: permalink
        });

      // Handle status update messages
      } else if (isStatusUpdate) {
        pageUpdates++;
        bugs.push({
          type: "update",
          environment: "N/A",
          submittedBy: "System",
          createdOn: timestamp,
          priority: "N/A",
          fullDetails: "Status Update",
          addedToJira: "N/A",
          assignedTo: extractFieldValue(text, "*Assigned to:*") || "N/A",
          status: extractStatus(text) || "Updated",
          permalink: permalink
        });
      }
    });

    cursor = result.response_metadata?.next_cursor;
    if (pageCount > 50) break; // avoid infinite loops
  } while (cursor);

  return bugs;
}

// Extracts value after a given field name from Slack message text
function extractFieldValue(text, fieldName) {
  const fieldMappings = {
    "*Environment:*": "Environment:",
    "*Added to Jira?*": "Added to Jira\\?",
    "*Assigned to:*": "Assigned to:",
    "*Summary:*": "Summary:",
    "*Status :*": "Status\\s*:"
  };

  const searchPattern = fieldMappings[fieldName] || fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp("\\*" + searchPattern + "\\*\\s*(.+)", 'i'),
    new RegExp("\\*" + searchPattern + "\\*\\s*\\n([^\\n*]+)", 'i'),
    new RegExp(searchPattern + "\\s*(.+)", 'i')
  ];

  for (let pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  return null;
}

// Extracts status value from status update message
function extractStatus(text) {
  const match = text.match(/New Status:\s*(.+)/);
  return match ? match[1].trim() : "Updated";
}

// Infers priority from Slack emoji or text
function extractPriority(text) {
  if (text.includes(":red_circle:")) return "Critical";
  if (text.includes(":large_orange_circle:")) return "High";
  if (text.includes(":yellow_circle:")) return "Medium";
  if (text.includes(":green_circle:")) return "Low";

  const match = text.match(/\*Priority:\*\s*([^\n]+)/i);
  return match ? match[1].replace(/:[^:]+:/g, '').trim() : "Unknown";
}

// Creates a new "Bug Tracker" sheet with headers
function createSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.insertSheet("Bug Tracker");
  const headers = ["Environment", "Created on", "Priority", "Full Details", "Added to Jira?", "Assigned to", "Status"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sheet;
}
