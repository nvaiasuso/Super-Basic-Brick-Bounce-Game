const musicMedia = document.getElementById("music-media");
const musicUpload = document.getElementById("music-upload");
const musicPlaylist = document.getElementById("music-playlist");
const musicCurrent = document.getElementById("music-current");
const musicMode = document.getElementById("music-mode");
const musicBass = document.getElementById("music-bass");
const musicBassValue = document.getElementById("music-bass-value");
const musicTrackTitle = document.getElementById("music-track-title");
const musicTrackNotes = document.getElementById("music-track-notes");
const adminMusicToggle = document.getElementById("admin-music-toggle");
const musicTracks = [];
let currentMusicIndex = -1;
let musicAudioContext = null;
let bassFilter = null;
const repositoryMusicExtensions = new Set([".aac", ".flac", ".m4a", ".mp3", ".mp4", ".ogg", ".opus", ".wav", ".webm"]);
const musicDetailsStorageKey = "blockBreakerMusicDetails";
let savedMusicDetails = {};

try {
  const storedDetails = JSON.parse(localStorage.getItem(musicDetailsStorageKey) || "{}");
  if (storedDetails && typeof storedDetails === "object" && !Array.isArray(storedDetails)) {
    savedMusicDetails = storedDetails;
  }
} catch (error) {
  savedMusicDetails = {};
}

musicMedia.crossOrigin = "anonymous";

function setupBassBoost() {
  const AudioContextType = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextType) {
    musicBass.disabled = true;
    musicBassValue.textContent = "Unavailable";
    return;
  }

  try {
    musicAudioContext = new AudioContextType();
    bassFilter = musicAudioContext.createBiquadFilter();
    bassFilter.type = "lowshelf";
    bassFilter.frequency.value = 110;
    const mediaSource = musicAudioContext.createMediaElementSource(musicMedia);
    mediaSource.connect(bassFilter);
    bassFilter.connect(musicAudioContext.destination);
  } catch (error) {
    musicBass.disabled = true;
    musicBassValue.textContent = "Unavailable";
  }
}

function updateBassBoost() {
  const decibels = Number(musicBass.value);
  musicBassValue.textContent = decibels + " dB";
  if (bassFilter) bassFilter.gain.setTargetAtTime(decibels, musicAudioContext.currentTime, 0.04);
}

musicBass.addEventListener("input", updateBassBoost);
musicMedia.addEventListener("play", function () {
  if (musicAudioContext && musicAudioContext.state === "suspended") musicAudioContext.resume();
});
setupBassBoost();
updateBassBoost();

function addMusicTracks(tracks) {
  for (const track of tracks) {
    if (typeof track.title === "string" && typeof track.url === "string") {
      track.metadataKey = track.url;
      const details = savedMusicDetails[track.metadataKey];
      if (details) {
        if (typeof details.title === "string") track.title = details.title;
        if (typeof details.description === "string") track.description = details.description;
      }
      musicTracks.push(track);
    }
  }
  if (musicTracks.length === 0) throw new Error("No repository music found");
  renderMusicPlaylist();
  playTrack(0, false);
}

async function loadGitHubMusic() {
  const response = await fetch(
    "https://api.github.com/repos/nvaiasuso/Super-Basic-Brick-Bounce-Game/git/trees/main?recursive=1",
    { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" }
  );
  if (!response.ok) throw new Error("GitHub music scan failed");

  const repository = await response.json();
  const tracks = (repository.tree || [])
    .filter(function (entry) {
      return entry.type === "blob" && repositoryMusicExtensions.has(entry.path.slice(entry.path.lastIndexOf(".")).toLowerCase());
    })
    .map(function (entry) {
      const encodedPath = entry.path.split("/").map(encodeURIComponent).join("/");
      return {
        title: entry.path.split("/").pop().replace(/\.[^.]+$/, ""),
        url: "https://raw.githubusercontent.com/nvaiasuso/Super-Basic-Brick-Bounce-Game/main/" + encodedPath
      };
    });
  addMusicTracks(tracks);
}

function updateMusicMode() {
  musicMedia.loop = musicMode.value === "one";
}

function renderMusicPlaylist() {
  musicPlaylist.replaceChildren();
  musicTracks.forEach(function (track, index) {
    const item = document.createElement("li");
    const trackInfo = document.createElement("div");
    trackInfo.className = "music-track-info";
    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.className = "music-track";
    playButton.textContent = track.title;
    playButton.setAttribute("aria-current", String(index === currentMusicIndex));
    playButton.addEventListener("click", function () {
      playTrack(index, true);
    });
    trackInfo.append(playButton);

    if (track.description) {
      const description = document.createElement("p");
      description.className = "music-track-description";
      description.textContent = track.description;
      trackInfo.append(description);
    }
    item.append(trackInfo);

    if (track.objectUrl) {
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "music-remove";
      removeButton.textContent = "Remove";
      removeButton.setAttribute("aria-label", "Remove " + track.title);
      removeButton.addEventListener("click", function () {
        removeTrack(index);
      });
      item.append(removeButton);
    }

    musicPlaylist.append(item);
  });
}

function playTrack(index, shouldPlay) {
  if (musicTracks.length === 0) {
    currentMusicIndex = -1;
    musicMedia.pause();
    musicMedia.removeAttribute("src");
    musicMedia.load();
    musicCurrent.textContent = "Add a music file to start a playlist.";
    updateTrackDetailsFields(null);
    renderMusicPlaylist();
    return;
  }

  currentMusicIndex = (index + musicTracks.length) % musicTracks.length;
  const track = musicTracks[currentMusicIndex];
  musicMedia.src = track.objectUrl || track.url;
  musicMedia.load();
  updateMusicMode();
  musicCurrent.textContent = track.title;
  updateTrackDetailsFields(track);
  renderMusicPlaylist();

  if (shouldPlay) {
    musicMedia.play().catch(function () {
      musicCurrent.textContent = "Select play to start: " + track.title;
    });
  }
}

function removeTrack(index) {
  const removed = musicTracks[index];
  if (!removed) return;
  const wasCurrent = index === currentMusicIndex;
  if (removed.objectUrl) URL.revokeObjectURL(removed.objectUrl);
  musicTracks.splice(index, 1);

  if (wasCurrent) {
    musicMedia.pause();
    currentMusicIndex = -1;
    playTrack(Math.min(index, musicTracks.length - 1), false);
  } else if (index < currentMusicIndex) {
    currentMusicIndex--;
    renderMusicPlaylist();
  } else {
    renderMusicPlaylist();
  }
}

musicUpload.addEventListener("change", function () {
  for (const file of musicUpload.files) {
    if (!file.type.startsWith("audio/") && !file.type.startsWith("video/") && !file.name.toLowerCase().endsWith(".mp4")) continue;
    const metadataKey = "upload:" + file.name + ":" + file.size + ":" + file.lastModified;
    const details = savedMusicDetails[metadataKey];
    musicTracks.push({
      title: details && typeof details.title === "string" ? details.title : file.name.replace(/\.[^.]+$/, ""),
      description: details && typeof details.description === "string" ? details.description : "",
      metadataKey: metadataKey,
      objectUrl: URL.createObjectURL(file)
    });
  }
  musicUpload.value = "";
  renderMusicPlaylist();
  if (currentMusicIndex < 0 && musicTracks.length) playTrack(0, false);
});

function updateTrackDetailsFields(track) {
  musicTrackTitle.disabled = !track;
  musicTrackNotes.disabled = !track;
  document.getElementById("music-save-details").disabled = !track;
  musicTrackTitle.value = track ? track.title : "";
  musicTrackNotes.value = track ? track.description || "" : "";
}

document.getElementById("music-save-details").addEventListener("click", function () {
  const track = musicTracks[currentMusicIndex];
  if (!track) return;

  track.title = musicTrackTitle.value.trim() || track.title;
  track.description = musicTrackNotes.value.trim();
  savedMusicDetails[track.metadataKey] = {
    title: track.title,
    description: track.description
  };
  renderMusicPlaylist();
  musicCurrent.textContent = "Saved details for " + track.title;

  try {
    localStorage.setItem(musicDetailsStorageKey, JSON.stringify(savedMusicDetails));
  } catch (error) {
    musicCurrent.textContent = "Details saved for this session only.";
  }
});

document.getElementById("admin-music-add").addEventListener("click", function () {
  musicUpload.click();
});

function refreshAdminMusicToggle() {
  const isPlaying = !musicMedia.paused;
  adminMusicToggle.textContent = isPlaying ? "Pause music" : "Play music";
  adminMusicToggle.setAttribute("aria-pressed", String(isPlaying));
}

adminMusicToggle.addEventListener("click", function () {
  if (musicMedia.paused) {
    if (currentMusicIndex < 0 && musicTracks.length) playTrack(0, true);
    else musicMedia.play().catch(function () {});
  } else {
    musicMedia.pause();
  }
  refreshAdminMusicToggle();
});

document.getElementById("admin-music-clear").addEventListener("click", function () {
  const uploadIndexes = musicTracks.map(function (track, index) {
    return track.objectUrl ? index : -1;
  }).filter(function (index) {
    return index >= 0;
  }).reverse();
  for (const index of uploadIndexes) removeTrack(index);
  musicCurrent.textContent = uploadIndexes.length ? "Removed " + uploadIndexes.length + " local upload(s)." : "No local uploads to clear.";
});

musicMedia.addEventListener("play", refreshAdminMusicToggle);
musicMedia.addEventListener("pause", refreshAdminMusicToggle);
updateTrackDetailsFields(null);
refreshAdminMusicToggle();

document.getElementById("music-previous").addEventListener("click", function () {
  if (currentMusicIndex >= 0) playTrack(currentMusicIndex - 1, true);
});

document.getElementById("music-next").addEventListener("click", function () {
  if (currentMusicIndex >= 0) playTrack(currentMusicIndex + 1, true);
});

musicMode.addEventListener("change", updateMusicMode);
musicMedia.addEventListener("ended", function () {
  if (musicMode.value === "playlist" && musicTracks.length > 0) {
    playTrack(currentMusicIndex + 1, true);
  }
});

async function loadRepositoryMusic() {
  try {
    const response = await fetch("/api/music", { cache: "no-store" });
    if (!response.ok) throw new Error("Music scan failed");
    addMusicTracks(await response.json());
  } catch (error) {
    try {
      await loadGitHubMusic();
    } catch (fallbackError) {
      musicCurrent.textContent = "Could not load music from the repository.";
    }
  }
}

window.addEventListener("beforeunload", function () {
  for (const track of musicTracks) {
    if (track.objectUrl) URL.revokeObjectURL(track.objectUrl);
  }
});

loadRepositoryMusic();