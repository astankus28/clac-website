# CLAC Grant Tracker — Guide
**Cleveland Lithuanian American Community**
**cle-grants.vercel.app**

---

## Overview

The Grant Tracker is a live web application that tracks grant opportunities for CLAC. It pulls data directly from a Google Sheet, so updating the tracker is as simple as editing a spreadsheet. No coding required.

The tracker is also embedded directly inside the CLAC Dashboard under **Board → Board Portal** so board members can access it without leaving the admin panel.

---

## Accessing the Tracker

**Public URL:** `cle-grants.vercel.app`
**Inside Dashboard:** Dashboard → Board → Board Portal → Grant Tracker section

---

## How It Works

The tracker reads from a Google Sheet. Any changes you make to the sheet appear on the tracker within a few seconds (after a page refresh).

**The data flow:**
Google Sheet → Grant Tracker App → Board Portal embed

---

## Updating Grant Data

### Opening the Google Sheet
The source spreadsheet is linked in the Board Portal quick access links. If you don't have the link, ask Andrew Stankus for access.

### Sheet Structure
The spreadsheet has the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| **Funder** | Organization offering the grant | Ohio Arts Council |
| **Grant Name** | Name of the specific grant program | Arts Access Grant |
| **Amount** | Dollar range or maximum award | $500 – $5,000 |
| **Deadline** | Application deadline | March 15, 2026 |
| **Status** | Current status | Researching / Drafting / Submitted / Awarded / Declined |
| **Notes** | Any relevant details | Requires 501(c)(3) docs, 2-year operating history |
| **Funder Website** | Direct link to the grant page | https://... |
| **Drive Link** | Link to application documents in Google Drive | https://drive.google.com/... |
| **Eligible** | Is CLAC eligible? | Yes / No / Maybe |
| **Priority** | How important to pursue | High / Medium / Low |

### Adding a New Grant
1. Open the Google Sheet
2. Scroll to the next empty row
3. Fill in the columns above
4. The tracker updates automatically on next refresh

### Updating an Existing Grant
1. Find the grant row in the Google Sheet
2. Update the Status, Notes, or any other field
3. Refresh the tracker to see the change

### Status Values
Use these consistent status labels so the tracker can color-code correctly:

- **Researching** — you've identified it but haven't started applying
- **Drafting** — application is in progress
- **Submitted** — application sent, awaiting decision
- **Awarded** — grant received 🎉
- **Declined** — application was not successful
- **Not Eligible** — CLAC doesn't qualify
- **Recurring** — annual grant that CLAC applies to every year

---

## Filtering and Viewing

The tracker has filter buttons at the top:
- **All** — shows every grant in the sheet
- **Active** — Researching, Drafting, Submitted
- **Awarded** — successful grants
- **Upcoming Deadlines** — grants with deadlines in the next 60 days

Click any grant row to expand details including notes and links.

---

## Google Drive Organization

Keep grant application materials organized in Google Drive with this folder structure:

```
CLAC Grants/
├── Active Applications/
│   ├── Ohio Arts Council 2026/
│   │   ├── Application Draft.docx
│   │   ├── Budget.xlsx
│   │   └── Supporting Documents/
│   └── ...
├── Submitted/
├── Awarded/
│   ├── [Grant Name] [Year]/
│   └── ...
└── Templates/
    ├── CLAC Organization Overview.docx
    ├── Budget Template.xlsx
    └── 501(c)(3) Determination Letter.pdf
```

Link the relevant Google Drive folder in the **Drive Link** column of the spreadsheet for quick access from the tracker.

---

## Documents You'll Need for Most Applications

Keep these ready in Google Drive — almost every grant application asks for them:

- **501(c)(3) Determination Letter** — proof of nonprofit status (from IRS)
- **EIN (Tax ID Number)** — CLAC's federal employer identification number
- **Board Member List** — names, roles, contact info
- **Most Recent Financial Statements** — income/expense report, balance sheet
- **Annual Budget** — current year projected budget
- **Organization Description** — 1-2 paragraph overview of CLAC's mission and programs
- **Program Description** — what the grant will specifically fund

---

## Grant Finding Resources

Good sources for finding new grants relevant to CLAC:

**Ohio / Northeast Ohio:**
- Ohio Arts Council — oac.ohio.gov
- Cuyahoga Arts & Culture — cacgrants.org
- The Cleveland Foundation — clevelandfoundation.org
- GAR Foundation — garfdn.org
- Sisters of Charity Foundation — scfcleveland.org
- Community West Foundation — communitywestfoundation.org

**National / Lithuanian specific:**
- Lithuanian American Community, Inc. (national) — check with javlb.lt
- National Endowment for the Arts — arts.gov
- National Endowment for the Humanities — neh.gov
- American Folklife Center (Library of Congress)

**Cultural / Heritage:**
- Ethnic Heritage organizations in your region
- State humanities councils
- Community foundations with cultural focus areas

**Nonprofit infrastructure:**
- Google for Nonprofits — google.com/nonprofits (free Google Workspace + $10k/mo Ads)
- TechSoup — techsoup.org (discounted software for nonprofits)
- Canva for Nonprofits — free Canva Pro

---

## Tips for Successful Grant Applications

**Start early.** Most grants require significant documentation. Start at least 4-6 weeks before the deadline.

**Read the guidelines carefully.** Every funder has specific eligibility requirements and priorities. Don't waste time applying for grants CLAC doesn't qualify for.

**Be specific.** Vague applications don't get funded. "We want to preserve Lithuanian culture" is weak. "We will fund 12 Saturday School sessions for 20 children ages 6-14, purchasing $400 in Lithuanian language workbooks and $100 in cultural craft supplies" is strong.

**Show community impact.** Funders want to know who benefits and how many people you reach. Track attendance at events, number of Saturday School students, social media reach, website visitors.

**Follow up after submitting.** A brief thank-you email to the program officer after submitting is appropriate and keeps CLAC on their radar.

**Keep records.** If awarded, document how the funds were spent. Funders often require a report and may ask to see receipts. Good records also make renewal applications easier.

---

## Updating the Tracker App Itself

The tracker app lives at `cle-grants.vercel.app` and is deployed automatically from the GitHub repository. If you need changes to the app's design or functionality, contact Andrew Stankus.

The Google Sheet connection is configured in the app's environment variables on Vercel. If the sheet ID changes (e.g. you create a new spreadsheet), the Vercel config needs to be updated.

---

## Troubleshooting

**Data isn't showing up:**
- Refresh the page
- Check that the Google Sheet column headers exactly match what's expected (case-sensitive)
- Make sure the sheet is shared with the service account email (ask Andrew for this email address)

**Can't access the Google Sheet:**
- Request access from Andrew Stankus or the board chair
- Make sure you're logged into the correct Google account

**The tracker page isn't loading:**
- Check your internet connection
- Try opening `cle-grants.vercel.app` directly in a browser
- Contact Andrew Stankus if the issue persists

---

*Built by Andrew Stankus · Last updated April 2026*
