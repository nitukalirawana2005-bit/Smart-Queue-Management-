// Smart Queue Management System - Node.js backend for the Oracle PL/SQL layer
// Run:  node server.js   then open  http://localhost:3000/index-db.html
const express = require("express");
const oracledb = require("oracledb");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const app = express();
app.use(express.json());
app.use(express.static(__dirname)); // serves index-db.html, style.css, script_db.js

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT || "localhost:1521/XEPDB1",
};

async function withConnection(work) {
  const conn = await oracledb.getConnection(dbConfig);
  try {
    return await work(conn);
  } finally {
    await conn.close();
  }
}

// Reads the queue and statistics using the PL/SQL view and package functions
async function getState(conn) {
  const q = await conn.execute(
    `SELECT token_no, customer_name,
            queue_pkg.wait_for_position(ROW_NUMBER() OVER (ORDER BY token_no))
              AS wait_min
     FROM   v_waiting_queue
     ORDER  BY token_no`
  );
  const s = await conn.execute(
    `SELECT queue_pkg.total_waiting  AS total,
            queue_pkg.next_token_no  AS next_token,
            queue_pkg.estimated_wait AS wait_time
     FROM dual`
  );
  const r = s.rows[0];
  return {
    queue: q.rows.map((x) => ({
      token: x.TOKEN_NO,
      name: x.CUSTOMER_NAME,
      waitMin: x.WAIT_MIN,
    })),
    total: r.TOTAL,
    nextToken: r.NEXT_TOKEN,
    waitTime: r.WAIT_TIME,
  };
}

// Turns ORA-20001 / ORA-20002 raised by the package into a friendly message
function friendlyError(err) {
  const m = /ORA-2000[12]: ([^\n]*)/.exec(err.message || "");
  return m ? m[1] : null;
}

function sendError(res, err) {
  const msg = friendlyError(err);
  if (msg) return res.status(400).json({ message: msg });
  console.error(err);
  res.status(500).json({ message: "Database error. Check the server console." });
}

app.get("/api/queue", async (req, res) => {
  try {
    res.json(await withConnection(getState));
  } catch (err) {
    sendError(res, err);
  }
});

// Generate Token -> queue_pkg.generate_token
app.post("/api/token", async (req, res) => {
  try {
    const name = String((req.body && req.body.name) || "");
    const state = await withConnection(async (conn) => {
      await conn.execute(`BEGIN queue_pkg.generate_token(:name, :token); END;`, {
        name: name,
        token: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      });
      return getState(conn);
    });
    res.status(201).json(state);
  } catch (err) {
    sendError(res, err);
  }
});

// Serve Next Customer -> queue_pkg.serve_next
app.post("/api/serve", async (req, res) => {
  try {
    const result = await withConnection(async (conn) => {
      const out = await conn.execute(
        `BEGIN queue_pkg.serve_next(:token, :name); END;`,
        {
          token: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          name: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 },
        }
      );
      const state = await getState(conn);
      state.served = { token: out.outBinds.token, name: out.outBinds.name };
      return state;
    });
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("Smart Queue server running at http://localhost:" + PORT + "/index-db.html")
);
