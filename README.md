# CurlTransport
A bare-module for implementing end to end encryption with libcurl.js

# Usage
Here is an example of using CurlTransport:
```js
import { BareMuxConnection } from "@mercuryworkshop/bare-mux";
const conn = new BareMuxConnection("/path/to/baremux/worker.js");
await conn.setTransport("/path/to/curltransport/index.mjs", [{ wisp: "wss://wisp.mercurywork.shop/" }]);
```
