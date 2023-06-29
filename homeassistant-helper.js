exports.HomeAssistantDiscoveryJSON = function(type, tagName)
{
    if(type == "temperature")
    {
        return {
            name: `${tagName}_temperature`,
            unit_of_measurement: '°C',
            icon: 'mdi:temperature-celsius',
            device_class: 'temperature',
            value_template: '{{ value_json.temperature }}',
            state_topic: `homeassistant/sensor/${tagName}/state`,
            availability_topic: `homeassistant/sensor/bridge/state`
         };
    } else if(type == "humidity")
    {
        return {
            name: `${tagName}_humidity`,
            unit_of_measurement: '%',
            icon: 'mdi:water-percent',
            device_class: 'humidity',
            value_template: '{{ value_json.humidity }}',
            state_topic: `homeassistant/sensor/${tagName}/state`,
            availability_topic: `homeassistant/sensor/bridge/state`
         };
    } else if(type == "pressure")
    {
        return {
            name: `${tagName}_pressure`,
            unit_of_measurement: 'hPa',
            icon: 'mdi:car-brake-low-pressure',
            value_template: '{{ value_json.pressure }}',
            state_topic: `homeassistant/sensor/${tagName}/state`,
            availability_topic: `homeassistant/sensor/bridge/state`
         };
    } else if(type == "battery")
    {
        return {
            name: `${tagName.name}_battery`,
            unit_of_measurement: 'V',
            icon: 'mdi:battery',
            value_template: '{{ value_json.voltage }}',
            state_topic: `homeassistant/sensor/${tagName.name}/state`,
            availability_topic: `homeassistant/sensor/bridge/state`
         };
    }  else if(type == "movement")
    {
        return {
            name: `${tagName.name}_movement`,
            unit_of_measurement: 'kpl',
            icon: 'mdi:go-kart-track',
            value_template: '{{ value_json.movecount }}',
            state_topic: `homeassistant/sensor/${tagName.name}/state`,
            availability_topic: `homeassistant/sensor/bridge/state`
         };
    }

}