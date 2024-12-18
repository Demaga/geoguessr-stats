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

async function getAllData() {
    try {
        await openDB();
        return new Promise((resolve, reject) => {
            let transaction = db.transaction(["Events"], "readonly");
            let store = transaction.objectStore("Events");
            let request = store.getAll();

            request.onsuccess = function (event) {
                let records = event.target.result;
                var processed_records = [];
                for (let record of records) {
                    if ("data" in record)
                        processed_records.push(record.data)
                    else
                        processed_records.push(record)
                }
                resolve(processed_records);
            };

            request.onerror = function (event) {
                reject("Error getting all data");
            };
        });
    } catch (error) {
        console.error("Error in getAllData:", error);
    }
}

function populateTable(events) {
    const tableBody = document.getElementById('eventsTableBody');
    tableBody.textContent = '';
    events = events.slice(-15);
    events = events.reverse();
    events.forEach(event => {
        const row = tableBody.insertRow();
        row.insertCell(0).textContent = JSON.stringify(event);
    });
}

function exportToJsonl(events) {
    const jsonlContent = events.map(event => JSON.stringify(event)).join('\n');
    const blob = new Blob([jsonlContent], { type: 'application/x-jsonlines' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'geoguessr_events.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function importData(file) {
    const content = await file.text();
    const events = content.split('\n').filter(line => line.trim() !== '').map(JSON.parse);

    try {
        await openDB();
        const transaction = db.transaction(["Events"], "readwrite");
        const store = transaction.objectStore("Events");

        for (const event of events) {
            await store.add(event);
        }

        alert("Data imported successfully");
        return await populate();
    } catch (error) {
        console.error("Error importing data:", error);
    }
}

function handleImport() {
    const fileInput = document.getElementById('importFileInput');
    const file = fileInput.files[0];

    if (file) {
        importData(file).then(updatedEvents => {
            if (updatedEvents) {
                populateTable(updatedEvents);
            }
        });
    } else {
        alert("Please select a file to import.");
    }
}

class Stats {
    constructor(events) {
        this.events = events;
        this.gameOptions = this.getGameOptions();

        this.timeframe = "allTime";

        var maps = new Set();
        for (let game of Object.entries(this.gameOptions)) {
            maps.add(game[1].mapSlug);
        }
        this.map = "world";
        this.addMapsSelectOptions(maps);

        this.player = "All";
        this.players = this.getPlayers();
        this.players_today = this.getPlayers(true);
        this.addPlayersSelectOptions();

        this.gameType = "party";
        this.roundCount = 5;
        this.roundTime = 90;
        this.movingAllowed = true;
        this.panningAllowed = true;
        this.zoomingAllowed = true;
        this.anyOptions = true;
        this.anyRoundCount = true;
        this.anyRoundTime = true;
        this.addFilterEventListeners();
    }

    getGameOptions() {
        var roundEvents = this.events.filter(event => event.code == "LiveChallengeLeaderboardUpdate");
        var gameRoundsMap = new Map();
        for (var event of roundEvents) {
            if (!(event.gameId in gameRoundsMap))
                gameRoundsMap[event.gameId] = 1
            else
                gameRoundsMap[event.gameId] += 1
        }

        var filteredEvents = this.events.filter(event => event.code == "LiveChallengeFinished");
        var gameOptions = new Map();
        for (var event of filteredEvents) {
            event.liveChallenge.state.options["date"] = new Date(event.timestamp);
            if (event.gameId in gameRoundsMap)
                gameOptions[event.gameId] = event.liveChallenge.state.options;
        }
        return gameOptions;
    }

    addFilterEventListeners() {
        let filters = [
            "gameTypeSelect",
            "timeFrameSelect",
            "roundCount",
            "roundTime",
            "movingAllowed",
            "panningAllowed",
            "zoomingAllowed",
            "anyOptions",
            "anyRoundCount",
            "anyRoundTime"
        ]
        filters.forEach(element => {
            document.getElementById(element).addEventListener("change", (e) => {
                this[element] = (e.target.value != "on") ? e.target.value : e.target.checked;
                this.populateTopScore();
            })
        });
    }

    addMapsSelectOptions(maps) {
        const mapSelect = document.getElementById("mapSelect");

        let popularMaps = {
            "57357d9f77abe957e8cfd15f": "Dumb test",
            "62a44b22040f04bd36e8a914": "A Community World",
            "5d0ce72c8b19a91fe05aa7a8": "Flags of the World",
            "56f28536148a781b143b0c3b": "European stadiums",
            "5cfda2c9bc79e16dd866104d": "I Saw The Sign 2.0",
            "5b0d907bfaa4cf3ce43bc6b1": "500 000 lieux en France métropolitaine !",
            "56e45886dc7cd6a164e861ac": "US Cities",
            "5d374dc141d2a43c1cd4527b": "GeoDetective",
            "60de2a8a81b92c00015f29e1": "The 198 Capitals Of The World",
            "5d73f83d82777cb5781464f2": "A Balanced World",
            "5dbaf08ed0d2a478444d2e8e": "AI Generated World",
            "5cd30a0d17e6fc441ceda867": "An Extraordinary World",
            "6029991c5048850001d572a9": "A Pinpointable World"
        }

        for (let map of maps) {
            var option;
            if (map in popularMaps)
                option = new Option(popularMaps[map], map);
            else if (map == "world")
                option = new Option(map, map, true, true);
            else
                option = new Option(map, map);
            mapSelect.options[mapSelect.options.length] = option;
        }
        mapSelect.addEventListener("change", (e) => {
            this.map = e.target.value;
            this.populateTopScore();
        })
    }

    getPlayers(today = false) {
        var players = new Map();

        var filteredEvents = this.events.filter(event => event.code == "LiveChallengeLeaderboardUpdate");
        if (today) {
            filteredEvents = filteredEvents.filter(event => {
                let date = new Date(event.timestamp);
                date.setHours(12, 0, 0, 0);
                let today_date = new Date();
                today_date.setHours(12, 0, 0, 0);
                return today_date.getTime() == date.getTime()
            });
        }

        for (var event of filteredEvents) {
            for (let i = 0; i < event.liveChallenge.leaderboards.round.guesses.length; i++) {
                let entry = event.liveChallenge.leaderboards.round.entries[i];
                let player_name = entry.name;
                if (players.has(player_name)) {
                    let old_val = players.get(player_name);
                    players.set(player_name, old_val + 1);
                }
                else
                    players.set(player_name, 1);
            }
        }

        var players = Array.from(players).map(([name, value]) => ({ name, value }))
        players = players.sort((a, b) => b.value - a.value);

        players = players.slice(0, 10);
        var result = [];

        players.forEach(player => {
            result.push(player.name);
        });

        return result;
    }

    addPlayersSelectOptions() {
        var select = document.getElementById("playerSelect");
        for (let player of this.players)
            select.options[select.options.length] = new Option(player, player);
        select.addEventListener("change", (e) => {
            this.player = e.target.value;
            this.populateTopScore();
        })
    }

    populateTopScore() {
        var topScoreDiv = document.getElementById('topScore');
        var scoreList = topScoreDiv.getElementsByClassName("scoreList")[0];
        while (scoreList.firstChild) {
            scoreList.removeChild(scoreList.lastChild);
        }

        var filteredEvents = this.events.filter(event => event.code == "LiveChallengeLeaderboardUpdate");
        filteredEvents = filteredEvents.filter(event => event.gameId in this.gameOptions);

        if (this.map != "All")
            filteredEvents = filteredEvents.filter(event => this.gameOptions[event.gameId].mapSlug == this.map);
        if (!this.anyRoundCount) {
            filteredEvents = filteredEvents.filter(event => this.gameOptions[event.gameId].roundCount == this.roundCount);
        }
        if (!this.anyOptions) {
            filteredEvents = filteredEvents.filter(event => this.gameOptions[event.gameId].movementOptions.forbidMoving == !this.movingAllowed);
            filteredEvents = filteredEvents.filter(event => this.gameOptions[event.gameId].movementOptions.forbidRotating == !this.panningAllowed);
            filteredEvents = filteredEvents.filter(event => this.gameOptions[event.gameId].movementOptions.forbidZooming == !this.zoomingAllowed);
        }
        if (!this.anyRoundTime) {
            filteredEvents = filteredEvents.filter(event => this.gameOptions[event.gameId].roundTime == this.roundTime);
        }

        if (this.timeframe == "today") {
            filteredEvents = filteredEvents.filter(event => {
                let date = new Date(event.timestamp);
                date.setHours(12, 0, 0, 0);
                let today_date = new Date();
                today_date.setHours(12, 0, 0, 0);
                return today_date.getTime() == date.getTime()
            });
        }

        // extract all round scores
        var roundScores = [];
        var nonStandardGames = new Set();
        for (var event of filteredEvents) {
            let gameId = event.gameId;
            let roundNumber = event.liveChallenge.leaderboards.round.roundNumber;
            for (let i = 0; i < event.liveChallenge.leaderboards.round.guesses.length; i++) {
                let guess = event.liveChallenge.leaderboards.round.guesses[i];
                let entry = event.liveChallenge.leaderboards.round.entries[i];
                if (!guess) {
                    guess = {};
                }
                guess["gameId"] = gameId;
                guess["roundNumber"] = roundNumber;
                if (roundNumber > 5)
                    nonStandardGames.add(gameId);
                guess["playerName"] = entry.name;
                roundScores.push(guess);
            }
        }
        var roundScoresCopy = roundScores;
        roundScores = [];
        for (var score of roundScoresCopy) {
            if (!nonStandardGames.has(score["gameId"]))
                roundScores.push(score);
        }

        // deduplicate roundScores by gameId, roundNumber and playerName
        var uniqueRoundScores = [];
        var uniqueRoundScoresHashes = new Set();
        for (var score of roundScores) {
            let hash = `${score.gameId}-${score.roundNumber}-${score.playerName}`;
            if (!uniqueRoundScoresHashes.has(hash)) {
                uniqueRoundScoresHashes.add(hash);
                uniqueRoundScores.push(score);
            }
        }

        // calculate total score for each game and playerName, save result in gameScores
        var gameScores = [];
        for (var score of uniqueRoundScores) {
            var gameId = score.gameId;
            var gameOption = this.gameOptions[gameId];
            var playerName = score.playerName;
            if (!gameScores.find(s => s.gameId == gameId && s.playerName == playerName)) {
                gameScores.push({ gameId, playerName, "date": gameOption.date, totalScore: 0 });
            }
            var gameScore = gameScores.find(s => s.gameId == gameId && s.playerName == playerName);
            gameScore.totalScore += score.score;
        }
        gameScores = gameScores.filter((record) => !isNaN(record.totalScore));
        if (this.player && this.player != "All")
            gameScores = gameScores.filter((record) => record.playerName == this.player)

        // sort gameScores by totalScore descending
        gameScores = gameScores.sort((a, b) => b.totalScore - a.totalScore);
        gameScores = gameScores.slice(0, 5);

        // populate topScoreToday div
        for (var score of gameScores) {
            let li = document.createElement("li");
            li.innerText = `${score.playerName}: ${score.totalScore} (${score.date.toLocaleDateString()})`;
            scoreList.appendChild(li);
        }
    }

    populateTopScoreToday(player = null) {
        this.populateTopScore(true, player);
    }
}


async function populate() {
    const events = await getAllData();

    var stats = new Stats(events);
    stats.populateTopScore();
    stats.populateTopScoreToday();

    populateTable(events);

    document.getElementById('exportButton').addEventListener('click', function () {
        exportToJsonl(events);
    });

    document.getElementById('importButton').addEventListener('click', handleImport);

    document.getElementById("importFileInput").addEventListener("change", (_) => {
        document.getElementById('importButton').disabled = false;
    })

    document.getElementById("anyOptions").addEventListener("change", (e) => {
        let otherOptions = [
            "movingAllowed",
            "panningAllowed",
            "zoomingAllowed",
            "movingAllowedLabel",
            "panningAllowedLabel",
            "zoomingAllowedLabel"
        ]
        otherOptions.forEach((option) => {
            document.getElementById(option).style.display = (e.target.checked) ? 'none' : "inline-block";
        })
    })

    document.getElementById("anyRoundTime").addEventListener("change", (e) => {
        document.getElementById("roundTime").style.display = (e.target.checked) ? 'none' : "inline-block";
    })

    document.getElementById("anyRoundCount").addEventListener("change", (e) => {
        document.getElementById("roundCount").style.display = (e.target.checked) ? 'none' : "inline-block";
    })
}


document.addEventListener('DOMContentLoaded', populate);