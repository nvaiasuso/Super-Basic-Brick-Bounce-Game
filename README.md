# Super-Basic-Brick-Bounce-Game

## How to play

- Move with the left/right arrow keys and tilt with up/down. Use the key buttons under the game to rebind controls. Tilting turns the paddle itself and changes the ball's rebound direction.
- Start each run with the ball on your paddle; press Space to launch.
- Toggle auto-play with the button under the game or Shift+Q. Auto-play predicts landings for all balls, catches reachable power-ups when there is time, chooses a paddle tilt to break bricks, and avoids shots that would hit killbricks instead of dodging nextbots.
- Press Escape to pause and open the control-rebinding menu. Press Escape again or select Resume to continue.
- Break every normal brick to advance through all 50 levels, including five distinct moving bosses that summon nextbot minions, moving sweeper hazards, and later levels with denser laser and killbrick hazards.
- Admin Tools can jump directly to any level. Right-click supported add/spawn actions to run them repeatedly; choose 5–100 repetitions in the Admin menu. Level announcements call out when nextbots, lasers, and bosses appear.
- Admin Tools can jump directly to any level, spawn individual items or a full set, toggle display layers, pause automatic level advancement, and show FPS. Enter a repeat count from 1 to 1,000 and right-click supported actions to run them repeatedly. Level announcements call out when nextbots, lasers, and bosses appear.
- The Admin Tools menu's **Open URL from text file** button reads the first URL in `admin-url.txt` and opens it in a new tab. Replace the example URL in that file; only `http://` and `https://` links are accepted.
- Break five normal bricks in a row to spawn an extra ball. The HUD shows the current streak and number of balls.
- Avoid striped killbricks: touching one costs a life. Missing the paddle also costs a life. You have three lives.
- After winning or losing, press R to restart.

## Play together

- Start the game with `npm start` and open the same running server in both players' browsers.
- The host selects **Make a Lobby** and shares the six-character code.
- The other player enters the code, selects **Join Lobby**, then marks themselves ready. The host starts the match when ready.
- The host can add as many named AI players as desired before starting; a lobby can start with AI players even when no second person joins.
- AI partners prioritize catching the ball over evading nextbots, while still dodging laser lanes and only chasing green balls or power-ups when they can still save the white ball. Nextbot attacks queue visibly for staggered team assaults; Pandemonium starts its five-second warning immediately. Lasers can destroy nextbots. Temporary power-ups last five seconds, and extra-ball and nextbot spawns are uncapped. Teammates can help steer the shield during nextbot battles.
- Use Lobby Chat to message everyone in the room before or during a match.
- The music player includes repository tracks, local audio/MP4 files, and shared tracks from the configured Supabase `game-music` bucket. Shared tracks are listed publicly; uploading requires signing in with the account allowed by the bucket's insert policy. Uploads are one supported media file at a time and limited to 25 MB in the browser. The bucket must exist and its storage policies and MIME/size limits must allow the selected files. Never put a Supabase service-role key in browser code.
- Choose a playlist track, use Previous/Next, select playlist playback or Repeat one, and adjust the 0-30 dB bass boost.
- For players outside your local network, deploy this Node server somewhere both browsers can reach. The host must support WebSocket connections on the same address as the game; static-only hosting is not enough.