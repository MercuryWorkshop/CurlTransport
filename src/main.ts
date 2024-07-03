import { BareHeaders, BareResponse, TransferrableResponse, type BareTransport } from "@mercuryworkshop/bare-mux";
// @ts-ignore
import { libcurl } from "libcurl.js/bundled";
export class LibcurlClient implements BareTransport {
  wisp: string;

  constructor(options) {
    this.wisp = options.wisp;
    if (!this.wisp.endsWith("/")) {
      throw new TypeError("The Wisp URL must end with a trailing forward slash.");
    }
    if (!this.wisp.startsWith("ws://") && !this.wisp.startsWith("wss://")) {
      throw new TypeError("The Wisp URL must use the ws:// or wss:// protocols");
    }
  }
  async init() {
    libcurl.set_websocket(this.wisp);
    this.ready = libcurl.ready;
    if (this.ready) {
      console.log("running libcurl.js v"+libcurl.version.lib);
      return
    };

    await new Promise((resolve, reject) => {
      libcurl.onload = () => {
        console.log("loaded libcurl.js v"+libcurl.version.lib);
        this.ready = true;
        resolve(null);
      }
    });
  }
  ready = false;
  async meta() { }

  async request(
    remote: URL,
    method: string,
    body: BodyInit | null,
    headers: BareHeaders,
    signal: AbortSignal | undefined
  ): Promise<TransferrableResponse> {
    let payload = await libcurl.fetch(remote.href, {
      method,
      headers: headers,
      body,
      redirect: "manual"
    })

    let respheaders = {};
    for (let [key, value] of payload.raw_headers) {
      if (!respheaders[key]) {
        respheaders[key] = [value];
      }
      else {
        respheaders[key].push(value);
      }
    }

    return {
      body: payload.body!,
      headers: respheaders,
      status: payload.status,
      statusText: payload.statusText,
    }
  }

  connect(
    url: URL,
    origin: string,
    protocols: string[],
    requestHeaders: BareHeaders,
    onopen: (protocol: string) => void,
    onmessage: (data: Blob | ArrayBuffer | string) => void,
    onclose: (code: number, reason: string) => void,
    onerror: (error: string) => void,
  ): [ (data: Blob | ArrayBuffer | string) => void, (code: number, reason: string) => void ] {
    let socket = new libcurl.WebSocket(url.toString(), protocols, {
      headers: requestHeaders
    });
    //bare client always expects an arraybuffer for some reason
    socket.binaryType = "arraybuffer";

    socket.onopen = (event: Event) => {onopen("")};
    socket.onclose = (event: CloseEvent) => {onclose(event.code, event.reason)};
    socket.onerror = (event: Event) => {onerror("")};
    socket.onmessage = (event: MessageEvent) => {
      onmessage(event.data);
    };

    //there's no way to close the websocket in bare-mux?
    // there is now!
    return [ 
      (data) => {
        socket.send(data);
      },
      (code, reason) => {
        socket.close(code, reason)
      }
    ]
  }
}
