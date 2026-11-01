# Smart Queue Management System

A simple web-based queue management system built with HTML, CSS and JavaScript. It generates tokens for customers, shows the waiting queue, and estimates waiting time.

Mini project for the subject **Computing Aptitude**.

## Features

- Generate a unique token number for each customer (starting from 101)
- Waiting queue with first-come-first-served order
- "Now Serving" display
- Estimated waiting time for every customer (5 minutes per customer)
- Live statistics: total waiting customers, next token number, last-token waiting time
- Queue is saved in the browser (`localStorage`), so it survives a page refresh
- Press **Enter** to generate a token quickly
- Reset button to start a fresh queue

## Technologies Used

- HTML5
- CSS3
- JavaScript (vanilla, no libraries)

## How to Run

1. Download or clone this repository.
2. Open `index.html` in any web browser.

No installation or server is needed.

## Project Structure

```
smart-queue-management/
├── index.html
├── style.css
├── script.js
└── README.md
```

## How It Works

- The queue is stored as an array (`queue`) of objects `{ token, name }`.
- Adding a customer uses `push()`, serving uses `shift()` (FIFO).
- Waiting time for a customer = position in queue x average service time.

## Author

Your Name
