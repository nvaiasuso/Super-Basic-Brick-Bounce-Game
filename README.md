# Super-Basic-Brick-Bounce-Game

## How to play

- Move with the left/right arrow keys and tilt with up/down. Use the key buttons under the game to rebind controls. Tilting turns the paddle itself and changes the ball's rebound direction.
- Start each run with the ball on your paddle; press Space to launch.
- Toggle auto-play with the button under the game or Shift+Q. Auto-play predicts landings for all balls, catches reachable power-ups when there is time, chooses a paddle tilt to break bricks, and avoids shots that would hit killbricks instead of dodging nextbots.
- Press Escape to pause and open the control-rebinding menu. Press Escape again or select Resume to continue.
- Break every normal brick to advance through all 70 levels, including eleven distinct moving bosses that summon nextbot minions, moving sweeper hazards, and later levels with denser laser and killbrick hazards.
- Admin Tools can jump directly to any level, spawn individual items or a full set, toggle display layers and hitboxes, pause automatic level advancement, and show FPS. Right-click supported actions to repeat them up to 100 times; the nextbot limit is adjustable up to 64.
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
- AI partners prioritize catching the ball over evading nextbots, while still dodging laser lanes and only chasing green balls or power-ups when they can still save the white ball. The object inspector shows their predicted landing, timing, power-up choice, and laser-safe movement target. Nextbot attacks queue visibly for staggered team assaults; Pandemonium starts its five-second warning immediately. Lasers can destroy nextbots. Temporary power-ups last five seconds. Admin-spawned objects and active nextbots are capped to keep multiplayer responsive. Teammates can help steer the shield during nextbot battles.
- Use Lobby Chat to message everyone in the room before or during a match.
- The music player includes repository tracks, local audio/MP4 files, and shared tracks from the configured Supabase `game-music` bucket. Shared tracks are listed publicly; uploading requires signing in with the account allowed by the bucket's insert policy. Uploads are one supported media file at a time and limited to 25 MB in the browser. The bucket must exist and its storage policies and MIME/size limits must allow the selected files. Never put a Supabase service-role key in browser code.
- Choose a playlist track, use Previous/Next, select playlist playback or Repeat one, and adjust the 0-30 dB bass boost.
- The Node server is the preferred multiplayer host. On static hosting, the game falls back to Supabase Realtime using the configured project; that project must allow public Realtime channels and both browsers need an internet connection. Lobby rooms are temporary and work only while the host stays connected.