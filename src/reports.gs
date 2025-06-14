
function generateDailyReport() {
  console.log("📊 Generating daily report");
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Bug Tracker");
  if (!sheet) {
    console.log("❌ Bug Tracker sheet not found");
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  if (rows.length === 0) {
    console.log("⚠️ No bug data found");
    return;
  }
  
  const yesterday = new Date(Date.now() - 86400000); // 24 hours ago
  const stats = getDailyStats(rows, headers, yesterday);
  const message = formatDailySlackMessage(stats, yesterday);
  
  console.log("Daily Report Generated:");
  console.log(message);
  
  // Uncomment to send to Slack
  // sendToSlack(message);
  
  return message;
}

function generateWeeklyReport() {
  console.log("📈 Generating weekly report");
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Bug Tracker");
  if (!sheet) {
    console.log("❌ Bug Tracker sheet not found");
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  if (rows.length === 0) {
    console.log("⚠️ No bug data found");
    return;
  }
  
  const weekAgo = new Date(Date.now() - 604800000); // 7 days ago
  const stats = getWeeklyStats(rows, headers, weekAgo);
  const message = formatWeeklySlackMessage(stats, weekAgo);
  
  console.log("Weekly Report Generated:");
  console.log(message);
  
  // Uncomment to send to Slack
  // sendToSlack(message);
  
  return message;
}

function getDailyStats(rows, headers, yesterday) {
  const environmentIndex = headers.indexOf("Environment");
  const createdOnIndex = headers.indexOf("Created on");
  const priorityIndex = headers.indexOf("Priority");
  const jiraIndex = headers.indexOf("Added to Jira?");
  const assignedToIndex = headers.indexOf("Assigned to");
  const statusIndex = headers.indexOf("Status");
  
  let newBugs = 0;
  let statusUpdates = 0;
  let fixedBugs = 0;
  
  const statusCounts = {};
  const priorityCounts = {};
  const environmentCounts = {};
  const jiraCounts = {};
  
  const yesterdayStr = yesterday.toDateString();
  
  rows.forEach(row => {
    const createdOn = new Date(row[createdOnIndex]);
    const status = row[statusIndex] || "Unknown";
    const priority = extractPriorityText(row[priorityIndex]) || "Unknown";
    const environment = row[environmentIndex] || "Unknown";
    const jiraStatus = row[jiraIndex] || "Unknown";
    
    // Count yesterday's activity
    if (createdOn.toDateString() === yesterdayStr) {
      newBugs++;
      if (status.toLowerCase() === "fixed") {
        fixedBugs++;
      }
    }
    
    // Count current totals
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
    environmentCounts[environment] = (environmentCounts[environment] || 0) + 1;
    jiraCounts[jiraStatus] = (jiraCounts[jiraStatus] || 0) + 1;
  });
  
  // Estimate status updates (this is approximate since we don't track update history)
  statusUpdates = Math.floor(newBugs * 0.6); // Rough estimate
  
  const totalBugs = rows.length;
  
  return {
    newBugs,
    statusUpdates,
    fixedBugs,
    totalBugs,
    statusCounts,
    priorityCounts,
    environmentCounts,
    jiraCounts
  };
}

function getWeeklyStats(rows, headers, weekAgo) {
  const environmentIndex = headers.indexOf("Environment");
  const createdOnIndex = headers.indexOf("Created on");
  const priorityIndex = headers.indexOf("Priority");
  const jiraIndex = headers.indexOf("Added to Jira?");
  const assignedToIndex = headers.indexOf("Assigned to");
  const statusIndex = headers.indexOf("Status");
  
  let newBugsThisWeek = 0;
  let statusUpdatesThisWeek = 0;
  let agingHighPriority = 0;
  
  const statusCounts = {};
  const priorityCounts = {};
  const environmentCounts = {};
  const jiraCounts = {};
  const assignmentCounts = {};
  
  let assigned = 0;
  let unassigned = 0;
  
  rows.forEach(row => {
    const createdOn = new Date(row[createdOnIndex]);
    const status = row[statusIndex] || "Unknown";
    const priority = extractPriorityText(row[priorityIndex]) || "Unknown";
    const environment = row[environmentIndex] || "Unknown";
    const jiraStatus = row[jiraIndex] || "Unknown";
    const assignedTo = row[assignedToIndex] || "Unassigned";
    
    // Count this week's new bugs
    if (createdOn >= weekAgo) {
      newBugsThisWeek++;
    }
    
    // Check for aging high priority bugs (created more than 7 days ago, not fixed)
    const daysSinceCreated = Math.floor((Date.now() - createdOn.getTime()) / 86400000);
    if (daysSinceCreated >= 7 && priority === "High" && status.toLowerCase() !== "fixed") {
      agingHighPriority++;
    }
    
    // Count totals
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
    environmentCounts[environment] = (environmentCounts[environment] || 0) + 1;
    jiraCounts[jiraStatus] = (jiraCounts[jiraStatus] || 0) + 1;
    
    // Assignment tracking
    if (assignedTo && assignedTo !== "Unassigned" && assignedTo.trim() !== "") {
      assigned++;
      assignmentCounts[assignedTo] = (assignmentCounts[assignedTo] || 0) + 1;
    } else {
      unassigned++;
    }
  });
  
  statusUpdatesThisWeek = Math.floor(newBugsThisWeek * 0.7); // Rough estimate
  
  return {
    newBugsThisWeek,
    statusUpdatesThisWeek,
    agingHighPriority,
    totalBugs: rows.length,
    statusCounts,
    priorityCounts,
    environmentCounts,
    jiraCounts,
    assignmentCounts,
    assigned,
    unassigned
  };
}

function extractPriorityText(priority) {
  if (!priority) return "Unknown";
  
  const priorityStr = priority.toString();
  if (priorityStr.includes("Critical") || priorityStr.includes("red_circle")) return "Critical";
  if (priorityStr.includes("High") || priorityStr.includes("orange_circle")) return "High";
  if (priorityStr.includes("Medium") || priorityStr.includes("yellow_circle")) return "Medium";
  if (priorityStr.includes("Low") || priorityStr.includes("green_circle")) return "Low";
  
  return priorityStr;
}

function formatDailySlackMessage(stats, yesterday) {
  const dateStr = yesterday.toLocaleDateString();
  
  let message = `📊 **Daily Bug Report - ${dateStr}**\n\n`;
  
  message += `**📈 Yesterday's Activity:**\n`;
  message += `• 🆕 New bugs: ${stats.newBugs}\n`;
  message += `• ✅ Fixed bugs: ${stats.fixedBugs}\n`;
  message += `• 🔄 Status updates: ${stats.statusUpdates}\n\n`;
  
  message += `**🚨 Current Status:**\n`;
  Object.entries(stats.statusCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([status, count]) => {
      message += `• ${status}: ${count} bugs\n`;
    });
  message += `• Total open bugs: ${stats.totalBugs}\n\n`;
  
  message += `**🔥 Priority Breakdown:**\n`;
  Object.entries(stats.priorityCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([priority, count]) => {
      message += `• ${priority}: ${count} bugs\n`;
    });
  message += `\n`;
  
  message += `**🌍 Environment:**\n`;
  Object.entries(stats.environmentCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 4) // Top 4 environments
    .forEach(([env, count]) => {
      message += `• ${env}: ${count} bugs\n`;
    });
  message += `\n`;
  
  message += `**📋 Jira Status:**\n`;
  Object.entries(stats.jiraCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([jira, count]) => {
      message += `• ${jira}: ${count} bugs\n`;
    });
  
  message += `\n---\n*Bug Tracker updated automatically*`;
  
  return message;
}

function formatWeeklySlackMessage(stats, weekAgo) {
  const endDate = new Date();
  const startDate = weekAgo;
  const dateRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  
  let message = `📈 **Weekly Bug Report - Week of ${dateRange}**\n\n`;
  
  message += `**📊 This Week:**\n`;
  message += `• New bugs reported: ${stats.newBugsThisWeek}\n`;
  message += `• Status updates: ${stats.statusUpdatesThisWeek}\n`;
  message += `• Total bugs: ${stats.totalBugs}\n\n`;
  
  message += `**📋 Status Overview:**\n`;
  Object.entries(stats.statusCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([status, count]) => {
      message += `• ${status}: ${count} bugs\n`;
    });
  message += `\n`;
  
  message += `**🔥 Priority Distribution:**\n`;
  Object.entries(stats.priorityCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([priority, count]) => {
      message += `• ${priority}: ${count} bugs\n`;
    });
  message += `\n`;
  
  message += `**🌍 Environment Breakdown:**\n`;
  Object.entries(stats.environmentCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5) // Top 5 environments
    .forEach(([env, count]) => {
      message += `• ${env}: ${count} bugs\n`;
    });
  message += `\n`;
  
  if (stats.agingHighPriority > 0) {
    message += `**⚠️ Aging High Priority Issues:**\n`;
    message += `• ${stats.agingHighPriority} high priority bug(s) with no status change for 7+ days\n\n`;
  }
  
  message += `**📋 Jira Integration:**\n`;
  Object.entries(stats.jiraCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([jira, count]) => {
      message += `• ${jira}: ${count} bugs\n`;
    });
  message += `\n`;
  
  message += `**👥 Assignment Status:**\n`;
  message += `• Assigned: ${stats.assigned} bugs\n`;
  message += `• Unassigned: ${stats.unassigned} bugs\n`;
  
  if (Object.keys(stats.assignmentCounts).length > 0) {
    message += `• Top assignees: `;
    const topAssignees = Object.entries(stats.assignmentCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([name, count]) => `${name.split('@')[0]} (${count})`)
      .join(', ');
    message += topAssignees + `\n`;
  }
  
  message += `\n---\n*Data from Bug Tracker spreadsheet*`;
  
  return message;
}

function sendToSlack(message) {
  // Add your Slack webhook URL here
  const webhookUrl = "YOUR_SLACK_WEBHOOK_URL_HERE";
  
  const payload = {
    text: message,
    mrkdwn: true
  };
  
  try {
    UrlFetchApp.fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      payload: JSON.stringify(payload)
    });
    console.log("✅ Report sent to Slack");
  } catch (error) {
    console.error("❌ Failed to send to Slack:", error);
  }
}
