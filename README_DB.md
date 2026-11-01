# Smart Queue Management System - Oracle PL/SQL version

Two versions live in this repository:

| File | What it does |
|---|---|
| `index.html` + `script.js` | Browser-only version (queue kept in browser memory). Works on GitHub Pages. |
| `index-db.html` + `script_db.js` + `server.js` | Database version. Queue logic runs in Oracle PL/SQL. |

## Setup (database version)
1. Run `database/queue_management_plsql.sql` in your Oracle schema (SQL Developer / SQL*Plus).
2. Install Node.js, then in this folder run: `npm install`
3. Set your database login (Mac/Linux):
   ```
   export DB_USER=your_username
   export DB_PASSWORD=your_password
   export DB_CONNECT=localhost:1521/XEPDB1
   ```
   (Windows PowerShell: `$env:DB_USER="your_username"` and so on.)
4. Start the server: `node server.js`
5. Open http://localhost:3000/index-db.html

## How it connects
| Button | API call | PL/SQL |
|---|---|---|
| Generate Token | POST /api/token | `queue_pkg.generate_token` |
| Serve Next Customer | POST /api/serve | `queue_pkg.serve_next` |
| Page load / refresh | GET /api/queue | `v_waiting_queue`, `wait_for_position`, `total_waiting`, `next_token_no`, `estimated_wait` |

The database version needs the Node server running, so it cannot be hosted on GitHub Pages.

Waiting times follow script.js: the customer at position n waits (n - 1) x 5 minutes, and the last token's wait is (total - 1) x 5 minutes.
Change `c_avg_service_min` in `queue_pkg` if you change `serviceTime` in script.js.
