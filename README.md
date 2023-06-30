/etc/dbus-1/system.d/node-ble.conf

```xml
<!DOCTYPE busconfig PUBLIC "-//freedesktop//DTD D-BUS Bus Configuration 1.0//EN"
  "http://www.freedesktop.org/standards/dbus/1.0/busconfig.dtd">
<busconfig>
  <policy user="%userid%">
   <allow own="org.bluez"/>
    <allow send_destination="org.bluez"/>
    <allow send_interface="org.bluez.GattCharacteristic1"/>
    <allow send_interface="org.bluez.GattDescriptor1"/>
    <allow send_interface="org.freedesktop.DBus.ObjectManager"/>
    <allow send_interface="org.freedesktop.DBus.Properties"/>
  </policy>
</busconfig>
```

sudo cp systemd-ruuvi-bridge-to-external-ha.service /etc/systemd/system/
sudo nano /etc/systemd/system/systemd-ruuvi-bridge-to-external-ha.service
sudo systemctl daemon-reload
sudo systemctl start systemd-ruuvi-bridge-to-external-ha.service
sudo systemctl enable systemd-ruuvi-bridge-to-external-ha.service
sudo systemctl restart systemd-ruuvi-bridge-to-external-ha.service
sudo systemctl status systemd-ruuvi-bridge-to-external-ha.service