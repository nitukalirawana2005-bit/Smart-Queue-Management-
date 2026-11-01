const START_TOKEN = 101;
const SERVICE_TIME = 5; // average minutes per customer
const STORAGE_KEY = "smartQueueData";

let tokenNumber = START_TOKEN;
let queue = [];
let nowServing = "None";

// Save data so it survives a page refresh
function saveData() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ tokenNumber, queue, nowServing })
    );
  } catch (e) {
    // storage unavailable: app still works in memory
  }
}

// Load saved data (if any)
function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      tokenNumber = saved.tokenNumber || START_TOKEN;
      queue = saved.queue || [];
      nowServing = saved.nowServing || "None";
    }
  } catch (e) {
    // ignore corrupted or unavailable storage
  }
}

function showMessage(text) {
  document.getElementById("message").textContent = text;
}

// Generate a new token
function addCustomer() {
  const input = document.getElementById("customerName");
  const name = input.value.trim();

  if (name === "") {
    showMessage("Please enter a customer name.");
    input.focus();
    return;
  }

  queue.push({ token: tokenNumber, name: name });
  tokenNumber++;

  input.value = "";
  showMessage("");
  updateQueue();
  input.focus();
}

// Serve the next customer
function serveCustomer() {
  if (queue.length === 0) {
    showMessage("No customers in the queue.");
    return;
  }

  const served = queue.shift();
  nowServing = "Token " + served.token + " - " + served.name;
  showMessage("");
  updateQueue();
}

// Clear everything and start again
function resetQueue() {
  if (!confirm("Reset the queue and token numbers?")) {
    return;
  }
  queue = [];
  tokenNumber = START_TOKEN;
  nowServing = "None";
  showMessage("");
  updateQueue();
}

// Update queue, statistics and waiting times
function updateQueue() {
  const list = document.getElementById("queueList");
  list.innerHTML = "";

  for (let i = 0; i < queue.length; i++) {
    const item = document.createElement("li");
    const waitingTime = i * SERVICE_TIME;

    item.textContent =
      "Token " +
      queue[i].token +
      " - " +
      queue[i].name +
      " | Estimated Waiting Time: " +
      waitingTime +
      " minutes";

    list.appendChild(item);
  }

  document.getElementById("total").textContent = queue.length;
  document.getElementById("nextToken").textContent = tokenNumber;
  document.getElementById("nowServing").textContent = nowServing;

  const lastWaitingTime =
    queue.length > 0 ? (queue.length - 1) * SERVICE_TIME : 0;
  document.getElementById("waitingTime").textContent = lastWaitingTime;

  saveData();
}

// Enter key generates a token
document.addEventListener("DOMContentLoaded", function () {
  const input = document.getElementById("customerName");

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomer();
    }
  });

  loadData();
  updateQueue();
});
