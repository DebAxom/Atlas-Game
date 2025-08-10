import { Render } from "nijor";
import "nijor/router";
import App from 'App.nijor';
import { firebaseConfig } from './firebase.js';
import { initializeApp } from "firebase/app";

//@Routes()

(async()=>{
  const app = initializeApp(firebaseConfig);
  window.fireApp = app;
  await Render(App);
})();