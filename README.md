# Super-Basic-Brick-Bounce-Game

## How to play

- Move with A/D or the left/right arrow keys and tilt with W/S or up/down. Use the key buttons under the game to rebind controls. Tilting turns the paddle itself and changes the ball's rebound direction.
- Start each run with the ball on your paddle; press Space to launch.
- Toggle auto-play with the button under the game or Shift+Q. Auto-play predicts landings for all balls, catches reachable power-ups when there is time, chooses a paddle tilt to break bricks, and avoids shots that would hit killbricks instead of dodging nextbots.
- Start the Daily Challenge for a date-fixed mode, level, and enemy lineup. Clear the challenge level to finish the run; your best score is saved separately for each UTC date.
- Collect freeze pulses, seeker rockets, paddle dashes, and +500 score caches. The Career Board tracks local milestones for brick hits, pickups, bosses, and level clears.
- Press Escape to pause and open the control-rebinding menu. Press Escape again or select Resume to continue.
- Break every normal brick to advance through 120 levels, including nineteen rotating boss encounters and a final Wither Storm fight. Boss health is tuned for shorter fights. The final level has no nextbots; the Wither Storm grows and consumes the open Admin Tools panel near defeat, then turns its settings and spawn controls into attacks. Other levels feature moving sweeper hazards and denser laser and killbrick hazards; Endless mode continues with cycling layouts.
- Admin Tools can jump directly to any level, spawn unlimited friendly gunners that patrol while shooting nextbots and breakable blocks, spawn individual items or a full set, toggle display layers and hitboxes, pause automatic level advancement, and show FPS. Right-click supported actions to repeat them with no fixed count limit. Large spawn counts can slow the browser; use the cleanup controls to remove spawned objects.
- The Admin Tools menu's **Open URL from text file** button reads the first URL in `admin-url.txt` and opens it in a new tab. Replace the example URL in that file; only `http://` and `https://` links are accepted.
- Break five normal bricks in a row to spawn an extra ball. The HUD shows the current streak and number of balls.
- Avoid striped killbricks: touching one costs a life. Missing the paddle also costs a life. You have three lives.
- After winning or losing, press R to restart.

## Play together

- Start the game with `npm start` and open the same running server in both players' browsers.
- The host selects **Make a Lobby** and shares the six-character code.
- The other player enters the code, selects **Join Lobby**, then marks themselves ready. The host starts the match when ready.
- The host can add up to eight named AI players before starting; a standard lobby can start with AI players even when no second person joins.
- In Admin Battle, the host runs the admin panel and the second human player is the only player paddle; a second human is required to start.
- Online lobbies require an internet connection. **Local Multiplayer (Offline)** runs a two-player test on one device without a network connection.
- AI partners prioritize catching the ball over evading nextbots, while still dodging laser lanes and only chasing green balls or power-ups when they can still save the white ball. The object inspector shows their predicted landing, timing, power-up choice, and laser-safe movement target. Nextbot attacks queue visibly for staggered team assaults; Pandemonium starts its five-second warning immediately. Lasers can destroy nextbots. Temporary power-ups last five seconds. Admin-spawned objects have no count cap; large counts can slow the browser and multiplayer updates. Teammates can help steer the shield during nextbot battles.
- Use Lobby Chat to message everyone in the room before or during a match.
- The music player includes repository tracks, local audio/MP4 files, and shared tracks from the configured Supabase `game-music` bucket. Shared tracks are listed publicly; uploading requires signing in with the account allowed by the bucket's insert policy. Uploads are one supported media file at a time and limited to 25 MB in the browser. The bucket must exist and its storage policies and MIME/size limits must allow the selected files. Never put a Supabase service-role key in browser code.
- Choose a playlist track, use Previous/Next, select playlist playback or Repeat one, and open the Music Editor for bass, treble, volume, gain, and frequency controls. Bass boost can be configured up to 60 dB.
- The Node server is the preferred multiplayer host. On static hosting, the game falls back to Supabase Realtime using the configured project; that project must allow public Realtime channels and both browsers need an internet connection. Lobby rooms are temporary and work only while the host stays connected.