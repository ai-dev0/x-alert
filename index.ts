/**
 * index.ts
 *
 * This script launches Puppeteer in non-headless mode to open Twitter's login page.
 * You must log in manually.
 * After you press ENTER in the terminal, the script navigates to the notifications page.
 * It then injects a MutationObserver that, on any change, queries all posts
 * (using data-testid="cellInnerDiv") and logs the last post only if it is new.
 */

import puppeteer from "puppeteer"
import readline from "readline"

/**
 * Wait for the user to press ENTER in the terminal.
 */
async function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    rl.question(
      "Please log in manually in the opened browser, then press ENTER here to continue...",
      () => {
        rl.close()
        resolve()
      }
    )
  })
}

async function main() {
  // Launch Puppeteer in non-headless mode for manual login.
  const browser = await puppeteer.launch({
    headless: false,
    // Uncomment the following if you need to slow down actions for debugging:
    // slowMo: 50,
  })

  try {
    const page = await browser.newPage()

    // Step 1: Open Twitter's login page.
    await page.goto("https://twitter.com/login", {
      waitUntil: "networkidle2",
    })
    console.log("Browser launched. Please log in manually.")

    // Wait until you confirm (via ENTER in the terminal) that you’ve logged in.
    await waitForEnter()

    console.log(
      "Manual login complete. Navigating to the notifications page..."
    )

    // Step 2: Navigate to the notifications page.
    await page.goto("https://twitter.com/notifications", {
      waitUntil: "networkidle2",
    })

    // Step 3: Wait for the notifications container to load.
    // The container is assumed to be identified by an aria-label starting with "Timeline: Notifications"
    const notificationsSelector = 'div[aria-label^="Timeline: Notifications"]'
    await page.waitForSelector(notificationsSelector, { timeout: 60000 })
    console.log("Notifications page loaded.")

    // Forward any console.log messages from the page context to our terminal.
    page.on("console", (msg) => {
      console.log(`PAGE LOG: ${msg.text()}`)
    })

    // Step 4: Inject a MutationObserver into the notifications container.
    // This observer will, upon any mutation, query all posts (divs with data-testid="cellInnerDiv"),
    // check if the count has increased, and if so, log the last one only.
    await page.evaluate((containerSelector) => {
      const container = document.querySelector(containerSelector)
      if (!container) {
        console.log("Could not find the notifications container!")
        return
      }

      const notificationsInital = container.querySelectorAll(
        'div[data-testid="cellInnerDiv"]'
      )
      let initalNotificationCount = notificationsInital.length

      console.log(`Found ${initalNotificationCount} initial notifications.`)

      //log all notifications
      notificationsInital.forEach((notification) => {
        console.log("\n\n Notification, \n", notification.textContent)
      })

      // Function to check notifications and log the new one if available.
      function checkNotifications() {
        if (!container) {
          console.log("Could not find the notifications container!")
          return
        }

        // Query all notification posts by their data-testid attribute.
        const notifications = container.querySelectorAll(
          'div[data-testid="cellInnerDiv"]'
        )

        if (notifications.length > initalNotificationCount) {
          // New notification(s) have been added.
          initalNotificationCount = notifications.length
          const lastNotification = notifications[notifications.length - 1]
          console.log(
            "New notification detected:",
            lastNotification.textContent
          )
        }
      }

      // Set up the MutationObserver to run checkNotifications on any childList changes.
      const observer = new MutationObserver(() => {
        console.log("Mutation detected.")
        // Each mutation triggers a full reload of the notifications list.
        checkNotifications()
      })

      observer.observe(container, {
        childList: true,
        subtree: true,
      })

      // Do an initial check in case there are already notifications.
      //   checkNotifications()

      console.log("MutationObserver set up for notifications.")
    }, notificationsSelector)

    console.log("Now watching for new notifications. Press Ctrl+C to exit.")

    // Keep the script running indefinitely.
    await new Promise(() => {})
  } catch (err) {
    console.error("Error occurred:", err)
  }
}

main().catch(console.error)
