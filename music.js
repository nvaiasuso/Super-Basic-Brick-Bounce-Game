const musicMedia = document.getElementById("music-media");
const musicUpload = document.getElementById("music-upload");
const musicPlaylist = document.getElementById("music-playlist");
const musicCurrent = document.getElementById("music-current");
const musicMode = document.getElementById("music-mode");
const musicTracks = [
  { title: "Femboy Friday - indxgo", url: encodeURIComponent("Femboy Friday - indxgo (720p, h264).mp4") },
  { title: "MEGALOVANIA - Toby Fox", url: encodeURIComponent("MEGALOVANIA - Toby Fox (720p, h264).mp4") },
  { title: "We Only Guzzle Diesel - Red White and Country", url: encodeURIComponent("We Only Guzzle Diesel - Red White and Country (720p, h264).mp4") }
];
let currentMusicIndex = -1;

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

window.addEventListener("beforeunload", function () {
  for (const track of musicTracks) {
    if (track.objectUrl) URL.revokeObjectURL(track.objectUrl);
  }
});

playTrack(0, false);