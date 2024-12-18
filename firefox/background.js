browser.action.onClicked.addListener((message) => {
    browser.tabs.create({
        url: 'events.html'
    });
});

let db;


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
                db.createObjectStore("Events", { keyPath: '_id', autoIncrement: true });
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

browser.runtime.onMessage.addListener((message) => {
    let data = JSON.parse(message.data);
    if (data["code"] == "BullseyeGuess")
        return
    let to_save = {
        "code": data["code"],
        "timestamp": data["timestamp"],
        "data": data
    }
    saveData(to_save);
    console.log("ws: data saved", message);
});

browser.webRequest.onBeforeRequest.addListener(
    (details) => {
        if (details.method != "POST")
            return

        var data = [];
        let filter = browser.webRequest.filterResponseData(details.requestId);
        filter.ondata = (event) => {
            data.push(event.data);
        };

        filter.onstop = (event) => {
            let decoder = new TextDecoder("utf-8");
            let encoder = new TextEncoder();

            let str = "";
            if (data.length === 1) {
                str = decoder.decode(data[0]);
            } else {
                for (let i = 0; i < data.length; i++) {
                    const stream = i !== data.length - 1;
                    str += decoder.decode(data[i], { stream });
                }
            }
            let obj = JSON.parse(str);

            let to_save = {
                "code": "singlePlayerGameRoundFinished",
                "timestamp": new Date().toISOString(),
                "data": obj
            }
            saveData(to_save);
            console.log("webRequest: data saved", to_save);

            filter.write(encoder.encode(str));
            filter.disconnect();
        };

        return {};

    },
    {
        "urls": ["https://www.geoguessr.com/api/v3/games/*"]
    },
    ["blocking"],
)