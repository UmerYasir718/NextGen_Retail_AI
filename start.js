/**
 * Windsurf AI Forecasting - Server Starter
 *
 * This script helps start the server and provides options to run tests.
 */

const { spawn } = require("child_process");
const readline = require("readline");
const path = require("path");

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ASCII art logo
const logo = `
╭──────────────────────────────────────────────────╮
│                                                  │
│   🌊 NextGen Retail AI Forecasting               │
│                                                  │
╰──────────────────────────────────────────────────╯
`;

// Display menu
function displayMenu() {
  console.clear();
  console.log(logo);
  console.log("Choose an option:");
  console.log("1. Start server");
  console.log("2. Run tests");
  console.log("3. Start server and run tests");
  console.log("4. Exit");

  rl.question("\nEnter your choice (1-4): ", handleChoice);
}

// Handle user choice
function handleChoice(choice) {
  switch (choice) {
    case "1":
      startServer();
      break;
    case "2":
      runTests();
      break;
    case "3":
      startServerAndRunTests();
      break;
    case "4":
      console.log("Exiting...");
      rl.close();
      break;
    default:
      console.log("Invalid choice. Please try again.");
      setTimeout(displayMenu, 1000);
  }
}

// Start the server
function startServer() {
  console.clear();
  console.log(logo);
  console.log("Starting Windsurf AI Forecasting server...\n");

  const server = spawn("node", ["index.js"], { stdio: "inherit" });

  server.on("error", (err) => {
    console.error("Failed to start server:", err);
  });

  // This will not execute until the server is terminated
  server.on("close", (code) => {
    console.log(`Server process exited with code ${code}`);
    rl.question("\nPress Enter to return to menu...", displayMenu);
  });
}

// Run tests
function runTests() {
  console.clear();
  console.log(logo);
  console.log("Running tests...\n");

  const tests = spawn(
    "node",
    [path.join(__dirname, "tests", "testEndpoints.js")],
    { stdio: "inherit" }
  );

  tests.on("error", (err) => {
    console.error("Failed to run tests:", err);
  });

  tests.on("close", (code) => {
    console.log(`\nTests finished with code ${code}`);
    rl.question("\nPress Enter to return to menu...", displayMenu);
  });
}

// Start server and run tests
function startServerAndRunTests() {
  console.clear();
  console.log(logo);
  console.log("Starting server and preparing to run tests...\n");

  const server = spawn("node", ["index.js"]);

  // Capture server output
  server.stdout.on("data", (data) => {
    console.log(`Server: ${data}`);

    // When server is ready, run tests
    if (data.toString().includes("running on port")) {
      console.log("\nServer is running. Starting tests in 2 seconds...\n");

      setTimeout(() => {
        const tests = spawn(
          "node",
          [path.join(__dirname, "tests", "testEndpoints.js")],
          { stdio: "inherit" }
        );

        tests.on("close", (code) => {
          console.log(`\nTests finished with code ${code}`);
          console.log(
            "\nServer is still running. Press Ctrl+C to stop and return to menu."
          );
        });
      }, 2000);
    }
  });

  server.stderr.on("data", (data) => {
    console.error(`Server Error: ${data}`);
  });

  server.on("close", (code) => {
    console.log(`\nServer process exited with code ${code}`);
    rl.question("\nPress Enter to return to menu...", displayMenu);
  });
}

// Start the application
displayMenu();
