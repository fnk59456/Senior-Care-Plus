# 設備唯一辨識欄位與監聽 Topic 明細
（依現有 Excel JSON 解析）

## 300B
### content: `300B`
- **監聽 Topic**: `GWxxxx_Health`
- **表格訊號名稱 (A欄)**: 300B Info
- **可能的唯一辨識欄位**: gateway id, MAC, serial no
- **建議 device_uid 規則**: `300B:<MAC>`
- **所有鍵值**: content, gateway id, MAC, SOS, hr, SpO2, bp syst, bp diast, skin temp, room temp, steps, sleep time, wake time, light sleep (min), deep sleep (min), move, wear, battery level, serial no
- **JSON 範例**:
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


## Diaper DV1
### content: `diaper DV1`
- **監聽 Topic**: `GWxxxx_Health`
- **表格訊號名稱 (A欄)**: Diaper DV1 Info
- **可能的唯一辨識欄位**: gateway id, MAC, mssg idx, serial no
- **建議 device_uid 規則**: `DIAPER:<MAC>`
- **所有鍵值**: content, gateway id, MAC, name, fw ver, temp, humi, button, mssg idx, ack, battery level, serial no
- **JSON 範例**:
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


## Pedo
### content: `motion info SEDEN`
- **監聽 Topic**: `GWxxxx_Health`
- **表格訊號名稱 (A欄)**: SEDEN Info
- **可能的唯一辨識欄位**: gateway id, id, serial no
- **建議 device_uid 規則**: `PEDO:<id>`
- **所有鍵值**: content, gateway id, node, id, happen, stamp(sec), serial no
- **JSON 範例**:
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

### content: `motion info fall`
- **監聽 Topic**: `GWxxxx_Health`
- **表格訊號名稱 (A欄)**: Fall Info
- **可能的唯一辨識欄位**: gateway id, id, serial no
- **建議 device_uid 規則**: `PEDO:<id>`
- **所有鍵值**: content, gateway id, node, id, happen, stamp(sec), serial no
- **JSON 範例**:
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

### content: `motion info nap`
- **監聽 Topic**: `GWxxxx_Health`
- **表格訊號名稱 (A欄)**: Nap Info
- **可能的唯一辨識欄位**: gateway id, id, serial no
- **建議 device_uid 規則**: `PEDO:<id>`
- **所有鍵值**: content, gateway id, node, id, slot amount, slot 1, length 1(min), slot 2, length 2(min), slot 3, length 3(min), slot 4, length 4(min), slot 5, length 5(min), serial no
- **JSON 範例**:
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

### content: `motion info sleep`
- **監聽 Topic**: `GWxxxx_Health`
- **表格訊號名稱 (A欄)**: Sleep Info
- **可能的唯一辨識欄位**: gateway id, id, serial no
- **建議 device_uid 規則**: `PEDO:<id>`
- **所有鍵值**: content, gateway id, node, id, start time, end time, total time(min), shallow time(min), deep time(min), awake time(min), REM time(min), sleep quality%, deep quality%, breath quality%, serial no
- **JSON 範例**:
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

### content: `motion info step`
- **監聽 Topic**: `GWxxxx_Health`
- **表格訊號名稱 (A欄)**: Step Info
- **可能的唯一辨識欄位**: gateway id, id, serial no
- **建議 device_uid 規則**: `PEDO:<id>`
- **所有鍵值**: content, gateway id, node, id, step, distance(m), calorie(Kcal), serial no
- **JSON 範例**:
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

### content: `motion info system on`
- **監聽 Topic**: `GWxxxx_Health`
- **表格訊號名稱 (A欄)**: System On Info
- **可能的唯一辨識欄位**: gateway id, id, serial no
- **建議 device_uid 規則**: `PEDO:<id>`
- **所有鍵值**: content, gateway id, node, id, serial no
- **JSON 範例**:
```json
{
   "content":"motion info system on",
   "gateway id":1612681207,
   "node":"TAG",
   "id":5345,
   "serial no":1302
}
```


## Tag
### content: `config`
- **監聽 Topic**: `GWxxxx_TagConf`
- **表格訊號名稱 (A欄)**: Tag Config
- **可能的唯一辨識欄位**: gateway id, id
- **建議 device_uid 規則**: `TAG:<id>`
- **所有鍵值**: content, gateway id, node, name, id, fw update, led, ble, location engine, responsive mode(0=On,1=Off), stationary detect, nominal udr(hz), stationary udr(hz)
- **JSON 範例**:
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

### content: `config via ble`
- **監聽 Topic**: `None`
- **表格訊號名稱 (A欄)**: Tag Read Config via BLE Response
- **可能的唯一辨識欄位**: gateway id, UWB Network ID, id, serial no
- **建議 device_uid 規則**: `TAG:<id>`
- **所有鍵值**: content, gateway id, node, UWB Network ID, name, id, fw update, led, ble, location engine, responsive mode(0=On,1=Off), stationary detect, nominal udr(hz), stationary udr(hz), serial no
- **JSON 範例**:
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

### content: `config via ble change failed`
- **監聽 Topic**: `None`
- **表格訊號名稱 (A欄)**: Tag Change Config via BLE Failed
- **可能的唯一辨識欄位**: gateway id, serial no
- **建議 device_uid 規則**: `TAG:<serial no>`
- **所有鍵值**: content, gateway id, name, serial no
- **JSON 範例**:
```json
{
   "content":"config via ble change failed",
   "gateway id":137205,
   "name":"DW5B35",
   "serial no":1302
}
```

### content: `config via ble change success`
- **監聽 Topic**: `None`
- **表格訊號名稱 (A欄)**: Tag Change Config via BLE Response
- **可能的唯一辨識欄位**: gateway id, serial no
- **建議 device_uid 規則**: `TAG:<serial no>`
- **所有鍵值**: content, gateway id, node, name, serial no
- **JSON 範例**:
```json
{
   "content":"config via ble change success",
   "gateway id":137205,
   "node":"TAG",
   "name":"DW5B35",
   "serial no":1302
}
```

### content: `config via ble read failed`
- **監聽 Topic**: `None`
- **表格訊號名稱 (A欄)**: Tag Read Config via BLE Failed
- **可能的唯一辨識欄位**: gateway id, serial no
- **建議 device_uid 規則**: `TAG:<serial no>`
- **所有鍵值**: content, gateway id, name, serial no
- **JSON 範例**:
```json
{
   "content":"config via ble read failed",
   "gateway id":137205,
   "name":"DW5B35",
   "serial no":1302
}
```

### content: `info`
- **監聽 Topic**: `None`
- **表格訊號名稱 (A欄)**: Tag Info
- **可能的唯一辨識欄位**: gateway id, id, serial no
- **建議 device_uid 規則**: `TAG:<id>`
- **所有鍵值**: content, gateway id, node, id, fw ver, battery level, battery voltage, led on time(1ms), led off time(1ms), bat detect time(1s), 5V plugged, uwb tx power changed, uwb tx power, boost norm(5.0~30.5dB), boost 500(5.0~30.5dB), boost 250(5.0~30.5dB), boost 125(5.0~30.5dB), serial no
- **JSON 範例**:
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

### content: `location`
- **監聽 Topic**: `GWxxxx_Loca`
- **表格訊號名稱 (A欄)**: Tag Location
- **可能的唯一辨識欄位**: gateway id, id, serial no
- **建議 device_uid 規則**: `TAG:<id>`
- **所有鍵值**: content, gateway id, node, id, position, x, y, z, quality, time, serial no
- **JSON 範例**:
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

### content: `tx power config`
- **監聽 Topic**: `GWxxxx_Message`
- **表格訊號名稱 (A欄)**: Tag Tx Power
- **可能的唯一辨識欄位**: gateway id, id, serial no
- **建議 device_uid 規則**: `TAG:<id>`
- **所有鍵值**: content, gateway id, node, id, boost norm(5.0~30.5dB), boost 500(5.0~30.5dB), boost 250(5.0~30.5dB), boost 125(5.0~30.5dB), default value, serial no
- **JSON 範例**:
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

