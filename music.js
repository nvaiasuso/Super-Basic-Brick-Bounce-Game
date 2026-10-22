const musicMedia = document.getElementById("music-media");
const musicUpload = document.getElementById("music-upload");
const musicPlaylist = document.getElementById("music-playlist");
const musicCurrent = document.getElementById("music-current");
const musicMode = document.getElementById("music-mode");
const musicTracks = [];
let currentMusicIndex = -1;
const repositoryMusicExtensions = new Set([".aac", ".flac", ".m4a", ".mp3", ".mp4", ".ogg", ".opus", ".wav", ".webm"]);

function addMusicTracks(tracks) {
  for (const track of tracks) {
    if (typeof track.title === "string" && typeof track.url === "string") {
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
    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.className = "music-track";
    playButton.textContent = track.title;
    playButton.setAttribute("aria-current", String(index === currentMusicIndex));
    playButton.addEventListener("click", function () {
      playTrack(index, true);
    });
    item.append(playButton);

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
    renderMusicPlaylist();
    return;
  }

  currentMusicIndex = (index + musicTracks.length) % musicTracks.length;
  const track = musicTracks[currentMusicIndex];
  musicMedia.src = track.objectUrl || track.url;
  musicMedia.load();
  updateMusicMode();
  musicCurrent.textContent = track.title;
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
    musicTracks.push({
      title: file.name.replace(/\.[^.]+$/, ""),
      objectUrl: URL.createObjectURL(file)
    });
  }
  musicUpload.value = "";
  renderMusicPlaylist();
  if (currentMusicIndex < 0 && musicTracks.length) playTrack(0, false);
});

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