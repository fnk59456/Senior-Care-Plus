### 300B Info (300B)
- **Topic**: `GWxxxx_Health`
- **JSON 格式**:
```json
{
   "content":"300B",
   "gateway id":137205,
   "MAC":"E0:0E:08:36:93:F8",
   "SOS":0,
   "hr":85,
   "SpO2":96,
   "bp syst":130,
   "bp diast":87,
   "skin temp":33.5,
   "room temp":24.5,
   "steps":3857,
   "sleep time":"22:46",
   "wake time":"7:13",
   "light sleep (min)":297,
   "deep sleep (min)":38,
   "move":26,
   "wear":1,
   "battery level":86,
   "serial no":1302
}
```
- **前端顯示內容**:
  - MAC
  - hr
  - SpO2
  - bp syst
  - bp diast
  - skin temp
  - room temp
  - steps
  - light sleep (min)
  - deep sleep (min)
  - battery level
- **後端顯示內容**:
  - MAC
  - hr
  - SpO2
  - bp syst
  - bp diast
  - skin temp
  - room temp
  - steps
  - light sleep (min)
  - deep sleep (min)
  - battery level

### 5V Plug Info (Anchor)
- **JSON 格式**:
```json
{
   "content":"5V status",
   "gateway id":137205,
   "node":"ANCHOR",
   "id":53397,
   "5V plugged":"yes",
   "serial no":7763
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION + UPDATE

### Anchor Change Config via BLE Failed (Anchor)
- **JSON 格式**:
```json
{
   "content":"config via ble change failed",
   "gateway id":137205,
   "name":"DWD095",
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### Anchor Change Config via BLE Response (Anchor)
- **JSON 格式**:
```json
{
   "content":"config via ble change success",
   "gateway id":137205,
   "node":"ANCHOR",
   "name":"DWD095",
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### Anchor Config (Anchor)
- **Topic**: `GWxxxx_AncConf`
- **JSON 格式**:
```json
{
   "content":"config",
   "gateway id":137205
   "node":"ANCHOR",
   "name":"DWD095",
   "id":53397,
   "fw update":0,
   "led":1,
   "ble":1,
   "initiator":1,
   "position":{
      "x":4.000000,
      "y":-3.750000,
      "z":1.000000
   }
}
```
- **前端顯示內容**:
  - name
  - id
- **後端顯示內容**:
  - name
  - id
  - fw update
  - led
  - ble
  - initiator
  - position
  - x
  - y
  - z

### Anchor Heartbeat (Anchor)
- **Topic**: `GWxxxx_Message`
- **JSON 格式**:
```json
{
   "content":"heartbeat",
   "gateway id":137205,
   "node":"ANCHOR",
   "name":"DWD095",
   "id":53397
}
```
- **前端顯示內容**: 無

### Anchor Info (Anchor)
- **JSON 格式**:
```json
{
   "content":"info",
   "gateway id":1612681207,
   "node":"ANCHOR",
   "id":5345,
   "fw ver":0.755,
   "battery level":89,
   "battery voltage":3.98,
   "bat detect time(1s)":300,
   "5V plugged":"yes",
   "uwb tx power changed":"no",
   "uwb tx power":{
      "boost norm(5.0~30.5dB)":8.5,
      "boost 500(5.0~30.5dB)":11,
      "boost 250(5.0~30.5dB)":13.5,
      "boost 125(5.0~30.5dB)":16
   },
   "serial no":7763
}
```
- **前端顯示內容**:
  - battery level
- **後端顯示內容**:
  - fw ver
  - battery level
  - battery voltage
  - bat detect time(1s)
  - 5V plugged
  - uwb tx power changed
  - uwb tx power
  - boost norm(5.0~30.5dB)
  - boost 500(5.0~30.5dB)
  - boost 250(5.0~30.5dB)
  - boost 125(5.0~30.5dB)

### Anchor Read Config via BLE Failed (Anchor)
- **JSON 格式**:
```json
{
   "content":"config via ble read failed",
   "gateway id":137205,
   "name":"DWD095",
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### Anchor Read Config via BLE Response (Anchor)
- **JSON 格式**:
```json
{
   "content":"config via ble",
   "gateway id":137205,
   "node":"ANCHOR",
   "UWB Network ID":4660,
   "name":"DWD095",
   "id":53397,
   "UWB Joined":"yes",
   "seat no.":5,
   "detected anchor":9,
   "fw update":0,
   "led":1,
   "ble":1,
   "initiator":1,
   "position":{
      "x":4.000000,
      "y":-3.750000,
      "z":1.000000
   },
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### Anchor Tx Power (Anchor)
- **Topic**: `GWxxxx_Message`
- **JSON 格式**:
```json
{
   "content":"tx power config",
   "gateway id":137205,
   "node":"ANCHOR",
   "id":23349,
   "boost norm(5.0~30.5dB)":8.5,
   "boost 500(5.0~30.5dB)":11,
   "boost 250(5.0~30.5dB)":13.5,
   "boost 125(5.0~30.5dB)":16,
   "default value":{
      "boost norm(5.0~30.5dB)":8.5,
      "boost 500(5.0~30.5dB)":11,
      "boost 250(5.0~30.5dB)":13.5,
      "boost 125(5.0~30.5dB)":16
   },
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - UPDATE

### Anchor pos changed (Anchor)
- **JSON 格式**:
```json
{
   "content":"pos changed",
   "gateway id":137205,
   "node":"ANCHOR",
   "id":53397,
   "position":{
      "x":4.000000,
      "y":-3.750000,
      "z":1.000000
   },
   "serial no":7763
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION + UPDATE

### Diaper DV1 Info (Diaper DV1)
- **Topic**: `GWxxxx_Health`
- **JSON 格式**:
```json
{
   "content":"diaper DV1",
   "gateway id":137205,
   "MAC":"E0:0E:08:36:93:F8",
   "name":"DV1_3693F8",
   "fw ver":1.01,
   "temp":33.5,
   "humi":57.2,
   "button":0,
   "mssg idx":143,
   "ack":0,
   "battery level":86,
   "serial no":1302
}
```
- **前端顯示內容**:
  - MAC =MAC地址
  - temp = 溫度
  - humi =濕度
  - battery level 電量%
- **後端顯示內容**:
  - MAC
  - name
  - fw ver
  - temp
  - humi
  - battery level

### 5V Plug Info (Gateway)
- **JSON 格式**:
```json
{
   "content":"5V status",
   "gateway id":137205,
   "node":"GW",
   "id":53397,
   "5V plugged":"yes",
   "serial no":7763
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION + UPDATE

### AnchorConfig Ack (Gateway)
- **Topic**: `GWxxxx_Ack`
- **JSON 格式**:
```json
{
   "content":"ack from gateway",
   "gateway id":137205,
   "command":"configChange",
   "node":"ANCHOR",
   "id":23349,
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### AnchorConfig Fail (Gateway)
- **Topic**: `GWxxxx_Ack`
- **JSON 格式**:
```json
{
   "content":"fail from gateway",
   "gateway id":137205,
   "command":"configChange",
   "node":"ANCHOR",
   "id":23349,
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### BLE scanned node (Gateway)
- **JSON 格式**:
```json
{
   "content":"ble scanned node",
   "gateway id":137205,
   "ANCHOR":{
      "DWD095":{
         "initiator":"yes",
         "UWB":"active"
      },
      "DW4C0B":{
         "initiator":"no",
         "UWB":"passive"
      },
      "DW8326":{
         "initiator":"no",
         "UWB":"active"
      }
   },
   "TAG":{
      "DW1D00":{
         "UWB":"active"
      },
      "DW1023":{
         "UWB":"active"
      }
   },
   "GW":{
      "UWB_Gateway1234":{
         "UWB HW Com OK":"yes",
         "UWB Joined":"yes",
         "UWB Network ID":4660,
         "AP Connected":"yes",
         "SSID":"Wifi_Office_1",
         "MQTT connected":"yes"
      },
      "UWB_GatewayABCD":{
         "UWB HW Com OK":"yes",
         "UWB Joined":"yes",
         "UWB Network ID":4660,
         "AP Connected":"no",
         "SSID":"Wifi_Office_2",
         "MQTT connected":"no"
      }
   },
   "serial no":1725
}
```
- **前端顯示內容**: 無

### Gateway Heartbeat (Gateway)
- **Topic**: `GWxxxx_Message`
- **JSON 格式**:
```json
{
   "content":"heartbeat",
   "gateway id":137205,
   "node":"GW",
   "name":"GW17F5",
   "fw ver":"1.0",
   "fw serial":100,
   "UWB HW Com OK":"yes",
   "UWB Joined":"yes",
   "UWB Network ID":4660,
   "connected AP":"Wifi_Office",
   "anchor cfg stack":15
}
```
- **前端顯示內容**: 無

### Gateway Power On/Reset done (Gateway)
- **Topic**: `UWB_Gateway`
- **JSON 格式**:
```json
{
   "content":"gateway reset done",
   "gateway id":137205,
   "name":"GW17F5",
   "fw ver":"1.0",
   "fw serial":100
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### Gateway Tx Power (Gateway)
- **Topic**: `GWxxxx_Message`
- **JSON 格式**:
```json
{
   "content":"gateway tx power config",
   "gateway id":137205,
   "name":"GW17F5",
   "boost norm(5.0~30.5dB)":8.5,
   "boost 500(5.0~30.5dB)":11,
   "boost 250(5.0~30.5dB)":13.5,
   "boost 125(5.0~30.5dB)":16,
   "default value":{
      "boost norm(5.0~30.5dB)":8.5,
      "boost 500(5.0~30.5dB)":11,
      "boost 250(5.0~30.5dB)":13.5,
      "boost 125(5.0~30.5dB)":16
   },
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - UPDATE

### Gateway connect to MQTT (Gateway)
- **JSON 格式**:
```json
{
   "content":"MQTT connected",
   "gateway id":137205,
   "name":"GW17F5",
   "serial no":7763
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### Gateway connect to WiFi (Gateway)
- **JSON 格式**:
```json
{
   "content":"WiFi connected",
   "gateway id":137205,
   "name":"GW17F5",
   "serial no":7763
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### GwResetRequest Ack (Gateway)
- **Topic**: `GWxxxx_Ack`
- **JSON 格式**:
```json
{
   "content":"ack from gateway",
   "gateway id":137205,
   "command":"gateway reset request",
   "node":"GW",
   "id":0,
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### GwSetDiscardIOTDataTimeRequest Ack (Gateway)
- **Topic**: `GWxxxx_Ack`
- **JSON 格式**:
```json
{
   "content":"ack from gateway",
   "gateway id":137205,
   "command":"discard IOT data time(0.1s)",
   "node":"GW",
   "id":0,
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### NewFirmware Ack (Gateway)
- **Topic**: `GWxxxx_Ack`
- **JSON 格式**:
```json
{
   "content":"ack from gateway",
   "gateway id":137205,
   "command":"new fw notify",
   "response":"OK",
   "node":"GW",
   "id":0,
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### QoS Ack (Gateway)
- **Topic**: `GWxxxx_Ack`
- **JSON 格式**:
```json
{
   "content":"ack from gateway",
   "gateway id":137205,
   "command":"QoS request",
   "node":"GW",
   "id":0,
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### SSID info to others gateway via BLE Failed (Gateway)
- **JSON 格式**:
```json
{
   "content":"gw ssidChange via ble failed",
   "gateway id":137205,
   "name":"UWB_Gateway5B70",
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### SSID info to others gateway via BLE Success (Gateway)
- **JSON 格式**:
```json
{
   "content":"gw ssidChange via ble success",
   "gateway id":137205,
   "name":"UWB_Gateway5B70",
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### TagCfgRequest Ack (Gateway)
- **Topic**: `GWxxxx_Ack`
- **JSON 格式**:
```json
{
   "content":"ack from gateway",
   "gateway id":137205,
   "command":"tag cfg request",
   "node":"GW",
   "id":0,
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### TagCommand Ack (Gateway)
- **Topic**: `GWxxxx_Ack`
- **JSON 格式**:
```json
{
   "content":"ack from gateway",
   "gateway id":137205,
   "command":"downlink alert",
   "node":"TAG",
   "id":23349,
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### TagConfig Ack (Gateway)
- **Topic**: `GWxxxx_Ack`
- **JSON 格式**:
```json
{
   "content":"ack from gateway",
   "gateway id":137205,
   "command":"configChange",
   "node":"TAG",
   "id":23349,
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### TagImage Ack (Gateway)
- **Topic**: `GWxxxx_Ack`
- **JSON 格式**:
```json
{
   "content":"ack from gateway",
   "gateway id":137205,
   "command":"image",
   "node":"TAG",
   "id":23349,
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### TagMessage Ack (Gateway)
- **Topic**: `GWxxxx_Ack`
- **JSON 格式**:
```json
{
   "content":"ack from gateway",
   "gateway id":137205,
   "command":"message",
   "node":"TAG",
   "id":23349,
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### TagQRcode Ack (Gateway)
- **Topic**: `GWxxxx_Ack`
- **JSON 格式**:
```json
{
   "content":"ack from gateway",
   "gateway id":137205,
   "command":"qr code",
   "node":"TAG",
   "id":23349,
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### Topic Info (Gateway)
- **Topic**: `UWB_Gateway`
- **JSON 格式**:
```json
{
   "content":"gateway topic",
   "gateway id":137205,
   "name":"GW17F5",
   "fw ver":"1.0",
   "fw serial":100,
   "UWB HW Com OK":"yes",
   "UWB Joined":"yes",
   "UWB Network ID":4660,
   "connected AP":"Wifi_Office",
   "Wifi tx power(dBm)":13,
   "set Wifi max tx power(dBm)":20,
   "ble scan time":5,
   "ble scan pause time":20,
   "300B update time":20,
   "diaper DV1 update time":20,
   "battery voltage":3.98,
   "5V plugged":"yes",
   "uwb tx power changed":"no",
   "uwb tx power":{
      "boost norm(5.0~30.5dB)":8.5,
      "boost 500(5.0~30.5dB)":11,
      "boost 250(5.0~30.5dB)":13.5,
      "boost 125(5.0~30.5dB)":16
   },
   "uwb tx power change every tag":"yes",
   "tag uwb tx power":{
      "boost norm(5.0~30.5dB)":8.5,
      "boost 500(5.0~30.5dB)":11,
      "boost 250(5.0~30.5dB)":13.5,
      "boost 125(5.0~30.5dB)":16
   },
   "uwb tx power change every anchor":"yes",
   "anc uwb tx power":{
      "boost norm(5.0~30.5dB)":8.5,
      "boost 500(5.0~30.5dB)":11,
      "boost 250(5.0~30.5dB)":13.5,
      "boost 125(5.0~30.5dB)":16
   },
   "tag config pub":"yes",
   "pub topic":{
      "anchor config":"GW17F5_AncConf",
      "tag config":"GW17F5_TagConf",
      "location":"GW17F5_Loca",
      "message":"GW17F5_Message",
      "ack from node":"GW17F5_Ack",
      "health":"GW17F5_Health"
   },
   "sub topic":{
      "downlink":"GW17F5_Dwlink"
   },
   "discard IOT data time(0.1s)":30,
   "discarded IOT data":38,
   "total discarded data":65,
   "1st sync":"2023-338 11:05:37.00",
   "last sync":"2023-339 02:38:17.00",
   "current":"2023-339 02:39:10.20"
}
```
- **前端顯示內容**:
  - gateway id
  - name
- **後端顯示內容**:
  - gateway id
  - name
  - fw ver
  - UWB Joined
  - UWB Network ID
  - connected AP
  - battery voltage
  - 5V plugged
  - uwb tx power
  - boost norm(5.0~30.5dB)
  - boost 500(5.0~30.5dB)
  - boost 250(5.0~30.5dB)
  - boost 125(5.0~30.5dB)
  - tag config pub

### Fall Info (Pedo)
- **Topic**: `GWxxxx_Health`
- **JSON 格式**:
```json
{
   "content":"motion info fall",
   "gateway id":1612681207,
   "node":"TAG",
   "id":5345,
   "happen":"yes",
   "stamp(sec)":3472,
   "serial no":1302
}
```
- **前端顯示內容**:
  - NOTIFICATION
- **後端顯示內容**:
  - id
  - happen
  - stamp(sec)

### Nap Info (Pedo)
- **Topic**: `GWxxxx_Health`
- **JSON 格式**:
```json
{
   "content":"motion info nap",
   "gateway id":1612681207,
   "node":"TAG",
   "id":5345,
   "slot amount":5,
   "slot 1":"0518 14:03",
   "length 1(min)":23,
   "slot 2":"0518 15:41",
   "length 2(min)":8,
   "slot 3":"0518 17:02",
   "length 3(min)":11,
   "slot 4":"0518 18:13",
   "length 4(min)":17,
   "slot 5":"0518 18:31",
   "length 5(min)":19,
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - id
  - slot amount
  - slot 1
  - length 1(min)
  - slot 2
  - length 2(min)
  - slot 3
  - length 3(min)
  - slot 4
  - length 4(min)
  - slot 5
  - length 5(min)

### SEDEN Info (Pedo)
- **Topic**: `GWxxxx_Health`
- **JSON 格式**:
```json
{
   "content":"motion info SEDEN",
   "gateway id":1612681207,
   "node":"TAG",
   "id":5345,
   "happen":"yes",
   "stamp(sec)":3472,
   "serial no":1302
}
```
- **前端顯示內容**:
  - NOTIFICATION
- **後端顯示內容**:
  - id
  - happen
  - stamp(sec)

### Sleep Info (Pedo)
- **Topic**: `GWxxxx_Health`
- **JSON 格式**:
```json
{
   "content":"motion info sleep",
   "gateway id":1612681207,
   "node":"TAG",
   "id":5345,
   "start time":"0518 14:03",
   "end time":"0518 14:03",
   "total time(min)":443,
   "shallow time(min)":369,
   "deep time(min)":27,
   "awake time(min)":36,
   "REM time(min)":11,
   "sleep quality%":76,
   "deep quality%":58,
   "breath quality%":57,
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - id
  - start time
  - end time
  - total time(min)
  - shallow time(min)
  - deep time(min)
  - awake time(min)
  - REM time(min)
  - sleep quality%
  - deep quality%
  - breath quality%

### Step Info (Pedo)
- **Topic**: `GWxxxx_Health`
- **JSON 格式**:
```json
{
   "content":"motion info step",
   "gateway id":1612681207,
   "node":"TAG",
   "id":5345,
   "step":4692,
   "distance(m)":2589,
   "calorie(Kcal)":247,
   "serial no":1302
}
```
- **前端顯示內容**:
  - id
  - step
  - distance(m)
  - calorie(Kcal)
- **後端顯示內容**:
  - id
  - step
  - distance(m)
  - calorie(Kcal)

### System On Info (Pedo)
- **Topic**: `GWxxxx_Health`
- **JSON 格式**:
```json
{
   "content":"motion info system on",
   "gateway id":1612681207,
   "node":"TAG",
   "id":5345,
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### Fall Detection (Tag)
- **JSON 格式**:
```json
{
   "content":"info",
   "gateway id":1612681207,
   "node":"TAG",
   "id":5345,
   "fall detect level":1,
   "serial no":7763
}
```
- **前端顯示內容**:
  - NOTIFICATION
- **後端顯示內容**:
  - NOTIFICATION

### Key Status (Tag)
- **JSON 格式**:
```json
{
   "content":"info",
   "gateway id":1612681207,
   "node":"TAG",
   "id":5345,
   "key status":1,
   "serial no":7763
}
```
- **前端顯示內容**:
  - NOTIFICATION
- **後端顯示內容**:
  - NOTIFICATION

### Tag Change Config via BLE Failed (Tag)
- **JSON 格式**:
```json
{
   "content":"config via ble change failed",
   "gateway id":137205,
   "name":"DW5B35",
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### Tag Change Config via BLE Response (Tag)
- **JSON 格式**:
```json
{
   "content":"config via ble change success",
   "gateway id":137205,
   "node":"TAG",
   "name":"DW5B35",
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### Tag Config (Tag)
- **Topic**: `GWxxxx_TagConf`
- **JSON 格式**:
```json
{
   "content":"config",
   "gateway id":137205
   "node":"TAG",
   "name":"DW5B35",
   "id":23349,
   "fw update":0,
   "led":1,
   "ble":0,
   "location engine":1,
   "responsive mode(0=On,1=Off)":0,
   "stationary detect":0,
   "nominal udr(hz)":10,
   "stationary udr(hz)":1
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - name
  - id
  - fw update
  - led
  - ble
  - location engine
  - responsive mode(0=On
  - 1=Off)
  - stationary detect
  - nominal udr(hz)
  - stationary udr(hz)

### Tag Info (Tag)
- **JSON 格式**:
```json
{
   "content":"info",
   "gateway id":1612681207,
   "node":"TAG",
   "id":5345,
   "fw ver":0.755,
   "battery level":89,
   "battery voltage":3.98,
   "led on time(1ms)":20,
   "led off time(1ms)":10000,
   "bat detect time(1s)":300,
   "5V plugged":"yes",
   "uwb tx power changed":"no",
   "uwb tx power":{
      "boost norm(5.0~30.5dB)":8.5,
      "boost 500(5.0~30.5dB)":11,
      "boost 250(5.0~30.5dB)":13.5,
      "boost 125(5.0~30.5dB)":16
   },
   "serial no":7763
}
```
- **前端顯示內容**:
  - battery level
- **後端顯示內容**:
  - fw ver
  - battery level
  - battery voltage
  - led on time(1ms)
  - led off time(1ms)
  - bat detect time(1s)
  - 5V plugged
  - uwb tx power changed
  - uwb tx power
  - boost norm(5.0~30.5dB)
  - boost 500(5.0~30.5dB)
  - boost 250(5.0~30.5dB)
  - boost 125(5.0~30.5dB)

### Tag Location (Tag)
- **Topic**: `GWxxxx_Loca`
- **JSON 格式**:
```json
{
   "content":"location",
   "gateway id":137205,
   "node":"TAG",
   "id":23349,
   "position":{
      "x":1.500000,
      "y":-2.300000,
      "z":0.800000,
      "quality":89
   },
   "time":"2023-011 14:15:11.67",
   "serial no":785
}
```
- **前端顯示內容**:
  - UPDATE
- **後端顯示內容**:
  - UPDATE

### Tag Read Config via BLE Failed (Tag)
- **JSON 格式**:
```json
{
   "content":"config via ble read failed",
   "gateway id":137205,
   "name":"DW5B35",
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### Tag Read Config via BLE Response (Tag)
- **JSON 格式**:
```json
{
   "content":"config via ble",
   "gateway id":137205,
   "node":"TAG",
   "UWB Network ID":4660,
   "name":"DW5B35",
   "id":23349,
   "fw update":0,
   "led":0,
   "ble":1,
   "location engine":1,
   "responsive mode(0=On,1=Off)":0,
   "stationary detect":0,
   "nominal udr(hz)":10,
   "stationary udr(hz)":1,
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - NOTIFICATION

### Tag Tx Power (Tag)
- **Topic**: `GWxxxx_Message`
- **JSON 格式**:
```json
{
   "content":"tx power config",
   "gateway id":137205,
   "node":"TAG",
   "id":23349,
   "boost norm(5.0~30.5dB)":8.5,
   "boost 500(5.0~30.5dB)":11,
   "boost 250(5.0~30.5dB)":13.5,
   "boost 125(5.0~30.5dB)":16,
   "default value":{
      "boost norm(5.0~30.5dB)":8.5,
      "boost 500(5.0~30.5dB)":11,
      "boost 250(5.0~30.5dB)":13.5,
      "boost 125(5.0~30.5dB)":16
   },
   "serial no":1302
}
```
- **前端顯示內容**: 無
- **後端顯示內容**:
  - UPDATE
