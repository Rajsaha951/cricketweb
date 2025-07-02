const API_KEY ='b630c165-d033-4f13-b79c-ed0d867bcefb';
const BASE_URL = 'https://api.cricapi.com/v1';
const liveContainer = document.querySelector("#liveMatches .match-container");
const upcomingContainer = document.querySelector("#upcomingMatches .match-container");

// Fetch both current and upcoming matches
async function fetchMatches() {
  try {
    showLoading();
    
    // Make parallel API requests for better performance
    const [currentMatches, upcomingMatches] = await Promise.all([
      fetchCurrentMatches(),
      fetchUpcomingMatches()
    ]);
    
    renderMatches(currentMatches, upcomingMatches);
  } catch (error) {
    showError(error);
  }
}

// Fetch current matches (live and recent)
async function fetchCurrentMatches() {
  try {
    const response = await axios.get(`${BASE_URL}/currentMatches?apikey=${API_KEY}&offset=0`, {
      params: {
        apikey: API_KEY,
        offset: 0
      }
    });
    
    if (response.data.status !== "success") {
      throw new Error("Current matches API request failed");
    }
    
    return response.data.data || [];
  } catch (error) {
    console.error("Error fetching current matches:", error);
    return [];
  }
}

// Fetch upcoming matches
async function fetchUpcomingMatches() {
  try {
    const response = await axios.get(`${BASE_URL}/matches?apikey=${API_KEY}&offset=0`, {
      params: {
        apikey: API_KEY,
        offset: 0
      }
    });
    
    if (response.data.status !== "success") {
      throw new Error("Upcoming matches API request failed");
    }
    
    return response.data.data || [];
  } catch (error) {
    console.error("Error fetching upcoming matches:", error);
    return [];
  }
}

function renderMatches(currentMatches, upcomingMatches) {
  // Clear containers
  liveContainer.innerHTML = "";
  upcomingContainer.innerHTML = "";

  // Render current matches
  if (currentMatches && currentMatches.length > 0) {
    const liveMatches = currentMatches.filter(match => match.matchStarted && !match.matchEnded);
    const recentMatches = currentMatches.filter(match => !match.matchStarted || match.matchEnded);
    
    if (liveMatches.length > 0) {
      liveMatches.forEach(match => {
        liveContainer.appendChild(createMatchCard(match, true));
      });
    } else {
      liveContainer.innerHTML = "<p class='empty'>No live matches currently</p>";
    }
    
    
  } else {
    liveContainer.innerHTML = "<p class='empty'>No current matches available</p>";
  }

  // Render upcoming matches
  if (upcomingMatches && upcomingMatches.length > 0) {
    upcomingMatches.forEach(match => {
      if (!match.matchStarted) { // Extra check to ensure it's upcoming
        upcomingContainer.appendChild(createMatchCard(match, false));
      }
    });
    
    if (upcomingContainer.innerHTML === "") {
      upcomingContainer.innerHTML = "<p class='empty'>No upcoming matches scheduled</p>";
    }
  } else {
    upcomingContainer.innerHTML = "<p class='empty'>No upcoming matches available</p>";
  }
}

function createMatchCard(match, isLive) {
  const card = document.createElement("div");
  card.className = "match-card";
  
  if (isLive) {
    card.style.borderLeft = "5px solid red";
    card.classList.add("live-match");
  } else {
    card.style.borderLeft = "5px solid green";
    card.classList.add("upcoming-match");
  }

  const teamNames = match.name || `${match.teams?.join(" vs ")}`;
  const venue = match.venue || "Venue not specified";
  const status = match.status || (isLive ? "Match in progress" : "Match not started");
  
  const scoreInfo = match.score?.map(s => 
    `${s.inning}: ${s.r}/${s.w} (${s.o} ov)`
  ).join("<br>") || (isLive ? "Score not available" : "Match not started");
  
  const matchTime = match.dateTimeGMT ? new Date(match.dateTimeGMT).toLocaleString() : "Time not specified";

  card.innerHTML = `
    <h3>${teamNames}</h3>
    <p><strong>📍 ${venue}</strong></p>
    <p>🕒 ${matchTime}</p>
    <div class="score-section">${scoreInfo}</div>
    <p>Status: ${status}</p>
    <button onclick="viewMatchDetails('${match.id}')">
      ${isLive ? '🔴 LIVE Details' : '📅 View Details'}
    </button>
  `;
  
  return card;
}


function showLoading() {
  liveContainer.innerHTML = upcomingContainer.innerHTML = '<div class="loading-spinner"></div>';
}

function showError(error) {
  console.error(error);
  liveContainer.innerHTML = `
    <div class="error">
      <p>Failed to load matches</p>
      <p>${error.message}</p>
      <button onclick="fetchMatches()">Retry</button>
    </div>
  `;
  upcomingContainer.innerHTML = "";
}

window.viewMatchDetails = (id) => {
  sessionStorage.setItem('selectedMatchId', id);
  window.location.href = `match-details.html?id=${id}`;
};

// Initialize
document.addEventListener("DOMContentLoaded", fetchMatches);
setInterval(fetchMatches, 30000);
