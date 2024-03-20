A bare-module for implementing end to end encryption with libcurl.js

# How to use
In an ultraviolet app with bare-mux installed, you'll see a line like
```js
BareMux.SetTransport("EpxMod.EpoxyClient", { wisp: "ws://localhost:8080/wisp" });
```
Simply replace it with
```js
BareMux.SetTransport("CurlMod.LibcurlClient", { wisp: "ws://localhost:8080/wisp" });
```

to use the libcurl.js backend instead

You must import `dist/index.js` in your service worker, before UV is initialized. 