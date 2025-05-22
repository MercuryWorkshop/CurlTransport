# CurlTransport
This is a transport for [bare-mux](https://github.com/MercuryWorkshop/bare-mux) using [libcurl.js](https://github.com/ading2210/libcurl.js). It allows you to encrypt the traffic on your web proxy using TLS and Wisp. 

## Usage:
Here is a basic example of using CurlTransport. The Wisp proxy server is specified in the `websocket` option. 
```js
import { BareMuxConnection } from "@mercuryworkshop/bare-mux";
const conn = new BareMuxConnection("/path/to/baremux/worker.js");
await conn.setTransport("/path/to/curltransport/index.mjs", [{ websocket: "wss://example.com/wisp/" }]);
```

If you would like to use wsproxy instead of Wisp, set `transport: "wsproxy"`. Wsproxy is similar to Wisp, but each TCP connection exists as a separate Websocket instead of being multiplexed. 

```js
await conn.setTransport("/path/to/curltransport/index.mjs", [{ websocket: "wss://example.com/wsproxy/", transport: "wsproxy" }]);
```

You can also set the max number of open connections for libcurl.js. The `connections` option is passed through to `HTTPSession.set_connections` in libcurl.js. It is an array of 3 integers, where the first is the hard limit of active connections (default 60), the second is limit for the connection cache (default 50), and the third is the max connections per host (default 6).
```js
conn.setTransport("/libcurl/index.mjs", [{ websocket: "wss://example.com/wsproxy/", connections: [30, 20, 1] } ])
```

## Copyright:
This package is licensed under the GNU AGPL v3.

```
CurlTransport - An encrypted bare-mux transport for web proxies using libcurl.js.
Copyright (C) 2025 Mercury Workshop

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```