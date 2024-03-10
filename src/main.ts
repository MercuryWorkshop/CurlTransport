import { BareHeaders, BareResponse, TransferrableResponse, type BareTransport } from "@mercuryworkshop/bare-mux";
import { libcurl } from "libcurl.js";
export class LibcurlClient implements BareTransport {
  wisp: string;
  wasm_url: string;

  constructor(options) {
    this.wisp = options.wisp;
    this.wasm_url = options.wasm || "libcurl.wasm";
  }
  async init() {
    this.ready = libcurl.ready;
    if (this.ready) return;

    libcurl.load_wasm(this.wasm_url);
    await new Promise((resolve, reject) => {
      libcurl.onload = () => {
        libcurl.set_websocket(this.wisp);
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
  ): (data: Blob | ArrayBuffer | string) => void {
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
    return (data) => {
      socket.send(data);
    }
  }
}
