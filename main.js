/*

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

Copyright (C) 2023 Tuukka Lindroos

*/

const { createBluetooth } = require('node-ble');
const config = require('config');
const { ParseRuuvi } = require('./ruuvitagparser');
var mqtt = require('mqtt');

let latestSequencePerDevice = new Map();

async function discoverRuuvis(adapter, mqttclient, scanrate)
{
   const ruuviTags = config.get("ruuvitags");

   for (const ruuviTag of ruuviTags) {
      let device = null;
      try {
         device = await adapter.waitDevice(ruuviTag.mac); //await adapter.getDevice(ruuviTag.mac);
      } catch(error) {
         console.error(`Ruuvi ${ruuviTag.name} (${ruuviTag.mac}) is not discovered. ${error}`)
         continue;
      }

      setInterval(async () => {
         const rawmanu = await device.getManufacturerData();
         const manufacturer = rawmanu["1177"]["signature"];
         const manufacturerData = rawmanu["1177"]["value"];
         const data = manufacturerData;
         sensorData = ParseRuuvi(data);

         if(!latestSequencePerDevice.has(ruuviTag.mac))
         {
            console.log("First contact with ruuvi tag: " + ruuviTag.name + " (" + ruuviTag.mac + ")");

            const temperatureHADiscovery = {
               name: `${ruuviTag.name}_temperature`,
               unit_of_measurement: '°C',
               icon: 'mdi:temperature-celsius',
               device_class: 'temperature',
               value_template: '{{ value_json.temperature }}',
               state_topic: `homeassistant/sensor/${ruuviTag.name}/state`,
               availability_topic: `homeassistant/sensor/bridge/state`
            };
            mqttclient.publish(`homeassistant/sensor/${ruuviTag.name}/temperature/config`, JSON.stringify(temperatureHADiscovery), { retain: true }, null);
            
            const humidityHADiscovery = {
               name: `${ruuviTag.name}_humidity`,
               unit_of_measurement: '%',
               icon: 'mdi:water-percent',
               device_class: 'humidity',
               value_template: '{{ value_json.humidity }}',
               state_topic: `homeassistant/sensor/${ruuviTag.name}/state`,
               availability_topic: `homeassistant/sensor/bridge/state`
            };
            mqttclient.publish(`homeassistant/sensor/${ruuviTag.name}/humidity/config`, JSON.stringify(humidityHADiscovery), { retain: true }, null);

            const pressureHADiscovery = {
               name: `${ruuviTag.name}_pressure`,
               unit_of_measurement: 'hPa',
               icon: 'mdi:car-brake-low-pressure',
               value_template: '{{ value_json.pressure }}',
               state_topic: `homeassistant/sensor/${ruuviTag.name}/state`,
               availability_topic: `homeassistant/sensor/bridge/state`
            };
            mqttclient.publish(`homeassistant/sensor/${ruuviTag.name}/pressure/config`, JSON.stringify(pressureHADiscovery), { retain: true }, null);

            const batteryHADiscovery = {
               name: `${ruuviTag.name}_battery`,
               unit_of_measurement: 'V',
               icon: 'mdi:battery',
               value_template: '{{ value_json.voltage }}',
               state_topic: `homeassistant/sensor/${ruuviTag.name}/state`,
               availability_topic: `homeassistant/sensor/bridge/state`
            };
            mqttclient.publish(`homeassistant/sensor/${ruuviTag.name}/battery/config`, JSON.stringify(batteryHADiscovery), { retain: true }, null);

            latestSequencePerDevice.set(ruuviTag.mac, 0)
         } 

         // Check if the sequence has been updated
         if(latestSequencePerDevice.get(ruuviTag.mac) != sensorData.seq)
         {
            latestSequencePerDevice.set(ruuviTag.mac, sensorData.seq);

            sensorData.name = ruuviTag.name;
            mqttclient.publish(`homeassistant/sensor/${ruuviTag.name}/state`, JSON.stringify(sensorData));
            console.log(JSON.stringify(sensorData));
         }
      }, scanrate)
   }
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
   await adapter.startDiscovery()

   await discoverRuuvis(adapter, mqttclient, config.get("scanrate"));
   //runner(adapter, mqttclient, config.get("scanrate"));
   // Main loop
   /*setInterval(async () => {
      try {
         await latestRuuviDiscoveries(adapter, mqttclient);
      } catch (error) {
         console.error("Error when fetching measurements from ruuvi tags", error);
      }
   }, config.get("scanrate"));  // Runs every x seconds*/
}

async function runner(adapter, mqttclient, scanrate) {
   try {
      await latestRuuviDiscoveries(adapter, mqttclient, scanrate);
   } catch (error) {
       console.error("Error when fetching measurements from ruuvi tags", error);
   } finally {
       // Schedule the next run
       setTimeout(() => runner(adapter, mqttclient, scanrate), scanrate); // Runs 5 seconds after the async function completes
   }
}



if (require.main === module)
{
   main()
      .then(console.log)
      .catch(console.error)
}