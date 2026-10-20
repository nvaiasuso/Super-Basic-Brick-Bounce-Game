# Super-Basic-Brick-Bounce-Game

## How to play

- Move with the left/right arrow keys and tilt with up/down. Use the key buttons under the game to rebind controls. Tilting turns the paddle itself and changes the ball's rebound direction.
- Start each run with the ball on your paddle; press Space to launch.
- Toggle auto-play with the button under the game or Shift+Q. Auto-play predicts the landing, chooses a paddle tilt to break bricks, and avoids shots that would hit killbricks.
- Press Escape to pause and open the control-rebinding menu. Press Escape again or select Resume to continue.
- Break every normal brick to advance through all ten levels.
- Break five normal bricks in a row to spawn an extra ball. The HUD shows the current streak and number of balls.
- Avoid striped killbricks: touching one costs a life. Missing the paddle also costs a life. You have three lives.
- After winning or losing, press R to restart.

## Play together

- Start the game with `npm start` and open the same running server in both players' browsers.
- The host selects **Make a Lobby** and shares the six-character code.
- The other player enters the code, selects **Join Lobby**, then marks themselves ready. The host starts the match when ready.
- The host can add as many named AI players as desired before starting; a lobby can start with AI players even when no second person joins.
- AI partners control their own paddles, collect power-ups, and prioritize keeping green extra balls in play. Teammates can help steer the shield during nextbot battles.
- For players outside your local network, deploy this Node server somewhere both browsers can reach. The host must support WebSocket connections on the same address as the game; static-only hosting is not enough.