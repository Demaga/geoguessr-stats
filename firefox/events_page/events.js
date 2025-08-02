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

async function getEvents() {
  try {
    await openDB();
    return new Promise((resolve, reject) => {
      let transaction = db.transaction(["Events"], "readonly");
      let store = transaction.objectStore("Events");
      let request = store.getAll();

      request.onsuccess = function (event) {
        let records = event.target.result;

        resolve(records);
      };

      request.onerror = function (event) {
        reject("Error getting all data");
      };
    });
  } catch (error) {
    console.error("Error in getEvents:", error);
  }
}

async function importData(file) {
  const content = await file.text();
  const events = content
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map(JSON.parse);

  try {
    await openDB();
    const transaction = db.transaction(["Events"], "readwrite");
    const store = transaction.objectStore("Events");

    const clearRequest = store.clear();

    await new Promise((resolve, reject) => {
      clearRequest.onsuccess = () => {
        console.log("Events store cleared successfully");
        resolve();
      };
      clearRequest.onerror = (event) => {
        console.error("Error clearing Events store:", event.target.error);
        reject("Error clearing Events store");
      };
    });

    for (const event of events) {
      await store.add(event);
    }

    await new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log("All events imported successfully");
        resolve();
      };
      transaction.onerror = (event) => {
        console.error("Error importing events:", event.target.error);
        reject("Error importing events");
      };
    });
  } catch (error) {
    console.error("Error importing data:", error);
    throw error;
  }
}

function removeOptions(selectElement) {
  var i,
    L = selectElement.options.length - 1;
  for (i = L; i >= 0; i--) {
    selectElement.remove(i);
  }
}

function setLoadingState(isLoading) {
  const loadingOverlayEl = document.getElementById("loading-overlay");
  const contentWrapperEl = document.getElementById("content-wrapper");

  if (isLoading) {
    contentWrapperEl.style.display = "none";
    loadingOverlayEl.style.display = "flex";
  }

  if (!isLoading) {
    loadingOverlayEl.style.display = "none";
    contentWrapperEl.style.display = "block";
  }
}

const toastElement = document.getElementById("customToast");
const toastMessageElement = document.getElementById("customToastMessage");
const toastCloseButton = document.getElementById("customToastCloseBtn");
let toastTimerId = null;
let toastCallback = null;

function finishToast() {
  toastElement.classList.remove("custom-toast--visible");
  if (toastTimerId) {
    clearTimeout(toastTimerId);
    toastTimerId = null;
  }
  if (toastCallback) {
    toastCallback();
    toastCallback = null; 
  }
}

function showToast(text, type = "success", callback) {
  if (toastTimerId) {
    clearTimeout(toastTimerId);
  }
  toastCallback = callback;
  toastMessageElement.textContent = text;
  toastElement.className = "custom-toast";
  toastElement.classList.add(`custom-toast--${type}`, "custom-toast--visible");
  const duration = type === "error" ? 5000 : 3000;
  toastTimerId = setTimeout(finishToast, duration);
  toastCloseButton.addEventListener("click", finishToast);
}

class Stats {
  constructor(events) {
    this.events = events;
    this.totalGamesCount = this.events.filter(
      (e) => e.code === "LiveChallengeFinished"
    ).length;
    this.filteredEvents = [];

    this.unit = "km";

    this.allGameScores = [];
    this.scoresPerPage = 10;
    this.currentPage = 1;

    this.tableCurrentPage = 1;
    this.tableItemsPerPage = 10;
    this.uniqueGameIds = [];

    this.timeFrame = "allTime";
    this.dateRange = [];
    this.map = "All";
    this.player = "All";
    this.roundCount = 5;
    this.roundTime = 90;
    this.movingAllowed = true;
    this.panningAllowed = true;
    this.zoomingAllowed = true;
    this.anyOptions = true;
    this.anyRoundCount = true;
    this.anyRoundTime = true;

    this.popularMaps = {
      world: "World",
      "diverse-world": "Diverse World",
      "urban-world": "Urban World",
      "famous-places": "Famous Places",

      europe: "Europe",
      africa: "Africa",
      asia: "Asia",
      oceania: "Oceania",
      ukraine: "Ukraine",
      "north-america": "North America",
      "south-america": "South America",
      "european-union": "European Union",

      us: "United States",
      uk: "United Kingdom",
      japan: "Japan",
      sweden: "Sweden",
      france: "France",
      germany: "Germany",
      canada: "Canada",
      australia: "Australia",
      brazil: "Brazil",
      spain: "Spain",
      italy: "Italy",

      "62a44b22040f04bd36e8a914": "A Community World",
      "5d73f83d82777cb5781464f2": "A Balanced World",
      "616015f16795c20001613e49": "An Educated World",
      "59662b185199be7d6438d132": "A Diverse World",
      "6029991c5048850001d572a9": "A Pinpointable World",
      "5cd30a0d17e6fc441ceda867": "An Extraordinary World",
      "6078c830e945e900015f4a64": "A Learning World",
      "6089bfcff6a0770001f645dd": "An Arbitrary World",
      "5b0a80f8596695b708122809": "An Improved World",
      "59e940ed39d855c868104b32": "GeoBettr World - Replayable",
      "65c86935d327035509fd616f": "A Rainbolt World",
      "5e81b3e32bd8911388d65a4c": "A No Move World",

      "5d0ce72c8b19a91fe05aa7a8": "Flags of the World",
      "61a1846aee665b00016680ce": "Fun with Flags!",
      "60de2a8a81b92c00015f29e1": "The 198 Capitals Of The World",
      "60de2a8a81b92c00010f29e1": "The 198 Capitals Of The World",
      "56e45886dc7cd6a164e861ac": "US Cities",
      "5bbb74ce2c01735208560cf6": "World Cities",
      "5d26eb1741d2a43c1cd4524b": "US State Capitols",
      "56f28536148a781b143b0c3b": "European stadiums",
      "5cfda2c9bc79e16dd866104d": "I Saw The Sign 2.0",
      "5754651a00a27f6f482a2a3d": "Where's that Mcdonald's?",
      "5b5a0286632c4e64ec41dd8c": "Restaurant interiors",
      "5f9b1d4a6a59940001a4f9ae": "Airport Runways",
      "5ed59e1f375e6a6a68a2d227": "All the Wetherspoons",
      "5fa381d0e27b4900014e0732":
        "Interesting Photospheres in Obscure Countries",
      "5d374dc141d2a43c1cd4527b": "GeoDetective",
      "5dbaf08ed0d2a478444d2e8e": "AI Generated World",
      "6284d140132039d9a7f1e265": "Urban Hell",
      "6737723f1207048de469c169": "A Diverse World",

      "5b0d907bfaa4cf3ce43bc6b1": "500 000 lieux en France métropolitaine !",
      "5eb5ea048734a02c543f2ae1": "La Diversité Française ",

      "57357d9f77abe957e8cfd15f": "Dumb test",
      "57357d9f77abe957e8cfd10f": "Dumb test",
    };

    this.addFilterEventListeners();
    this.addEventListeners();
    this.initDatepicker(); 
    this.update();
  }

  update() {
    this.gameOptions = this.getGameOptions();

    var maps = new Set();
    for (let game of Object.entries(this.gameOptions)) {
      maps.add(game[1].mapSlug);
    }
    this.addMapsSelectOptions(maps);

    this.players = this.getPlayers();
    this.addPlayersSelectOptions();

    this.populateTopScore();
    console.log("Updated");
  }

  getGameOptions() {
    var roundEvents = this.events.filter(
      (event) => event.code == "LiveChallengeLeaderboardUpdate"
    );
    var gameRoundsMap = {};
    for (var event of roundEvents) {
      if (!(event.gameId in gameRoundsMap)) gameRoundsMap[event.gameId] = 1;
      else gameRoundsMap[event.gameId] += 1;
    }

    const startTimes = new Map();
    this.events.forEach((e) => {
      if (e.code === "LiveChallengeStarted" && e.gameId && e.timestamp) {
        if (!startTimes.has(e.gameId)) {
          startTimes.set(e.gameId, e.timestamp);
        }
      }
    });

    var filteredEvents = this.events.filter(
      (event) => event.code == "LiveChallengeFinished"
    );
    var gameOptions = {};
    for (var event of filteredEvents) {
      const startTime = startTimes.get(event.gameId);

      event.liveChallenge.state.options["date"] = new Date(
        startTime || event.timestamp
      );
      if (event.gameId in gameRoundsMap)
        gameOptions[event.gameId] = event.liveChallenge.state.options;
    }
    console.log("Game options loaded", gameOptions);
    return gameOptions;
  }

  addFilterEventListeners() {
    let filters = [
      "roundCount",
      "roundTime",
      "movingAllowed",
      "panningAllowed",
      "zoomingAllowed",
      "anyOptions",
      "anyRoundCount",
      "anyRoundTime",
    ];
    filters.forEach((element) => {
      document.getElementById(element).addEventListener("change", (e) => {
        this[element] =
          e.target.value != "on" ? e.target.value : e.target.checked;
        this.populateTopScore();
      });
    });

    const timeFrameSelect = document.getElementById("timeFrame");
    const dateRangeFilter = document.getElementById("dateRangeFilter");

    timeFrameSelect.addEventListener("change", (e) => {
      this.timeFrame = e.target.value;
    
      if (this.timeFrame === "customRange") {
        dateRangeFilter.style.display = "block";
        
      } else {
        dateRangeFilter.style.display = 'none';
        this.populateTopScore();
      }
    })
  }

  addEventListeners() {
    let kmMilesSwitch = document.getElementById("kmMilesSwitch");
    let unit = localStorage.getItem("unit") || "km";
    this.unit = unit;
    kmMilesSwitch.innerText = unit === "km" ? "Switch to Miles" : "Switch to KM";
    kmMilesSwitch.addEventListener("click", () => {
      this.unit = this.unit === "km" ? "miles" : "km";
      kmMilesSwitch.innerText = this.unit === "km" ? "Switch to Miles" : "Switch to KM";
      localStorage.setItem("unit", this.unit);
      this.update();
    });

    document.getElementById("exportButton").addEventListener("click", (_) => {
      this.exportToJsonl();
    });
    document.getElementById("importButton").addEventListener("click", (_) => {
      document.getElementById("importFileInput").click();
      this.handleImport;
    });

    document
      .getElementById("importFileInput")
      .addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
          this.handleImport(file);
        }
      });

    document.getElementById("loadMoreButton").addEventListener("click", () => {
      this.currentPage++;
      this.displayScores();
    });

    document.getElementById("tablePrevButton").addEventListener("click", () => {
      if (this.tableCurrentPage > 1) {
        this.tableCurrentPage--;
        this.populateHistoryTable();
      }
    });

    document.getElementById("tableNextButton").addEventListener("click", () => {
      const totalPages = Math.ceil(
        this.uniqueGameIds.length / this.tableItemsPerPage
      );
      if (this.tableCurrentPage < totalPages) {
        this.tableCurrentPage++;
        this.populateHistoryTable();
      }
    });

    document.getElementById("anyOptions").addEventListener("change", (e) => {
      let otherOptions = [
        "movingAllowed",
        "panningAllowed",
        "zoomingAllowed",
        "movingAllowedLabel",
        "panningAllowedLabel",
        "zoomingAllowedLabel",
      ];
      otherOptions.forEach((option) => {
        document.getElementById(option).style.display = e.target.checked
          ? "none"
          : "inline-block";
      });
    });

    document.getElementById("anyRoundTime").addEventListener("change", (e) => {
      if (this.today) {
        filteredEvents = filteredEvents.filter((event) => {
          let date = new Date(event.timestamp);
          date.setHours(12, 0, 0, 0);
          let today_date = new Date();
          today_date.setHours(12, 0, 0, 0);
          return today_date.getTime() == date.getTime();
        });
      }
      document.getElementById("roundTime").style.display = e.target.checked
        ? "none"
        : "inline-block";
    });

    document.getElementById("anyRoundCount").addEventListener("change", (e) => {
      document.getElementById("roundCount").style.display = e.target.checked
        ? "none"
        : "inline-block";
    });
  }

  addMapsSelectOptions(maps) {
    const mapSelect = document.getElementById("mapSelect");
    removeOptions(mapSelect);
    mapSelect.options[0] = new Option("All", "All");

    for (let map of maps) {
      var option;
      if (map in this.popularMaps)
        option = new Option(this.popularMaps[map], map);
      else if (map == "world") option = new Option(map, map);
      else option = new Option(map, map);
      mapSelect.options[mapSelect.options.length] = option;
    }
    mapSelect.addEventListener("change", (e) => {
      this.map = e.target.value;
      this.populateTopScore();
    });
  }

  getPlayers() {
    var players = new Map();

    var filteredEvents = this.events.filter(
      (event) => event.code == "LiveChallengeLeaderboardUpdate"
    );

    for (var event of filteredEvents) {
      for (
        let i = 0;
        i < event.liveChallenge.leaderboards.round.guesses.length;
        i++
      ) {
        let entry = event.liveChallenge.leaderboards.round.entries[i];
        let player_name = entry.name;
        if (players.has(player_name)) {
          let old_val = players.get(player_name);
          players.set(player_name, old_val + 1);
        } else players.set(player_name, 1);
      }
    }

    var players = Array.from(players).map(([name, value]) => ({ name, value }));
    players = players.sort((a, b) => b.value - a.value);

    var result = [];

    players.forEach((player) => {
      result.push(player.name);
    });

    return result;
  }

  addPlayersSelectOptions() {
    var select = document.getElementById("playerSelect");
    removeOptions(select);
    select.options[0] = new Option("All", "All");
    for (let player of this.players)
      select.options[select.options.length] = new Option(player, player);
    select.addEventListener("change", (e) => {
      this.player = e.target.value;
      this.populateTopScore();
    });
  }

  populateTopScore() {
    var scoreList = document.getElementById("scoreList");

    this.currentPage = 1;
    this.tableCurrentPage = 1;

    scoreList.innerHTML = "";

    var filteredEvents = this.events.filter(
      (event) => event.code == "LiveChallengeLeaderboardUpdate"
    );
    filteredEvents = filteredEvents.filter(
      (event) => event.gameId in this.gameOptions
    );

    if (this.map != "All")
      filteredEvents = filteredEvents.filter(
        (event) => this.gameOptions[event.gameId].mapSlug == this.map
      );
    if (!this.anyRoundCount) {
      filteredEvents = filteredEvents.filter(
        (event) => this.gameOptions[event.gameId].roundCount == this.roundCount
      );
    }
    if (!this.anyOptions) {
      filteredEvents = filteredEvents.filter(
        (event) =>
          this.gameOptions[event.gameId].movementOptions.forbidMoving ==
          !this.movingAllowed
      );
      filteredEvents = filteredEvents.filter(
        (event) =>
          this.gameOptions[event.gameId].movementOptions.forbidRotating ==
          !this.panningAllowed
      );
      filteredEvents = filteredEvents.filter(
        (event) =>
          this.gameOptions[event.gameId].movementOptions.forbidZooming ==
          !this.zoomingAllowed
      );
    }
    if (!this.anyRoundTime) {
      filteredEvents = filteredEvents.filter(
        (event) => this.gameOptions[event.gameId].roundTime == this.roundTime
      );
    }

    if (this.timeFrame == "today") {
      filteredEvents = filteredEvents.filter((event) => {
        let date = new Date(event.timestamp);
        date.setHours(12, 0, 0, 0);
        let today_date = new Date();
        today_date.setHours(12, 0, 0, 0);
        return today_date.getTime() == date.getTime();
      });
    } else if (this.timeFrame === "customRange" && this.dateRange.length > 0) {
      const startDate = new Date(this.dateRange[0]);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(
        this.dateRange.length === 2 ? this.dateRange[1] : this.dateRange[0]
      );
      endDate.setHours(23, 59, 59, 999);

      filteredEvents = filteredEvents.filter((event) => {
        if (!event.timestamp) return false;
        const parsableTimestamp = event.timestamp.replace(/(\.\d{3})\d+/, "$1");
        const eventDate = new Date(parsableTimestamp);
        return (
          !isNaN(eventDate) && eventDate >= startDate && eventDate <= endDate
        );
      });
    }

    this.filteredEvents = filteredEvents;

    // extract all round scores
    var roundScores = [];
    var nonStandardGames = new Set();
    for (const event of filteredEvents) {
      const gameId = event.gameId;
      const roundNumber = event.liveChallenge.leaderboards.round.roundNumber;
      const guesses = event.liveChallenge.leaderboards.round.guesses;
      const entries = event.liveChallenge.leaderboards.round.entries;

      if (!guesses || !entries) continue;

      for (let i = 0; i < guesses.length; i++) {
        const guessData = guesses[i];
        const entryData = entries[i];
        if (!entryData || !entryData.name) continue;
        if (roundNumber > 5) {
          nonStandardGames.add(gameId);
        }
        const scoreRecord = {
          ...guessData,
          gameId: gameId,
          roundNumber: roundNumber,
          playerName: entryData.name,
        };
        roundScores.push(scoreRecord);
      }
    }
    var roundScoresCopy = roundScores;
    roundScores = [];
    for (var score of roundScoresCopy) {
      if (!nonStandardGames.has(score["gameId"])) roundScores.push(score);
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
      if (
        !gameScores.find(
          (s) => s.gameId == gameId && s.playerName == playerName
        )
      ) {
        gameScores.push({
          gameId,
          playerName,
          date: gameOption.date,
          totalScore: 0,
        });
      }
      var gameScore = gameScores.find(
        (s) => s.gameId == gameId && s.playerName == playerName
      );
      gameScore.totalScore += score.score;
    }
    gameScores = gameScores.filter((record) => !isNaN(record.totalScore));
    if (this.player && this.player != "All")
      gameScores = gameScores.filter(
        (record) => record.playerName == this.player
      );

    this.uniqueGameIds = [...new Set(gameScores.map((score) => score.gameId))];
    this.uniqueGameIds.sort((gameId_A, gameId_B) => {
      const dateA = this.gameOptions[gameId_A].date;
      const dateB = this.gameOptions[gameId_B].date;
      return dateB - dateA;
    });

    // sort gameScores by totalScore descending
    this.allGameScores = gameScores.sort((a, b) => b.totalScore - a.totalScore);

    this.displayScores();
    this.populateHistoryTable();
  }

  populateHistoryTable() {
    const tableBody = document.getElementById("history-table-body");
    const paginationControls = document.getElementById(
      "tablePaginationControls"
    );
    const prevBtn = document.getElementById("tablePrevButton");
    const nextBtn = document.getElementById("tableNextButton");
    const pageIndicator = document.getElementById("tablePageIndicator");

    tableBody.innerHTML = "";
    const totalPages = Math.ceil(
      this.uniqueGameIds.length / this.tableItemsPerPage
    );

    if (totalPages <= 1) {
      paginationControls.style.display = "none";
    } else {
      paginationControls.style.display = "flex";
    }

    const startIndex = (this.tableCurrentPage - 1) * this.tableItemsPerPage;
    const endIndex = startIndex + this.tableItemsPerPage;
    const gamesToShow = this.uniqueGameIds.slice(startIndex, endIndex);

    gamesToShow.forEach((gameId) => {
      const gameOptions = this.gameOptions[gameId];
      if (!gameOptions) return;

      const row = document.createElement("tr");

      // arrow
      const expandCell = document.createElement("td");
      expandCell.innerHTML = `<svg class="expand-arrow" width="25" height="25"><use href="../assets/icons/sprite.svg#icon-arrow"></use></svg>`;
      row.appendChild(expandCell);

      // date
      const dateCell = document.createElement("td");
      const dateWrapper = document.createElement("div"); 
      dateWrapper.className = "cell-content-wrapper"; 
      const fullDateString = gameOptions.date.toLocaleString("uk-UA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      dateWrapper.textContent = fullDateString; 
      dateWrapper.title = fullDateString;
      dateCell.appendChild(dateWrapper);
      row.appendChild(dateCell);

      // map name
      const mapCell = document.createElement("td");
      const mapWrapper = document.createElement("div");
      mapWrapper.className = "cell-content-wrapper";
      const mapName = this.popularMaps[gameOptions.mapSlug] || gameOptions.mapSlug;
      mapWrapper.textContent = mapName;
      mapWrapper.title = mapName;
      mapCell.appendChild(mapWrapper);
      row.appendChild(mapCell);

      // round time
      const timeCell = document.createElement("td");
      timeCell.textContent = `${gameOptions.roundTime} sec`;
      row.appendChild(timeCell);

      // move
      const moveCell = document.createElement("td");
      moveCell.textContent = gameOptions.movementOptions.forbidMoving
        ? "No Move"
        : "Move";
      row.appendChild(moveCell);

      // settings
      const settingsCell = document.createElement("td");
      settingsCell.classList.add("settings-cell");

      const panningAllowed = !gameOptions.movementOptions.forbidRotating;
      const zoomingAllowed = !gameOptions.movementOptions.forbidZooming;

      settingsCell.innerHTML = `
          <div class="tooltip-container">
            <svg class="icon-settings" width="18" height="18"><use href="../assets/icons/sprite.svg#icon-setting"></use></svg>
            <div class="tooltip-text">
              <p><strong>Panning:</strong> ${
                panningAllowed ? "Allowed" : "Disallowed"
              }</p>
              <p><strong>Zooming:</strong> ${
                zoomingAllowed ? "Allowed" : "Disallowed"
              }</p>
              <p><strong>Rounds:</strong> ${gameOptions.roundCount}</p>
            </div>
          </div>
        `;
      row.appendChild(settingsCell);

      row.addEventListener("click", () => this.toggleRoundDetails(row, gameId));
      row.style.cursor = "pointer";

      tableBody.appendChild(row);
    });

    pageIndicator.textContent = `${this.tableCurrentPage} / ${totalPages}`;
    prevBtn.disabled = this.tableCurrentPage === 1;
    nextBtn.disabled = this.tableCurrentPage === totalPages;
  }

  toggleRoundDetails(rowElement, gameId) {
    const isExpanded = rowElement.classList.contains("expanded");

    const allGameRows = rowElement.parentNode.querySelectorAll(
      "tr:not(.details-row)"
    );

    allGameRows.forEach((row) => {
      if (row !== rowElement && row.classList.contains("expanded")) {
        row.classList.remove("expanded");
        const detailsRow = row.nextElementSibling;
        if (detailsRow && detailsRow.classList.contains("details-row")) {
          detailsRow.remove();
        }
      }  
    });

    if (isExpanded) {
      rowElement.classList.remove("expanded");
      const detailsRow = rowElement.nextElementSibling;
      if (detailsRow && detailsRow.classList.contains("details-row")) {
        detailsRow.remove();
      }
      return;
    }

    rowElement.classList.add("expanded");
    const roundDetails = this.getRoundDetailsForGame(gameId);

    if (roundDetails.length === 0) {
      console.warn(`No details found for gameId: ${gameId}`);
      rowElement.classList.remove("expanded");
      return;
    }

    const detailsRow = document.createElement("tr");
    detailsRow.classList.add("details-row");
    const detailsCell = document.createElement("td");
    detailsCell.colSpan = 6;
    const detailsTable = this.createDetailsTableHTML(roundDetails);
    detailsCell.appendChild(detailsTable);
    detailsRow.appendChild(detailsCell);
    rowElement.insertAdjacentElement("afterend", detailsRow);
  }

  getRoundDetailsForGame(gameId) {
    const gameFinishedEvent = this.events.find(
      (e) => e.code === "LiveChallengeFinished" && e.gameId === gameId
    );
    if (!gameFinishedEvent) return [];

    const roundsData = gameFinishedEvent.liveChallenge.state.rounds;
    const roundCount = gameFinishedEvent.liveChallenge.state.options.roundCount;

    const leaderboardUpdates = this.events.filter(
      (e) => e.code === "LiveChallengeLeaderboardUpdate" && e.gameId === gameId
    );

    const details = [];
    for (let i = 0; i < roundCount; i++) {
      const roundNumber = i + 1;
      const round = roundsData[i];

      if (!round || !round.answer || !round.answer.coordinateAnswerPayload)
        continue;

      const correctLat = round.answer.coordinateAnswerPayload.coordinate.lat;
      const correctLng = round.answer.coordinateAnswerPayload.coordinate.lng;
      const countryCode =
        round.question.panoramaQuestionPayload.panorama.countryCode;

      const roundUpdate = leaderboardUpdates
        .slice()
        .reverse()
        .find(
          (u) => u.liveChallenge.leaderboards.round.roundNumber === roundNumber
        );

      let bestGuess = null;
      let fastestGuess = null;
      let playerGuesses = [];

      if (
        roundUpdate &&
        roundUpdate.liveChallenge.leaderboards.round.guesses.length > 0
      ) {
        const guesses = roundUpdate.liveChallenge.leaderboards.round.guesses;
        const entries = roundUpdate.liveChallenge.leaderboards.round.entries;

        for (let i = 0; i < guesses.length; i++) {
          const guessData = guesses[i];
          const entryData = entries[i];

          if (guessData && entryData) {
            playerGuesses.push({
              ...guessData,
              playerName: entryData.name,
            });
          }
        }

        if (playerGuesses.length > 0) {
          bestGuess = playerGuesses.reduce((prev, current) =>
            prev.distance < current.distance ? prev : current
          );
          fastestGuess = playerGuesses.reduce((prev, current) =>
            prev.time < current.time ? prev : current
          );
        }
      }

      details.push({
        roundNumber,
        correctPoint: { lat: correctLat, lng: correctLng },
        countryCode,
        bestGuess,
        fastestGuess,
        playerGuesses,
      });
    }
    return details;
  }

  createDetailsTableHTML(roundDetails) {
    const tableTemplate = document.getElementById("details-table-template");
    const rowTemplate = document.getElementById("details-row-template");

    const tableContainer = tableTemplate.content.cloneNode(true);
    const tableBody = tableContainer.querySelector("tbody");

    roundDetails.forEach((detail) => {
      const row = rowTemplate.content.cloneNode(true);
      const tr = row.querySelector("tr");

      const bestPlayer = detail.bestGuess ? detail.bestGuess.playerName : "N/A";
      let distance = "N/A";
      if (detail.bestGuess) {
        distance = this.unit === "km"
          ? (detail.bestGuess.distance / 1000).toFixed(2)
          : (detail.bestGuess.distance / 1609.34).toFixed(2);
      }
      const distanceStr = distance !== "N/A" ? `${distance} ${this.unit}` : "N/A";
      const score = detail.bestGuess ? detail.bestGuess.score : "N/A";

      const fastestPlayer = detail.fastestGuess
        ? detail.fastestGuess.playerName
        : "N/A";
      const time = detail.fastestGuess ? `${detail.fastestGuess.time}s` : "N/A";

      const countryFlagHTML = detail.countryCode
        ? `<img src="https://flagcdn.com/16x12/${detail.countryCode.toLowerCase()}.png" alt="${
            detail.countryCode
          }" class="country-flag">`
        : "N/A";

      tr.querySelector(".round-number").textContent = detail.roundNumber;
      tr.querySelector(".country").innerHTML = countryFlagHTML;
      tr.querySelector(
        ".correct-location a"
      ).href = `https://www.google.com/maps?q&layer=c&cbll=${detail.correctPoint.lat},${detail.correctPoint.lng}`;

      const bestGuessText = `${bestPlayer} (${distanceStr}, ${score} pts)`;
      const bestGuessCell = tr.querySelector(".best-guess");
      bestGuessCell.innerHTML = `<div class="cell-content-wrapper">${bestGuessText}</div>`;
      bestGuessCell.title = bestGuessText;

      const fastestGuessText = `${fastestPlayer} (${time})`;
      const fastestGuessCell = tr.querySelector(".fastest-guess");
      fastestGuessCell.innerHTML = `<div class="cell-content-wrapper">${fastestGuessText}</div>`;
      fastestGuessCell.title = fastestGuessText; 

      if (detail.playerGuesses.length > 0) {
        tr.style.cursor = "pointer";
        tr.addEventListener("click", () =>
          this.togglePlayerGuesses(tr, detail.playerGuesses, roundDetails)
        );
      } else {
        tr.querySelector(".expand-arrow").style.visibility = "hidden";
      }

      tableBody.appendChild(tr);
    });

    return tableContainer;
  }

  togglePlayerGuesses(rowElement, playerGuesses, roundDetails) {
    const isExpanded = rowElement.classList.contains("expanded-deeper");

    if (isExpanded) {
      rowElement.classList.remove("expanded-deeper");
      const detailsRow = rowElement.nextElementSibling;
      if (
        detailsRow &&
        detailsRow.classList.contains("player-guesses-details-row")
      ) {
        detailsRow.remove();
      }
      return;
    }

    rowElement.classList.add("expanded-deeper");
    const detailsTable = this.createPlayerGuessesTableHTML(
      playerGuesses,
      roundDetails
    );

    const detailsRow = document.createElement("tr");
    detailsRow.classList.add("player-guesses-details-row");
    const detailsCell = document.createElement("td");
    detailsCell.colSpan = 6;
    detailsCell.appendChild(detailsTable);
    detailsRow.appendChild(detailsCell);
    rowElement.insertAdjacentElement("afterend", detailsRow);
  }

  createPlayerGuessesTableHTML(playerGuesses, roundDetails) {
    const tableTemplate = document.getElementById(
      "player-guesses-table-template"
    );
    const rowTemplate = document.getElementById("player-guess-row-template");

    const tableContainer = tableTemplate.content.cloneNode(true);
    const tableBody = tableContainer.querySelector("tbody");

    playerGuesses.sort((a, b) => b.score - a.score);

    playerGuesses.forEach((guess) => {
      const row = rowTemplate.content.cloneNode(true);
      const tr = row.querySelector("tr");

      const guessLink = tr.querySelector(".guess-location a");
      guessLink.href = `https://www.google.com/maps?q=${guess.lat},${guess.lng}`;
      guessLink.textContent = "View on Map";
      const playerNameCell = tr.querySelector(".player-name");
      playerNameCell.innerHTML = `<div class="cell-content-wrapper">${guess.playerName}</div>`;
      playerNameCell.title = guess.playerName; 
      tr.querySelector(".guess-score").textContent = guess.score;
      let distanceStr = "N/A";
      if (this.unit === "km") {
        let distance = (guess.distance / 1000).toFixed(2);
        distanceStr = `${distance} km`;
      } else {
        let distance = (guess.distance / 1609.34).toFixed(2);
        distanceStr = `${distance} miles`;
      }
      tr.querySelector(".guess-distance").textContent = distanceStr;
      tr.querySelector(".guess-time").textContent = `${guess.time}s`;

      tableBody.appendChild(tr);
    });

    return tableContainer;
  }

  displayScores() {
    const scoreList = document.getElementById("scoreList");
    const loadMoreButton = document.getElementById("loadMoreButton");
    const scoreContainer = document.getElementById("scoreListContainer");
    const noDataMessage = document.getElementById("noDataMessage");
    const tableSection = document.getElementById("section-history-table");

    if (this.allGameScores.length === 0) {
      noDataMessage.style.display = "block";
      scoreContainer.style.display = "none";
      loadMoreButton.style.display = "none";
      tableSection.style.display = "none";
      return;
    }

    noDataMessage.style.display = "none";
    scoreContainer.style.display = "block";
    tableSection.style.display = "block";

    const startIndex = (this.currentPage - 1) * this.scoresPerPage;
    const endIndex = startIndex + this.scoresPerPage;

    const scoresToShow = this.allGameScores.slice(startIndex, endIndex);

    let firstNewElement = null;

    scoresToShow.forEach((score, index) => {
      const li = document.createElement("li");
        const dateString = score.date.toLocaleDateString('uk-UA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
      li.textContent = `${score.playerName}: ${score.totalScore} (${dateString})`;
      scoreList.appendChild(li);

      if (index === 0) {
        firstNewElement = li;
      }
    });

    if (this.currentPage > 1 && firstNewElement) {
      const newElementOffset =
        firstNewElement.offsetTop - scoreContainer.offsetTop;

      scoreContainer.scrollTo({
        top: newElementOffset,
        behavior: "smooth",
      });
    }

    if (endIndex < this.allGameScores.length) {
      loadMoreButton.style.display = "block";
    } else {
      loadMoreButton.style.display = "none";
    }
  }

  handleImport(file) {
    if (!file) {
      return;
    }

    setLoadingState(true);

    importData(file)
      .then(() => {
        showToast("Data imported successfully! Reloading...", "success", () =>
          location.reload()
        );
      })
      .catch((error) => {
        setLoadingState(false);
        showToast("Import failed. Check the console for details.", "error");
        console.error("Import error:", error);
      });
  }

  exportToJsonl() {
    let leaderboardEvents = this.filteredEvents;

    if (this.player && this.player != "All") {
      leaderboardEvents = leaderboardEvents.filter((event) => {
        return event.liveChallenge.leaderboards.round.entries.some(
          (entry) => entry.name === this.player
        );
      });
    }

    const finalGameIds = new Set(
      leaderboardEvents.map((event) => event.gameId)
    );

    if (finalGameIds.size === 0) {
      showToast("No data to export for the selected filters.", "error");
      return;
    }

    const gameToPartyMap = new Map();
    for (const event of this.events) {
      if (event.gameId && event.topic && event.topic.startsWith("partyv2:")) {
        const partyId = event.topic.split(":")[1];
        if (partyId) {
          gameToPartyMap.set(event.gameId, partyId);
        }
      } else if (event.code === "PartyGameStarted" && event.payload) {
        try {
          const payloadData = JSON.parse(event.payload);
          if (payloadData.lobbyId && payloadData.partyId) {
            gameToPartyMap.set(payloadData.lobbyId, payloadData.partyId);
          }
        } catch (e) {}
      }
    }

    const finalPartyIds = new Set();
    for (const gameId of finalGameIds) {
      if (gameToPartyMap.has(gameId)) {
        finalPartyIds.add(gameToPartyMap.get(gameId));
      }
    }

    const eventsToExport = this.events.filter((event) => {
      if (finalGameIds.has(event.gameId)) {
        return true;
      }

      if (event.topic && event.topic.startsWith("partyv2:")) {
        const partyId = event.topic.split(":")[1];
        if (finalPartyIds.has(partyId)) {
          return true;
        }
      }

      return false;
    });

    const jsonlContent = eventsToExport
      .map((event) => JSON.stringify(event))
      .join("\n");
    const blob = new Blob([jsonlContent], { type: "application/x-jsonlines" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "geoguessr_events.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  initDatepicker() {
    flatpickr("#dateRangePicker", {
      mode: "range",
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d.m.Y",
      maxDate: "today",
      locale: {
        rangeSeparator: " - ", 
      },
      onClose: (selectedDates) => {
        if (selectedDates.length > 0) {
          this.dateRange = selectedDates;
          this.populateTopScore();
        }
      },
    });
  }
}

let statsInstance = null;

async function populate() {
  setLoadingState(true);
  try {
    const events = await getEvents();
    statsInstance = new Stats(events);
  } catch (error) {
    console.error("Error populating stats:", error);
    setLoadingState(false);
  } finally {
    setLoadingState(false);
  }
}

browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (!statsInstance) {
    console.log("Stats instance not ready yet, skipping message.");
    return;
  }
  if (message.type === "newGameFinished") {
    const newEvents = await getEvents();
    const newGamesCount = newEvents.filter(
      (e) => e.code === "LiveChallengeFinished"
    ).length;

    if (newGamesCount > statsInstance.totalGamesCount) {
      console.log("New game data found. Updating UI...");
      statsInstance.events = newEvents;
      statsInstance.totalGamesCount = newGamesCount;
      statsInstance.update();
    } else {
      console.log("No new game data. Skipping UI update.");
    }
  }
});

document.addEventListener("DOMContentLoaded", populate);