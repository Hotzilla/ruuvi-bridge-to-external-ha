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
            return false;
         }

         await this.refreshSensorData();
         this.isInitialized = true;

         setInterval(async () => {
            await this.refreshSensorData();
         }, this.connection.scanrate);
         return true;
    }

    async refreshSensorData()
    {
        const rawmanu = await this.device.getManufacturerData();
        const manufacturer = rawmanu["1177"]["signature"];
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

            // value has updated
            newData.name = this.name;
            this.sensorData = newData;
            this.emit('updated', this.sensorData)
        }
    }
}

module.exports = RuuviTag;