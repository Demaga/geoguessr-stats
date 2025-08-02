let db;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }
    const dbRequest = indexedDB.open("GeoGuessrStats", 1);

    dbRequest.onupgradeneeded = function (event) {
      db = event.target.result;
      if (!db.objectStoreNames.contains("Events")) {
        db.createObjectStore("Events", { keyPath: "_id", autoIncrement: true });
      }
    };

    dbRequest.onsuccess = function (event) {
      db = event.target.result;
      resolve(db);
    };

    dbRequest.onerror = function (event) {
      reject("Database error: " + event.target.error);
    };
  });
}

async function getEvents() {
  try {
    const currentDb = await openDB();
    return new Promise((resolve, reject) => {
      if (!currentDb.objectStoreNames.contains("Events")) {
        console.warn("'Events' object store not found.");
        resolve([]);
        return;
      }
      let transaction = currentDb.transaction(["Events"], "readonly");
      let store = transaction.objectStore("Events");
      let request = store.getAll();

      request.onsuccess = function (event) {
        let records = event.target.result;
        resolve(records || []);
      };

      request.onerror = function (event) {
        console.error("Error getting all data:", event.target.error);
        reject("Error getting all data: " + event.target.error);
      };
    });
  } catch (error) {
    console.error("Error in getEvents:", error.message);
    throw error;
  }
}

//get the current player name from the latest PartyMemberListUpdated event
async function getCurrentPlayerName(events) {
  const partyEvent = events.findLast(
    (event) => event.code === "PartyMemberListUpdated"
  );

  if (!partyEvent) return null;

  let playerData;
  try {
    playerData = JSON.parse(partyEvent.payload);
  } catch (e) {
    console.error("getCurrentPlayerName:", e.message);
    return null;
  }

  try {
    const data = await browser.storage.local.get("currentPlayerId");
    const storedPlayerId = data.currentPlayerId;

    if (storedPlayerId) {
      const foundMember = playerData.members.find(
        (member) => member.userId === storedPlayerId
      );
      return foundMember?.nick || null;
    }
    return null;
  } catch (error) {
    console.error(
      "getCurrentPlayerName: Error during storage access for currentPlayerId:",
      error
    );
    return null;
  }
}

function formatDistance(meters) {
  if (
    meters === null ||
    meters === undefined ||
    !isFinite(meters) ||
    meters < 0 ||
    meters === Infinity
  ) {
    return "-";
  }

  const roundedMetersTotal = Math.round(meters);

  if (roundedMetersTotal < 1000) {
    return `${roundedMetersTotal} m`;
  } else {
    const kilometers = Math.floor(roundedMetersTotal / 1000);
    const remainingMeters = roundedMetersTotal % 1000;

    let result = `${kilometers}km`;

    if (remainingMeters > 0) {
      result += ` ${remainingMeters}m`;
    }
    return result;
  }
}

function formatDurationMs(ms) {
  if (ms === null || ms === undefined || !isFinite(ms) || ms <= 0) {
    return "-";
  }

  const totalSeconds = Math.floor(ms / 1000);

  if (totalSeconds < 60) {
    return "<1m";
  }

  const totalMinutes = Math.floor(totalSeconds / 60);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let result = "";

  if (hours > 0) {
    result += `${hours}hr`;
  }

  if (minutes > 0) {
    if (result.length > 0) {
      result += " ";
    }
    result += `${minutes}m`;
  }

  return result;
}

const popularMaps = {
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
  "5fa381d0e27b4900014e0732": "Interesting Photospheres in Obscure Countries",
  "5d374dc141d2a43c1cd4527b": "GeoDetective",
  "5dbaf08ed0d2a478444d2e8e": "AI Generated World",
  "6284d140132039d9a7f1e265": "Urban Hell",
  "6737723f1207048de469c169": "A Diverse World",

  "5b0d907bfaa4cf3ce43bc6b1": "500 000 lieux en France métropolitaine !",
  "5eb5ea048734a02c543f2ae1": "La Diversité Française ",

  "57357d9f77abe957e8cfd15f": "Dumb test",
  "57357d9f77abe957e8cfd10f": "Dumb test",
};

function getMapName(event) {
  if (!event?.liveChallenge?.state?.options) return "Unknown Map";
  const mapSlug = event.liveChallenge.state.options.mapSlug;
  const mapName = event.liveChallenge.state?.mapName;

  let slug;
  if (typeof mapSlug === "string" && mapSlug.trim() !== "") {
    slug = mapSlug;
  } else if (typeof mapName === "string" && mapName.trim() !== "") {
    slug = mapName;
  } else {
    slug = "";
  }

  const displayName = popularMaps[slug];
  if (displayName) {
    return displayName;
  }

  if (typeof slug === "string" && slug.trim() !== "") {
    return slug;
  }

  return "Unknown Map";
}

function displayGlobalErrorUI(
  errorMessageHTML = "Something went wrong. <br/>Please try again later."
) {
  const contentWrapperId = "content-wrapper";
  const noDataContainerId = "no-data";
  const noDataTextSelector = ".no-data-text";
  const errorTextSelector = ".error-text";

  const contentWrapper = document.getElementById(contentWrapperId);
  const noDataContainer = document.getElementById(noDataContainerId);

  if (contentWrapper) {
    contentWrapper.style.display = "none";
  }

  if (noDataContainer) {
    noDataContainer.style.display = "flex";
    const noDataTextEl = noDataContainer.querySelector(noDataTextSelector);
    noDataTextEl.style.display = "none";
    const errorTextEl = noDataContainer.querySelector(errorTextSelector);
    errorTextEl.style.display = "block";
    if (errorTextEl) {
      errorTextEl.innerHTML = errorMessageHTML;
    }
  }
}

function setLoadingState(isLoading) {
  const loadingOverlayEl = document.getElementById("loading-overlay");
  const contentWrapperEl = document.getElementById("content-wrapper");
  const noDataContainerEl = document.getElementById("no-data");

  if (isLoading) {
    loadingOverlayEl.style.display = "flex";
    contentWrapperEl.style.display = "none";
    noDataContainerEl.style.display = "none";
  }

  if (!isLoading) {
    loadingOverlayEl.style.display = "none";
  }
}

class PopupApp {
  constructor(initialEvents, currentPlayerNick) {
    this.events = initialEvents || [];
    this.timeFrame = "today";
    this.currentPlayerNick = currentPlayerNick || null;

    this.dom = {
      contentWrapper: document.getElementById("content-wrapper"),
      noDataContainer: document.getElementById("no-data"),
      todayLink: document.getElementById("today-link"),
      allTimeLink: document.getElementById("all-time-link"),
      totalGamesEl: document.getElementById("total-games"),
      bestScoreEl: document.getElementById("best-score"),
      totalTimeEl: document.getElementById("total-time"),
      winCountEl: document.getElementById("win-count"),
      winStreakEl: document.getElementById("win-streak"),
      fireIconEl: document.getElementById("fire-icon"),
      lastMapNameEl: document.getElementById("last-map-name"),
      lastMapHeaderEl: document.getElementById("last-map-header"),
      lastMapTableBodyEl: document.getElementById("last-map-table-body"),
    };

    for (const key in this.dom) {
      if (!this.dom[key]) {
        console.error(
          `PopupApp: Element '${key}' not found! Check HTML structure.`
        );
      }
    }

    this.addEventListeners();
    this.update();
  }

  addEventListeners() {
    if (this.dom.todayLink) {
      this.dom.todayLink.addEventListener("click", (e) => {
        e.preventDefault();
        if (this.timeFrame !== "today") {
          this.timeFrame = "today";
          this.update();
        }
      });
    }
    if (this.dom.allTimeLink) {
      this.dom.allTimeLink.addEventListener("click", (e) => {
        e.preventDefault();
        if (this.timeFrame !== "allTime") {
          this.timeFrame = "allTime";
          this.update();
        }
      });
    }
  }

  update() {
    try {
      const statsData = this.calculate();
      this.statsRenderer(statsData);
    } catch (error) {
      console.error("PopupApp: Error during stats update:", error);
      displayGlobalErrorUI(
        "Error loading stats. <br/> Please try again later."
      );
    }
  }

  //render methods
  statsRenderer(statsData) {
    this.populateGeneralStats(statsData);
    this.populateLastGame(statsData);
    this.updateActiveLink();
    this.showNoData(statsData.totalGames === 0);
  }

  updateActiveLink() {
    if (this.dom.todayLink) {
      this.dom.todayLink.classList.toggle("active", this.timeFrame === "today");
    }
    if (this.dom.allTimeLink) {
      this.dom.allTimeLink.classList.toggle(
        "active",
        this.timeFrame === "allTime"
      );
    }
  }

  showNoData(show = true) {
    this.dom.contentWrapper.style.display = show ? "none" : "block";
    this.dom.noDataContainer.style.display = show ? "flex" : "none";
  }

  populateGeneralStats(stats) {
    this.dom.totalGamesEl.textContent = stats.totalGames ?? "0";
    this.dom.bestScoreEl.textContent = stats.bestScore ?? "-";
    this.dom.totalTimeEl.textContent = stats.totalTime ?? "-";
    this.dom.winCountEl.textContent = stats.wins ?? "0";
    this.dom.winStreakEl.textContent = stats.winStreak ?? "0";

    const iconName = stats.winStreak > 0 ? "fire.svg" : "fire-gray.svg";
    this.dom.fireIconEl.src = `../assets/icons/${iconName}`;
  }

  populateLastGame(stats) {
    this.dom.lastMapNameEl.textContent =
      stats.actualLastMapName || "No name map";
    this.dom.lastMapHeaderEl.innerHTML = "";
    this.dom.lastMapTableBodyEl.innerHTML = "";

    const lastGames = stats.lastGamesOnMap || [];

    let headers = [];
    if (this.timeFrame === "today") {
      headers = ["Time", "Result", "Best Guess"];
    } else {
      headers = ["Date", "Result", "Best Guess"];
    }

    headers.forEach((headerText) => {
      const th = document.createElement("th");
      th.textContent = headerText;
      this.dom.lastMapHeaderEl.appendChild(th);
    });

    lastGames.forEach((game) => {
      const tr = document.createElement("tr");
      const formattedBestGuess = formatDistance(game.bestGuessDistance);
      let rowData = [];

      if (this.timeFrame === "today") {
        rowData = [game.time, game.result, formattedBestGuess];
      } else {
        rowData = [game.date, game.result, formattedBestGuess];
      }

      rowData.forEach((dataText) => {
        const td = document.createElement("td");
        td.textContent = dataText;
        tr.appendChild(td);
      });
      this.dom.lastMapTableBodyEl.appendChild(tr);
    });
  }

  //calculate methods
  calculate() {
    if (this.events.length === 0 || !this.currentPlayerNick) {
      return {
        totalGames: 0,
        bestScore: "-",
        totalTime: "-",
        wins: 0,
        losses: 0,
        winStreak: 0,
        lastGamesOnMap: [],
        actualLastMapName: "-",
      };
    }

    const currentPlayerName = this.currentPlayerNick;
    const periodEvents = this.filterEventsByPeriod(this.events, this.timeFrame);

    //inital data
    const {
      gameStartTimes,
      gameFinishedTime,
      lastGame,
      gameOptionsMap,
      startedGamesEvents,
    } = this.initialGameData(periodEvents);

    // filter events for leaderboard updates if the game is finished
    const leaderboardEvents = periodEvents.filter(
      (e) =>
        e.code === "LiveChallengeLeaderboardUpdate" &&
        gameFinishedTime.has(e.gameId)
    );
    const finishedGameIds = new Set(leaderboardEvents.map((e) => e.gameId));

    //bestScore
    const { gameScoresData, playerBestScore } = this.leaderboardStats(
      leaderboardEvents,
      currentPlayerName
    );

    //totalGames, totalTime, wins, losses, winStreak
    const {
      playerWins,
      playerLosses,
      playerTotalGames,
      playerTotalTimeMs,
      playerWinStreak,
    } = this.playerGameActivity(
      finishedGameIds,
      gameScoresData,
      gameStartTimes,
      gameFinishedTime,
      currentPlayerName
    );

    //lastGamesOnMap, actualLastMapName
    const { lastGamesOnMapDetails, actualLastMapName } = this.lastMapDetails(
      lastGame,
      gameOptionsMap,
      gameStartTimes,
      startedGamesEvents,
      gameScoresData,
      currentPlayerName
    );

    const formattedTotalTimePlayer = formatDurationMs(playerTotalTimeMs);

    console.log("calculate: lastGamesOnMapDetails", lastGamesOnMapDetails);
    console.log("calculate: gameScoresData", gameScoresData);

    return {
      totalGames: playerTotalGames,
      bestScore: playerBestScore,
      totalTime: formattedTotalTimePlayer,
      wins: playerWins,
      losses: playerLosses,
      winStreak: playerWinStreak,
      lastGamesOnMap: lastGamesOnMapDetails,
      actualLastMapName,
    };
  }

  filterEventsByPeriod(allEvents, timeFrame) {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();

    return (allEvents || []).filter((event) => {
      if (!event?.timestamp || !event.gameId) return false;
      const eventTime = new Date(event.timestamp).getTime();
      if (isNaN(eventTime)) return false;

      if (timeFrame === "today") {
        return eventTime >= todayStart;
      }
      return true;
    });
  }

  initialGameData(periodEvents) {
    const gameStartTimes = new Map();
    const gameOptionsMap = new Map();
    const gameFinishedTime = new Map();
    let lastGame = null;
    let startedGamesEvents = [];

    periodEvents.forEach((event) => {
      if (
        event.code === "LiveChallengeStarted" &&
        event.gameId &&
        event.timestamp
      ) {
        //gameStartTimes
        if (!gameStartTimes.has(event.gameId)) {
          const startTime = new Date(event.timestamp).getTime();
          if (!isNaN(startTime)) {
            gameStartTimes.set(event.gameId, startTime);
          }
        }
      }

      if (
        event.code === "LiveChallengeFinished" &&
        event.gameId &&
        event.timestamp
      ) {
        const gameId = event.gameId;
        const finishTime = new Date(event.timestamp).getTime();

        //gameFinishedTime
        if (!isNaN(finishTime)) {
          gameFinishedTime.set(gameId, finishTime);

          //lastGame
          if (
            !lastGame ||
            finishTime > new Date(lastGame.timestamp).getTime()
          ) {
            lastGame = event;
          }
        }
      }
    });

    //gameOptionsMap
    startedGamesEvents = periodEvents.filter(
      (e) => e.code === "LiveChallengeStarted" && gameFinishedTime.has(e.gameId)
    );

    startedGamesEvents.forEach((event_inner) => {
      const gameId = event_inner.gameId;
      const state = event_inner.liveChallenge?.state;

      if (state) {
        gameOptionsMap.set(gameId, state);
      }
    });

    return {
      gameStartTimes,
      gameFinishedTime,
      lastGame,
      gameOptionsMap,
      startedGamesEvents,
    };
  }

  leaderboardStats(leaderboardEvents, currentPlayerName) {
    const gameScoresData = new Map();
    let playerBestScore = 0;

    leaderboardEvents.forEach((event) => {
      const gameId = event.gameId;
      const gameEntries = event.liveChallenge?.leaderboards?.game?.entries;
      const roundEntries = event.liveChallenge?.leaderboards?.round?.entries;
      const roundGuesses = event.liveChallenge?.leaderboards?.round?.guesses;

      if (!gameScoresData.has(gameId)) {
        gameScoresData.set(gameId, new Map());
      }
      const currentGameScores = gameScoresData.get(gameId);

      //total score
      if (gameEntries) {
        gameEntries.forEach((player) => {
          const playerName = player.name;
          let finalScore;
          if (player.score === undefined) {
            finalScore = 0;
          }
          finalScore = player.score ?? 0;

          if (!currentGameScores.has(playerName)) {
            currentGameScores.set(playerName, {
              totalScore: 0,
              bestGuessDistance: Infinity,
            });
          }

          const playerGameData = currentGameScores.get(playerName);
          playerGameData.totalScore = finalScore;

          if (playerName === currentPlayerName) {
            playerBestScore = Math.max(playerBestScore, finalScore);

            if (!playerGameData.hasOwnProperty("result")) {
              playerGameData.result = "-";
            }
          }
        });
      }

      //buest distance
      if (
        roundEntries &&
        roundGuesses &&
        roundEntries.length === roundGuesses.length
      ) {
        for (let i = 0; i < roundEntries.length; i++) {
          const player = roundEntries[i];
          const playerName = player.name;
          const guess = roundGuesses[i];

          if (!currentGameScores.has(playerName)) {
            currentGameScores.set(playerName, {
              totalScore: 0,
              bestGuessDistance: Infinity,
            });
          }
          const playerGameData = currentGameScores.get(playerName);

          if (
            guess &&
            typeof guess.distance === "number" &&
            guess.distance >= 0
          ) {
            playerGameData.bestGuessDistance = Math.min(
              playerGameData.bestGuessDistance,
              guess.distance
            );
          }
        }
      }
    });

    return {
      gameScoresData,
      playerBestScore,
    };
  }

  playerGameActivity(
    finishedGameIds,
    gameScoresData,
    gameStartTimes,
    gameFinishedTime,
    currentPlayerName
  ) {
    let playerWins = 0;
    let playerLosses = 0;
    let playerTotalGames = 0;
    let playerTotalTimeMs = 0;
    let playerWinStreak = 0;

    const playerGameIds = Array.from(finishedGameIds).filter(
      (gameId) =>
        gameScoresData.has(gameId) &&
        gameScoresData.get(gameId).has(currentPlayerName)
    );

    playerGameIds.sort((a, b) => {
      const timeA = gameFinishedTime.get(a) || 0;
      const timeB = gameFinishedTime.get(b) || 0;
      return timeB - timeA;
    });

    let currentStreakActive = true;

    for (const gameId of playerGameIds) {
      playerTotalGames++;

      const gameAllScores = gameScoresData.get(gameId);
      const playerScoreData = gameAllScores.get(currentPlayerName);

      const startTime = gameStartTimes.get(gameId);
      const finishTime = gameFinishedTime.get(gameId);
      if (startTime && finishTime && !isNaN(startTime) && !isNaN(finishTime)) {
        const duration = finishTime - startTime;
        if (duration > 0) {
          playerTotalTimeMs += duration;
        }
      }

      if (playerScoreData) {
        const playerScore = playerScoreData.totalScore;
        let isPlayerWinnerInThisGame = true;

        for (const [otherPlayer, otherPlayerData] of gameAllScores.entries()) {
          if (otherPlayer !== currentPlayerName) {
            if (otherPlayerData.totalScore > playerScore) {
              isPlayerWinnerInThisGame = false;
              break;
            }
          }
        }

        if (isPlayerWinnerInThisGame) {
          playerWins++;
          playerScoreData.result = "Win";
          if (currentStreakActive) {
            playerWinStreak++;
          }
        } else {
          playerLosses++;
          playerScoreData.result = "Loss";
          currentStreakActive = false;
        }
      } else {
        currentStreakActive = false;
      }
    }

    return {
      playerWins,
      playerLosses,
      playerTotalGames,
      playerTotalTimeMs,
      playerWinStreak,
    };
  }

  lastMapDetails(
    lastGame,
    gameOptionsMap,
    gameStartTimes,
    startedGamesEvents,
    gameScoresData,
    currentPlayerName
  ) {
    let lastGamesOnMapDetails = [];
    let actualLastMapName = "";

    if (!lastGame) {
      return { lastGamesOnMapDetails, actualLastMapName };
    }

    const lastGameOptions = gameOptionsMap.get(lastGame.gameId);
    if (!lastGameOptions) {
      return { lastGamesOnMapDetails, actualLastMapName };
    }
  
    const lastMapSlug = lastGameOptions.options?.mapSlug;
    const lastMapName = lastGameOptions.mapName;
  
    if (lastMapSlug || lastMapName) {
      const uniqueGameIdsOnThisMap = [...new Set(startedGamesEvents
        .filter(event => {
          const gameOpts = gameOptionsMap.get(event.gameId);
          if (!gameOpts) return false;
        
          const currentMapSlug = gameOpts.options?.mapSlug;
          const currentMapName = gameOpts.mapName;
          const slugMatch = lastMapSlug && currentMapSlug === lastMapSlug;
          const nameMatch = lastMapName && currentMapName === lastMapName;
        
          return slugMatch || nameMatch;
        })
        .map(event => event.gameId)
      )];
        uniqueGameIdsOnThisMap.sort((a, b) => {
        const timeA = gameStartTimes.get(a) || 0;
        const timeB = gameStartTimes.get(b) || 0;
        return timeB - timeA;
      });
      if (uniqueGameIdsOnThisMap.length > 0) {
        const latestGameId = uniqueGameIdsOnThisMap[0];
        const latestGameEvent = startedGamesEvents.find(e => e.gameId === latestGameId);
        if(latestGameEvent) {
            actualLastMapName = getMapName(latestGameEvent);
        }
      }
      for (const gameId of uniqueGameIdsOnThisMap.slice(0, 3)) {
        const gameTimestamp = new Date(gameStartTimes.get(gameId))
        const gameDataForPlayer = gameScoresData.get(gameId)?.get(currentPlayerName);

        let playerScore = 0;
        let playerBestGuessInThisGame = Infinity;
        let resultText = "-";

        if (gameDataForPlayer) {
          playerScore = gameDataForPlayer.totalScore;
          playerBestGuessInThisGame = gameDataForPlayer.bestGuessDistance;
          resultText = gameDataForPlayer.result;
        }

        lastGamesOnMapDetails.push({
          date: gameTimestamp.toLocaleDateString('uk-UA', {
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric'
        }),
        time: gameTimestamp.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        result: resultText,
        score: playerScore,
        bestGuessDistance: playerBestGuessInThisGame,
      });
      }
    }
    return { lastGamesOnMapDetails, actualLastMapName };
  }
}

async function initializePopup() {
  setLoadingState(true);
  try {
    const events = await getEvents();
    const playerNick = await getCurrentPlayerName(events);
    new PopupApp(events, playerNick);
  } catch (error) {
    console.error(
      "initializePopup: Failed to initialize popup due to an error:",
      error
    );
    setLoadingState(false);
    displayGlobalErrorUI();
  } finally {
    setLoadingState(false);
  }
}

document.addEventListener("DOMContentLoaded", initializePopup);
