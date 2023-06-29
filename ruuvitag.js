/*

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

Copyright (C) 2023 Tuukka Lindroos

*/

const EventEmitter = require('events')

///
/// Class representing Ruuvi Tag
/// 
class RuuviTag extends EventEmitter {
    constructor(name, macAddress) {
        this.name = name;
        this.macAddress = macAddress;

        this.lastSequenceNumber = 0;

        this.isInError = false;
        this.isInitialized = false;
        this.lastComm = null;
        this.sensorData = null;
    }

    async initRuuviTag(btadapter)
    {
        try {
            this.device = await btadapter.waitDevice(this.macAddress);
         } catch(error) {
            console.error(`Ruuvi ${this.name} (${this.macAddress}) is not discovered. ${error}`);
            this.isInError = true;
            return false;
         }

         await refreshSensorData();
         this.isInitialized = true;

         setInterval(async () => {
            await refreshSensorData();
         }, 5000);
         return true;
    }

    async refreshSensorData()
    {
        const rawmanu = await this.device.getManufacturerData();
        const manufacturer = rawmanu["1177"]["signature"];
        const manufacturerData = rawmanu["1177"]["value"];
        const data = manufacturerData;
        newData = ParseRuuvi(data);

        if(this.lastSequenceNumber == 0)
        {
            // first contact
            this.emit('connected', value)
        }

        if(this.lastSequenceNumber != newData.seq)
        {
            // value has updated
            newData.name = this.name;
            this.sensorData = newData;
            this.emit('updated', this.sensorData)
        }
    }
}