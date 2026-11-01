// Oracle-backed version of script.js: the queue rules run in PL/SQL.
// This page only sends requests to the Node.js server and shows the result.
let lastTotal = 0;

async function api(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed.");
  return data;
}

// Update queue and waiting times (same output format as script.js)
function updateQueue(state) {
  let list = document.getElementById("queueList");
  list.innerHTML = "";

  for (let i = 0; i < state.queue.length; i++) {
    let item = document.createElement("li");
    item.textContent =
      "Token " +
      state.queue[i].token +
      " - " +
      state.queue[i].name +
      " | Estimated Waiting Time: " +
      state.queue[i].waitMin +
      " minutes";
    list.appendChild(item);
  }

  lastTotal = state.total;
  document.getElementById("total").textContent = state.total;
  document.getElementById("nextToken").textContent = state.nextToken;
  document.getElementById("waitingTime").textContent = state.waitTime;
}

async function loadQueue() {
  try {
    updateQueue(await api("/api/queue"));
  } catch (e) {
    alert("Cannot load the queue: " + e.message);
  }
}

// Generate a new token (calls queue_pkg.generate_token)
async function addCustomer() {
  let input = document.getElementById("customerName");
  let name = input.value.trim();

  if (name === "") {
    return;
  }

  try {
    updateQueue(
      await api("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name }),
      })
    );
    input.value = "";
    input.focus();
  } catch (e) {
    alert(e.message);
  }
}

// Serve the next customer (calls queue_pkg.serve_next)
async function serveCustomer() {
  if (lastTotal === 0) {
    return;
  }

  try {
    updateQueue(await api("/api/serve", { method: "POST" }));
  } catch (e) {
    alert(e.message);
  }
}

// Enable Enter key to generate a token
document.addEventListener("DOMContentLoaded", function () {
  let input = document.getElementById("customerName");

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomer();
    }
  });

  loadQueue();
});
