Slack Bug Tracker & Automated Reporting

Automatically sync bug reports from Slack to Google Sheets and generate daily/weekly reports

🚀 What It Does
This Google Apps Script solution automatically:

Syncs bug reports from Slack messages to a Google Sheets tracker
Generates daily reports with yesterday's activity and current status
Creates weekly summaries with trends, priorities, and team assignments
Sends formatted reports directly to Slack channels

Perfect for teams that report bugs in Slack but need organized tracking and regular status updates.
📊 Features
Bug Tracking

Parses structured bug reports from Slack messages
Extracts environment, priority, status, assignments, and Jira info
Handles both new bug submissions and status updates
Automatically creates and maintains Google Sheets tracker

Automated Reports

Daily Reports: New bugs, fixes, status changes, current breakdowns
Weekly Reports: Trends, aging issues, team performance, comprehensive stats
Slack Integration: Reports delivered directly to your team channel
Smart Scheduling: Set up automated daily/weekly delivery

Data Intelligence

Priority extraction from emoji indicators (:red_circle:, :orange_circle:, etc.)
Environment categorization (Production, Staging, Development, etc.)
Assignment tracking and team workload distribution
Aging bug detection for high-priority issues

🛠️ Quick Start
Prerequisites

Google account (for Google Apps Script & Sheets)
Slack workspace with bug reporting channel
Slack bot token with channel read permissions

Installation

Clone this repository
bashgit clone https://github.com/yourusername/slack-bug-tracker.git

Create Google Apps Script project

Go to script.google.com
Create new project
Copy code from src/main.gs and src/reports.gs


Configure Slack Integration

Update channelId and token in the code
Set up Slack webhook URL for report delivery


Set up automation

Create time-based triggers for daily/weekly reports
Test with generateDailyReport() and generateWeeklyReport()



📚 Detailed setup instructions: setup/google-apps-script-setup.md
📋 Report Examples
Daily Report Preview
📊 Daily Bug Report - 6/14/2025

📈 Yesterday's Activity:
- 🆕 New bugs: 3
- ✅ Fixed bugs: 1
- 🔄 Status updates: 2

🚨 Current Status:
- In Progress: 4 bugs
- New: 3 bugs
- Fixed: 2 bugs
- Total open bugs: 9

🔥 Priority Breakdown:
- High: 3 bugs
- Medium: 4 bugs
- Low: 2 bugs
Weekly Report Preview
📈 Weekly Bug Report - Week of 6/8/25 - 6/14/25

📊 This Week:
- New bugs reported: 12
- Status updates: 8
- Total bugs: 47

⚠️ Aging High Priority Issues:
- 1 high priority bug with no status change for 7+ days

👥 Assignment Status:
- Assigned: 40 bugs
- Unassigned: 7 bugs
- Top assignees: kholood (8), john (5), sarah (3)
See full examples →
🎯 Use Cases

Development Teams: Track bugs from Slack discussions
QA Teams: Monitor testing issues and resolution progress
Product Teams: Get regular status updates on critical issues
Small Companies: Bug tracking without expensive tools
Remote Teams: Centralized bug visibility across time zones

🔧 Customization
The system is designed to be easily customizable:

Report Templates: Modify message formats in reports.gs
Data Fields: Adjust tracked fields in the Google Sheets structure
Slack Parsing: Update regex patterns for different message formats
Scheduling: Configure report frequency and timing
Recipients: Send reports to multiple channels or email

📝 License
This project is licensed under the MIT License - see the LICENSE file for details.



