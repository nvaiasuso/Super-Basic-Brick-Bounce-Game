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
const supabaseLoginForm = document.getElementById("supabase-login-form");
const supabaseUploadForm = document.getElementById("supabase-upload-form");
const supabaseMusicStatus = document.getElementById("supabase-music-status");
const supabaseEmail = document.getElementById("supabase-email");
const supabasePassword = document.getElementById("supabase-password");
const supabaseSignOut = document.getElementById("supabase-sign-out");
const supabaseTrackFile = document.getElementById("supabase-track-file");
const musicTracks = [];
let currentMusicIndex = -1;
let musicAudioContext = null;
let bassFilter = null;
const repositoryMusicExtensions = new Set([".aac", ".flac", ".m4a", ".mp3", ".mp4", ".ogg", ".opus", ".wav", ".webm"]);
const sharedMusicExtensions = new Set([".aac", ".flac", ".m4a", ".mp3", ".mp4", ".ogg", ".opus", ".wav", ".webm"]);
const maxSharedMusicBytes = 25 * 1024 * 1024;
const SHARED_MUSIC_CONFIG = {
  supabaseUrl: "https://fnshptqozatuozqoflca.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuc2hwdHFvemF0dW96cW9mbGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MzMwMTIsImV4cCI6MjEwODEwOTAxMn0.W4lektRZbi4gSv3bsHe_19-ECMDA4jGBYJs9jb4zTE4",
  bucket: "game-music"
};
const supabaseClient = window.supabase && typeof window.supabase.createClient === "function"
  ? window.supabase.createClient(SHARED_MUSIC_CONFIG.supabaseUrl, SHARED_MUSIC_CONFIG.anonKey)
  : null;
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

function addSharedMusicTracks(objects) {
  for (const object of objects) {
    const extension = object.name.slice(object.name.lastIndexOf(".")).toLowerCase();
    const metadataKey = "supabase:" + object.name;
    if (object.id === null || !sharedMusicExtensions.has(extension)) continue;
    if (musicTracks.some(function (track) { return track.metadataKey === metadataKey; })) continue;

    const details = savedMusicDetails[metadataKey];
    musicTracks.push({
      title: details && typeof details.title === "string" ? details.title : object.name.replace(/\.[^.]+$/, ""),
      description: details && typeof details.description === "string" ? details.description : "",
      metadataKey: metadataKey,
      storagePath: object.name
    });
  }
  renderMusicPlaylist();
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

async function playTrack(index, shouldPlay) {
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
  updateMusicMode();
  musicCurrent.textContent = track.storagePath ? "Loading " + track.title + "..." : track.title;
  updateTrackDetailsFields(track);
  renderMusicPlaylist();

  if (track.storagePath) {
    if (!supabaseClient) {
      musicCurrent.textContent = "Shared music is unavailable right now.";
      return;
    }
    let signedUrl;
    try {
      const result = await supabaseClient.storage
        .from(SHARED_MUSIC_CONFIG.bucket)
        .createSignedUrl(track.storagePath, 3600);
      if (result.error || !result.data || !result.data.signedUrl) throw new Error("Signed URL unavailable");
      signedUrl = result.data.signedUrl;
    } catch (error) {
      musicCurrent.textContent = "Could not load " + track.title + ". Check the bucket read policy.";
      return;
    }
    if (musicTracks[currentMusicIndex] !== track) return;
    musicMedia.src = signedUrl;
  } else {
    musicMedia.src = track.objectUrl || track.url;
  }
  musicMedia.load();

  if (shouldPlay) {
    musicMedia.play().catch(function () {
      musicCurrent.textContent = "Select play to start: " + track.title;
    });
  }
  musicCurrent.textContent = track.title;
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

async function loadSharedMusic() {
  if (!supabaseClient) {
    supabaseMusicStatus.textContent = "Shared music is unavailable because its client did not load.";
    return;
  }

  supabaseMusicStatus.textContent = "Loading shared tracks...";
  try {
    const result = await supabaseClient.storage
      .from(SHARED_MUSIC_CONFIG.bucket)
      .list("", { limit: 100, sortBy: { column: "name", order: "asc" } });
    if (result.error) throw result.error;
    const sharedObjects = result.data || [];
    addSharedMusicTracks(sharedObjects);
    const trackCount = sharedObjects.filter(function (object) {
      const extension = object.name.slice(object.name.lastIndexOf(".")).toLowerCase();
      return object.id !== null && sharedMusicExtensions.has(extension);
    }).length;
    supabaseMusicStatus.textContent = trackCount
      ? trackCount + " shared track(s) available."
      : "No shared tracks yet.";
  } catch (error) {
    supabaseMusicStatus.textContent = "Could not list shared tracks. Check the bucket read policy.";
  }
}

function updateSupabaseAuthUi(session) {
  const isAuthenticated = Boolean(session && session.user);
  supabaseEmail.disabled = isAuthenticated;
  supabasePassword.disabled = isAuthenticated;
  supabaseLoginForm.querySelector('button[type="submit"]').hidden = isAuthenticated;
  supabaseSignOut.hidden = !isAuthenticated;
  supabaseUploadForm.hidden = !isAuthenticated;
  if (isAuthenticated) {
    supabaseMusicStatus.textContent = "Signed in as " + (session.user.email || "admin") + ". Upload one track at a time.";
  }
}

supabaseLoginForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  if (!supabaseClient) {
    supabaseMusicStatus.textContent = "Shared music is unavailable because its client did not load.";
    return;
  }

  const signInButton = supabaseLoginForm.querySelector('button[type="submit"]');
  signInButton.disabled = true;
  supabaseMusicStatus.textContent = "Signing in...";
  try {
    const result = await supabaseClient.auth.signInWithPassword({
      email: supabaseEmail.value.trim(),
      password: supabasePassword.value
    });
    if (result.error) throw result.error;
    supabasePassword.value = "";
    updateSupabaseAuthUi(result.data.session);
  } catch (error) {
    supabaseMusicStatus.textContent = "Sign-in failed. Check the account and password.";
  } finally {
    signInButton.disabled = false;
  }
});

supabaseSignOut.addEventListener("click", async function () {
  if (!supabaseClient) return;
  try {
    const result = await supabaseClient.auth.signOut();
    if (result.error) throw result.error;
  } catch (error) {
    supabaseMusicStatus.textContent = "Could not sign out.";
    return;
  }
  supabasePassword.value = "";
  updateSupabaseAuthUi(null);
  supabaseMusicStatus.textContent = "Signed out.";
});

supabaseUploadForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  if (!supabaseClient) return;

  const file = supabaseTrackFile.files[0];
  if (!file) {
    supabaseMusicStatus.textContent = "Choose one audio or MP4 file first.";
    return;
  }

  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const isAudio = file.type.startsWith("audio/");
  const isMp4 = extension === ".mp4" && file.type === "video/mp4";
  if ((!isAudio && !isMp4) || !sharedMusicExtensions.has(extension) || file.size === 0 || file.size > maxSharedMusicBytes) {
    supabaseMusicStatus.textContent = "Choose a non-empty supported audio/MP4 file under 25 MB.";
    return;
  }

  const uploadButton = supabaseUploadForm.querySelector('button[type="submit"]');
  uploadButton.disabled = true;
  supabaseMusicStatus.textContent = "Uploading one track...";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-120);
  const randomPart = window.crypto && typeof window.crypto.randomUUID === "function"
    ? window.crypto.randomUUID()
    : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
  const storagePath = Date.now() + "-" + randomPart + "-" + safeName;

  try {
    const result = await supabaseClient.storage
      .from(SHARED_MUSIC_CONFIG.bucket)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || (extension === ".mp4" ? "video/mp4" : "audio/mpeg")
      });
    if (result.error) throw result.error;
    supabaseTrackFile.value = "";
    await loadSharedMusic();
    supabaseMusicStatus.textContent = "Upload complete. The track is in the shared playlist.";
  } catch (error) {
    supabaseMusicStatus.textContent = "Upload failed. Confirm you are signed in with the authorized account and the bucket allows this file size/type.";
  } finally {
    uploadButton.disabled = false;
  }
});

if (supabaseClient) {
  supabaseClient.auth.getSession().then(function (result) {
    updateSupabaseAuthUi(result.data && result.data.session);
  }).catch(function () {
    updateSupabaseAuthUi(null);
  });
  supabaseClient.auth.onAuthStateChange(function (_event, session) {
    updateSupabaseAuthUi(session);
  });
} else {
  supabaseLoginForm.querySelector('button[type="submit"]').disabled = true;
  supabaseMusicStatus.textContent = "Shared music is unavailable because its client did not load.";
}

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
loadSharedMusic();