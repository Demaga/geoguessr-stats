browser.action.onClicked.addListener((tab) => {
    const pageUrl = browser.runtime.getURL('events_page/events.html');
    
    browser.tabs.create({
        url: pageUrl
    });
});

let db;
const gamesWaitingForFinalUpdate = new Set();

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    let dbRequest = indexedDB.open("GeoGuessrStats", 1);

    dbRequest.onupgradeneeded = function (event) {
      console.log("Database upgrade needed");
      db = event.target.result;
      if (!db.objectStoreNames.contains("Events")) {
        db.createObjectStore("Events", { keyPath: "_id", autoIncrement: true });
        console.log("Object store 'Events' created");
      }
    };

    dbRequest.onsuccess = function (event) {
      console.log("Database opened successfully");
      db = event.target.result;
      resolve(db);
    };

    dbRequest.onerror = function (event) {
      console.error("Database error: " + event.target.error);
      reject("Database error");
    };
  });
}

async function saveData(data) {
  // note that only valid JSON objects can be saved
  try {
    await openDB();
    let transaction = db.transaction(["Events"], "readwrite");
    let store = transaction.objectStore("Events");
    let request = store.add(data);

    return new Promise((resolve, reject) => {
      request.onsuccess = function (event) {
        console.log("Data saved successfully with ID:", event.target.result);
        resolve(event.target.result);
      };

      request.onerror = function (event) {
        console.error("Error saving data:", event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("Error saving data:", error, data);
  }
}

//local storage functions
async function getLocalStorageItem(key) {
  try {
    const result = await browser.storage.local.get(key);
    return result[key];
  } catch (error) {
    console.error(`[BG] Error getting ${key} from storage:`, error);
    return undefined;
  }
}


async function setLocalStorageItem(itemsToSet) {
  try {
    await browser.storage.local.set(itemsToSet);
  } catch (error) {
    console.error(`[BG] Error setting items in storage:`, itemsToSet, error);
    throw error; 
  }
}

//save the current player ID in local storage if it is not already set
async function updatePlayerIdIfNeeded(incomingPlayerId) {
  if (!incomingPlayerId) return;

  const storedPlayerId = await getLocalStorageItem("currentPlayerId");
  if (storedPlayerId === incomingPlayerId) {
    console.log(
      `[BG] Player ID is already set to ${incomingPlayerId}. No update needed.`
    );
    return;
  }
  await setLocalStorageItem({ currentPlayerId: incomingPlayerId });
}

browser.runtime.onMessage.addListener(async (message) => {
  if (message.data?.code === "HeartBeat" || !message.data?.code) return;

  if (message.type === "websocket_passed") {
    console.log("[BG] websocket_passed", message.data);

    const data = message.data;
    if (data?.code === "BullseyeGuess") return;
    try {
      await saveData(data);

      if (data.code === "LiveChallengeFinished") {
        const gameId = data.gameId;
        if (!gameId) return;

        gamesWaitingForFinalUpdate.add(gameId);
        setTimeout(() => {
          if (gamesWaitingForFinalUpdate.has(gameId)) {
            gamesWaitingForFinalUpdate.delete(gameId);
          }
        }, 10000);
      } else if (data.code === "LiveChallengeLeaderboardUpdate") {
        const gameId = data.gameId;

        if (gameId && gamesWaitingForFinalUpdate.has(gameId)) {
          console.log(
            `[BG] Final update for ${gameId} received. Triggering UI refresh.`
          );

          browser.runtime.sendMessage({
            type: "newGameFinished",
            payload: data,
          }).catch((error) => {
            if (error.message.includes("Could not establish connection. Receiving end does not exist.")) {
            } else {
              console.error("Unexpected error sending message:", error);
            }
          });
          gamesWaitingForFinalUpdate.delete(gameId);
        }
      }
    } catch (error) {
      console.error("[BG] Failed to save or process websocket data:", error);
    }
  } else if (
    message.type === "websocket_sent" &&
    message.data?.code === "SubscribeToLobby"
  ) {
    const incomingPlayerId = message.data?.playerId;
    await updatePlayerIdIfNeeded(incomingPlayerId);
  }
});