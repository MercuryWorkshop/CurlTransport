import { BareHeaders, BareResponse, TransferrableResponse, type BareTransport } from "@mercuryworkshop/bare-mux";
import { libcurl } from "libcurl.js";
import epoxy from "@mercuryworkshop/epoxy-tls";
export class TLSClient implements BareTransport {
  canstart = true;
  epxclient: Awaited<ReturnType<any>>["EpoxyClient"]["prototype"] = null!;
  wisp: string | null = null;
  type: "libcurl" | "epoxy";

  constructor({ wisp, type }) {
    this.type = type;
    if (type === "libcurl") {
      libcurl.load_wasm('libcurl.wasm')
      libcurl.set_websocket(wisp);
      //@ts-ignore
      this.wsproxy = wsproxy
    } else {
      (async () => {
        let { EpoxyClient } = await epoxy();
        console.log(EpoxyClient);
        this.epxclient = await new EpoxyClient(wisp, navigator.userAgent, 10);
      })();
    }
  }
  async init() { }
  ready = true;
  async meta() { }

  async request(
    remote: URL,
    method: string,
    body: BodyInit | null,
    headers: BareHeaders,
    signal: AbortSignal | undefined
  ): Promise<TransferrableResponse> {
    if (this.type === "libcurl") {
      return libcurl.fetch(remote.href, {
        method,
        headers: headers,
        body,
        redirect: "manual",
      })
    } else {
        try {
      if (body instanceof Blob)
        body = await body.arrayBuffer();
      let payload = await this.epxclient.fetch(remote.href, { method, body, headers, redirect: "manual" });

      return {
        body: payload.body!,
        headers: (payload as any).rawHeaders,
        status: payload.status,
        statusText: payload.statusText,
      };
      } catch(e) {console.error(e)}
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
    if (this.type === "libcurl") {
      //   let wsws = new libcurl.WebSocket(remote.toString(), protocols);
      //
      //   wsws.onopen = (protocol: string) => {
      //     onReadyState(WebSocket.OPEN);
      //     (ws as any).__defineGetter__("protocol", () => { return protocol });
      //     Object.defineProperty(wsws, 'binaryType', {
      //       get: function() {
      //         return ws.binaryType;
      //       },
      //     });
      //     console.log(wsws)
      //     ws.dispatchEvent(new Event("open"));
      //   }
      //   //@ts-ignore
      //   wsws.onclose = (code: number, reason: string, wasClean: boolean) => {
      //     onReadyState(WebSocket.CLOSED);
      //     ws.dispatchEvent(new CloseEvent("close", { code, reason, wasClean }));
      //   }
      //   //@ts-ignore
      //   wsws.onerror = (message: string) => {
      //     ws.dispatchEvent(new ErrorEvent("error", { message }));
      //   }
      //   //@ts-ignore
      //   wsws.onmessage = (event) => {
      //     let payload = event.data
      //     if (typeof payload === "string") {
      //       ws.dispatchEvent(new MessageEvent("message", { data: payload }));
      //     } else if (payload instanceof ArrayBuffer) {
      //       Object.setPrototypeOf(payload, arrayBufferImpl.prototype);
      //
      //       ws.dispatchEvent(new MessageEvent("message", { data: payload }));
      //     } else if (payload instanceof Blob) {
      //       console.log(payload)
      //       console.log(event)
      //       ws.dispatchEvent(new MessageEvent("message", { data: payload }));
      //     }
      //   }
      //   ws.send = (data: any) => {
      //     wsws.send(data);
      //   };
      //   ws.close = () => {
      //     wsws.close();
      //   }
      return () => { };
    } else {
      let wsws = this.epxclient.connect_ws(
        onopen,
        onclose,
        onerror,
        onmessage,
        url.href,
        protocols,
        origin,
      );

      return async (data) => {
        (await wsws).send(data);
      };
    }
  }
}
