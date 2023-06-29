/*

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

Copyright (C) 2023 Tuukka Lindroos

*/

const { createBluetooth } = require('node-ble');
const config = require('config');
const RuuviTag =  require("./ruuvitag")
const { HomeAssistantDiscoveryJSON } = require('./homeassistant-helper');
const mqtt = require('mqtt');

let ruuviTags = new Array();

async function discoverRuuvis(adapter, mqttclient, scanrate)
{
   const ruuviTagConfs = config.get("ruuvitags");

   for (const ruuviTagconf of ruuviTagConfs) {

      const ruuvi = new RuuviTag(ruuviTagconf.name, ruuviTagconf.mac, {timeout: 20000, scanrate: scanrate});
      ruuvi.on("connected", async (connectedRuuvi) => await performHADiscovery(connectedRuuvi, mqttclient));
      ruuvi.on("updated", async (updatedRuuvi, sensorData) => await sendUpdateToHA(updatedRuuvi, sensorData, mqttclient));

      await ruuvi.initRuuviTag(adapter)

      ruuviTags.push(ruuvi);
   }
}

async function performHADiscovery(ruuviTag, mqttclient)
{
   console.log("connected: " + ruuviTag.name)

   mqttclient.publish(`homeassistant/sensor/${ruuviTag.name}/temperature/config`, JSON.stringify(HomeAssistantDiscoveryJSON("temperature", ruuviTag.name)), { retain: true }, null);
   mqttclient.publish(`homeassistant/sensor/${ruuviTag.name}/humidity/config`, JSON.stringify(HomeAssistantDiscoveryJSON("humidity", ruuviTag.name)), { retain: true }, null);
   mqttclient.publish(`homeassistant/sensor/${ruuviTag.name}/pressure/config`, JSON.stringify(HomeAssistantDiscoveryJSON("pressure", ruuviTag.name)), { retain: true }, null);
   mqttclient.publish(`homeassistant/sensor/${ruuviTag.name}/battery/config`, JSON.stringify(HomeAssistantDiscoveryJSON("battery", ruuviTag.name)), { retain: true }, null);
   mqttclient.publish(`homeassistant/sensor/${ruuviTag.name}/movement/config`, JSON.stringify(HomeAssistantDiscoveryJSON("movement", ruuviTag.name)), { retain: true }, null);
}

async function sendUpdateToHA(updatedRuuvi, sensorData, mqttclient)
{
   mqttclient.publish(`homeassistant/sensor/${sensorData.name}/state`, JSON.stringify(sensorData));
   console.log(`updated sensor ${sensorData.name} time between: ${(updatedRuuvi.lastComm - updatedRuuvi.prevComm) / 1000} seconds`);
}

async function main ()
{
   console.log("Connecting MQTT server")
   const mqttOptions = {
      username: config.mqtt.username,
      password: config.mqtt.password,
      clientid: config.mqtt.clientid,
      will: {
         topic: "homeassistant/sensor/bridge/state",
         payload: "offline",
         retain: true
      }
   }
   const mqttclient = mqtt.connect(config.mqtt.host, mqttOptions);
   console.log("MQTT connected")
   mqttclient.publish(`homeassistant/sensor/bridge/state`, 'online', { retain: true });
   console.log("Told HA that bridge is online")

   console.log("Starting BLE");
   const {bluetooth} = createBluetooth()
   const adapter = await bluetooth.defaultAdapter()

   process.on('SIGINT', async() => {await adapter.stopDiscovery(); mqttclient.end(); process.exit(0);});  // CTRL+C
   process.on('SIGQUIT', async() => {await adapter.stopDiscovery(); mqttclient.end(); process.exit(0);}); // Keyboard quit
   process.on('SIGTERM', async() => {await adapter.stopDiscovery(); mqttclient.end(); process.exit(0);}); // `kill` command

   console.log("starting BLE discovery")
   await adapter.startDiscovery();

   // Initial scan
   await discoverRuuvis(adapter, mqttclient, config.get("scanrate"));

   // Retry can for those that are not yet initialized and have been set to error state
   setInterval(async () => {
      for(const ruuvi of ruuviTags)
      {
         if(!ruuvi.isInitialized && ruuvi.isInError) {
            console.log("retrying connection to " + ruuvi.name)
            ruuvi.initRuuviTag(adapter)
         }
      }
   }, config.get("retryrate"));
}


if (require.main === module)
{
   main()
      .then(console.log)
      .catch(console.error)
}