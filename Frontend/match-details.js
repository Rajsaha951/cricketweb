document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const matchId = urlParams.get('id') || sessionStorage.getItem('selectedMatchId');
  
  if (matchId) {
    fetchMatchDetails(matchId);
  } else {
    document.getElementById("match-title").textContent = "Match not found";
  }
});

async function fetchMatchDetails(matchId) {
  try {
    // Fetch match details
    const matchRes = await axios.get(`https://api.cricapi.com/v1/match_info?apikey=987d4a6e-f094-4674-abfb-49a36b21ff8d&id=${matchId}`);
    
    if (matchRes.data.status !== "success") {
      throw new Error("Failed to fetch match details");
    }
    
    const match = matchRes.data.data;
    displayMatchDetails(match);
    
    // Fetch commentary (if available)
    try {
      const commRes = await axios.get(`https://api.cricapi.com/v1/match_commentary?apikey=987d4a6e-f094-4674-abfb-49a36b21ff8d&id=${matchId}`);
      if (commRes.data.status === "success") {
        displayCommentary(commRes.data.data);
      }
    } catch (commError) {
      console.error("Error fetching commentary:", commError);
    }
    
  } catch (err) {
    console.error("Error:", err);
    document.getElementById("match-title").textContent = "Error loading match details";
  }
}

function displayMatchDetails(match) {
  const matchTitle = document.getElementById("match-title");
  const matchInfo = document.getElementById("match-info");
  const scorecard = document.getElementById("scorecard");
  
  // Set match title
  matchTitle.textContent = match.name || `${match.teams?.join(" vs ")}`;
  
  // Set basic match info
  matchInfo.innerHTML = `
    <p><strong>Venue:</strong> ${match.venue || "Not specified"}</p>
    <p><strong>Date:</strong> ${new Date(match.date).toLocaleString() || "Not specified"}</p>
    <p><strong>Status:</strong> ${match.status || "Not available"}</p>
  `;
  
  // Display scorecard if available
  if (match.score && match.score.length > 0) {
    scorecard.innerHTML = "<h3>Scorecard</h3>";
    
    match.score.forEach(inning => {
      scorecard.innerHTML += `
        <div class="inning">
          <h4>${inning.inning}</h4>
          <p>${inning.r}/${inning.w} (${inning.o} overs)</p>
          ${inning.batsmen ? displayBatsmen(inning.batsmen) : ""}
          ${inning.bowlers ? displayBowlers(inning.bowlers) : ""}
        </div>
      `;
    });
  } else {
    scorecard.innerHTML = "<p>Scorecard not available yet</p>";
  }
}

function displayBatsmen(batsmen) {
  let html = `<table>
    <tr><th>Batsman</th><th>Runs</th><th>Balls</th><th>4s</th><th>6s</th><th>SR</th></tr>`;
  
  batsmen.forEach(batsman => {
    html += `
      <tr>
        <td>${batsman.name} ${batsman.out ? `(${batsman.out})` : ''}</td>
        <td>${batsman.runs}</td>
        <td>${batsman.balls}</td>
        <td>${batsman.fours}</td>
        <td>${batsman.sixes}</td>
        <td>${batsman.strikeRate}</td>
      </tr>
    `;
  });
  
  html += "</table>";
  return html;
}

function displayBowlers(bowlers) {
  let html = `<table>
    <tr><th>Bowler</th><th>Overs</th><th>Runs</th><th>Wickets</th><th>Economy</th></tr>`;
  
  bowlers.forEach(bowler => {
    html += `
      <tr>
        <td>${bowler.name}</td>
        <td>${bowler.o}</td>
        <td>${bowler.r}</td>
        <td>${bowler.w}</td>
        <td>${bowler.econ}</td>
      </tr>
    `;
  });
  
  html += "</table>";
  return html;
}

function displayCommentary(commentaryData) {
  const commentaryContainer = document.getElementById("commentary");
  
  if (commentaryData.commentary && commentaryData.commentary.length > 0) {
    commentaryContainer.innerHTML = "";
    
    commentaryData.commentary.forEach(comment => {
      const commentElement = document.createElement("div");
      commentElement.className = "comment";
      commentElement.innerHTML = `
        <p class="comment-time">${new Date(comment.time).toLocaleTimeString()}</p>
        <p class="comment-text">${comment.comment}</p>
      `;
      commentaryContainer.appendChild(commentElement);
    });
  } else {
    commentaryContainer.innerHTML = "<p>No commentary available yet</p>";
  }
}