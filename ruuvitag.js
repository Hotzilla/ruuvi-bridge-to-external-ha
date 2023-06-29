/*

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

Copyright (C) 2023 Tuukka Lindroos

*/

const EventEmitter = require('events')
const { ParseRuuvi } = require('./ruuvitagparser');

///
/// Class representing Ruuvi Tag
/// 
class RuuviTag extends EventEmitter {

    constructor(name, macAddress, connection) {
        super()
        this.name = name;
        this.macAddress = macAddress;
        this.connection = connection;

        this.lastSequenceNumber = 0;

        this.isInError = false;
        this.isInitialized = false;
        this.lastComm = null;
        this.sensorData = null;
    }

    async initRuuviTag(btadapter)
    {
        try {
            this.device = await btadapter.waitDevice(this.macAddress, this.connection.timeout);
         } catch(error) {
            console.error(`Ruuvi ${this.name} (${this.macAddress}) is not discovered. ${error}`);
            this.isInError = true;
            this.isInitialized = false;
            return false;
         }

         if(!await btadapter.isDiscovering()){
            console.log("BLE discovery stopped, starting it again")
            await btadapter.startDiscovery();
         }
         await this.refreshSensorData();
         this.isInitialized = true;

         setInterval(async () => {
            if(!await btadapter.isDiscovering()){
                console.log("BLE discovery stopped, starting it again")
                await btadapter.startDiscovery();
             }
            await this.refreshSensorData();
         }, this.connection.scanrate);
         return true;
    }

    async refreshSensorData()
    {
        if(this.lastComm != null && new Date() - this.lastComm > 40000)
            console.log("warning: long time between communication");

        const rawmanu = await this.device.getManufacturerData();
        if(!rawmanu.hasOwnProperty("1177") || !rawmanu["1177"].hasOwnProperty("value"))
            throw new Error("Device manufacturer data is not valid!");

        //const manufacturer = rawmanu["1177"]["signature"];
        const manufacturerData = rawmanu["1177"]["value"];
        const data = manufacturerData;
        const newData = ParseRuuvi(data);

        if(this.lastSequenceNumber == 0)
        {
            // first contact
            this.emit('connected', this)
        }

        if(this.lastSequenceNumber != newData.seq)
        {
            this.lastSequenceNumber = newData.seq;
            this.prevComm = this.lastComm;
            this.lastComm = new Date();

            // value has updated
            newData.name = this.name;
            this.sensorData = newData;
            this.emit('updated', this, this.sensorData)
        }
    }
}

module.exports = RuuviTag;