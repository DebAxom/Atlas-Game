# The Atlas Game
Atlas is a game which I used to play with my school friends in recess or during classes hiding from the teacher. This is the online version of that !

## How to Play ?
* Get a random letter, name a place starting with it.
* The next player uses the last letter of your word.
* 15 seconds per turn, 3 lives each — lose all, you're out.
* Last player standing wins !

## Project Structure
The `client` directory contains the frontend Nijor codebase. <br>

The `server/src` directory contains the backend Bun/Nodejs codebase. <br>

The `server/bundle.js` file bundles all the external modules into 1 single file. <br>

The `build.sh` script compiles the frontend and backend code and puts everything inside the `build` directory.

## Note :
This project uses Firebase for Google Auth.
Before running this website on your own local machine, create the `client/src/firebase.js` file and add your own firebase configurations.