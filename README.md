# 📊 E-SIM Sales Dashboard

A real-time sales analytics dashboard for an eSIM & Telecom business, built with **plain HTML, CSS, and JavaScript** — no frameworks, no build tools — backed by **Supabase**.

🔗 **Live Demo:** [e-sim-dashboard.vercel.app](https://e-sim-dashboard.vercel.app/)

---

## Overview

This dashboard gives a single-page view into daily and month-to-date (MTD) sales performance across representatives, products, and destinations. It's designed to answer, at a glance: *How are we doing today vs. yesterday? Who's leading the team? What's selling, and where?*

Built entirely with vanilla web technologies to stay lightweight, dependency-free, and easy to host on any static platform.

---

## ✨ Features

- **KPI Cards** — Today's Sales & Revenue, MTD Sales & Revenue, AOV (Average Order Value), and period-over-period growth percentages
- **Sales Trends** — Daily Sales, Daily Revenue, and Monthly Sales charts with adjustable date ranges and hover tooltips
- **Sales Representative Leaderboard** — Fully sortable ranking table with a clickable drill-down modal per rep, showing individual contribution %, performance snapshot, and historical sales trend (daily/weekly toggle)
- **Product Analytics** — Top products by sales and by revenue, SIM Type Split (eSIM vs. Plastic SIM), and Validity Distribution (5–60 day plans)
- **Destination Analytics** — Top destinations by order volume, with stacked bars showing the eSIM vs. Plastic SIM mix per country
- **Performance Comparison** — Today vs. Yesterday and MTD vs. Previous MTD, with growth % and AOV deltas
- **Report Date Filter** — Select any date within the available data range to recalculate the entire dashboard via a single Supabase RPC call
- **CSV Export** — Download the current leaderboard as a CSV report
- **Fully Responsive** — Works across desktop, tablet, and mobile viewports

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (no frameworks, no build step)
- **Backend/Data:** [Supabase](https://supabase.com/) (PostgreSQL + RPC functions)
- **Hosting:** [Vercel](https://vercel.com/)
- **Core data source:** `get_full_sales_dashboard(report_date)` — a single Postgres RPC function returning all dashboard data for a given report date

---

## 📸 Preview

*(Add a screenshot or GIF of the dashboard here)*

---

## 🚀 Getting Started

This project has no build step — it's plain HTML/CSS/JS.

```bash
# Clone the repo
git clone https://github.com/Ashupa2el/E-sim-Dashboard.git
cd E-sim-Dashboard

# Open index.html directly in a browser, or serve it locally:
npx serve .
```

You'll need your own Supabase project with a `get_full_sales_dashboard(report_date)` RPC function and the corresponding sales schema. Add your Supabase URL and anon/public API key to the project's config before running.

---

## 📁 Project Structure

```
E-sim-Dashboard/
├── index.html      # Main dashboard markup
├── styles.css       # Styling (dark theme, single-accent color system)
├── app.js           # Dashboard logic, Supabase queries, chart rendering
└── README.md
```

---

## 👤 Author

**Ashutosh Patel**
BTech CSE (AIML), GLA University
GitHub: [@Ashupa2el](https://github.com/Ashupa2el)

---

## 📄 License

© 2026 Ashutosh Patel. All rights reserved.
