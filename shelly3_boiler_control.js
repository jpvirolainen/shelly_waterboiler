// Adapted from the original code by: Jukka Juslin
// https://github.com/Spot-hinta-fi/Shelly/blob/main/Scripts/Shelly-Vesivaraaja.js

// Settings
let nightHours = 4;          // 22:00 - 07:00
let afternoonHours = 3;      // 12:00 - 20:00
let relays = [0, 1, 2];      // Numbers of the relays to be controlled
let backupHours = [3, 4, 5]; // Hours during which the relay is activated if the Internet connection is not working or the service is down
let lowerPriceLimit = 5;     // Below this price, always on
let timerInterval = 30000;   // Fire the timer every 30 seconds

let currentRelayState = false;

let urlWaterBoilerHours = "https://api.spot-hinta.fi/WaterBoiler/" + nightHours + "/" + afternoonHours;
let urlPriceLimit = "https://api.spot-hinta.fi/JustNow/" + lowerPriceLimit + "/" + 999; // We're not interested in the upper limit s we use hard coded 999
let hour = -1; 

print("WaterBoiler: Control will start in " + timerInterval / 1000 + " seconds");

Timer.set(timerInterval, true, function () {
  let relayState = false;
  if (hour == new Date().getHours()) { return; }
  print("WaterBoiler: Relay state: " + (currentRelayState ? "on" : "off"));
  print("WaterBoiler: Checking water boiler schedule");
  Shelly.call("HTTP.GET", { url: urlWaterBoilerHours, timeout: 15, ssl_ca: "*" }, function (res, err) {
    hour = (err != 0 || res == null || (res.code !== 200 && res.code !== 400)) ? -1 : new Date().getHours();
    if (hour === -1) {
      if (backupHours.indexOf(new Date().getHours()) > -1) {
        relayState = true; 
        hour = new Date().getHours();
        print("WaterBoiler: Error state. The current hour is a reserved hour: the relay is switched on for this hour.");
      } else {
        print("WaterBoiler: Error state. The current hour is not a reserved hour: the relay is not switched on. Retrying connection.");
      }
    } else {
      if (res.code === 200) { 
        relayState = true; 
      }
    }
    if (currentRelayState != relayState) { 
      currentRelayState = relayState; 
      controlRelay(relayState); 
    }
    if (currentRelayState == false) {
      print("WaterBoiler: Checking price based schedule");
      Shelly.call("HTTP.GET", { url: urlPriceLimit, timeout: 15, ssl_ca: "*" }, function (res, err) {
        if (err == 0 && res != null && res.code === 200) {
          if (res.body === "0") {
            relayState = true;
            if (currentRelayState != relayState) { 
              currentRelayState = relayState; 
              controlRelay(relayState); 
            }
          }
        }
      });
    }
  });
});

// Switch the relays
function controlRelay(status) {
  for (let i = 0; i < relays.length; i++) {
    Shelly.call("Switch.Set", "{ id:" + relays[i] + ", on:" + status + "}", null, null);
  }
  print("WaterBoiler: Switching relay state to " + (status ? "on" : "off"));
}
