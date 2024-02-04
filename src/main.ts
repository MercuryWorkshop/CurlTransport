import { setBareClientImplementation, Client, BareHeaders, BareResponse, GetRequestHeadersCallback, MetaCallback, ReadyStateCallback, WebSocketImpl } from "@mercuryworkshop/bare-client-custom";
import { libcurl } from "libcurl.js";
//@ts-ignore
import epoxy from "@mercuryworkshop/epoxy-tls";

export class TLSClient extends Client {
  queue: (() => void)[] = [];
  canstart = true;

  wsproxy;
  epxclient: Awaited<ReturnType<typeof epoxy>>["EpoxyClient"]["prototype"];

  constructor({ wsproxy, mux }) {
    super();
    if (wsproxy) {
      libcurl.load_wasm('libcurl.wasm')
      libcurl.set_websocket(wsproxy);
      //@ts-ignore
      this.wsproxy = wsproxy
  } else if (mux) {
    console.log("load start");

    (async () => {
      let { EpoxyClient } = await epoxy();
      this.epxclient = await new EpoxyClient(mux, navigator.userAgent, 10);
    })();
  }
  }

  async request(
    method: string,
    requestHeaders: BareHeaders,
    body: BodyInit | null,
    remote: URL,
    cache: string | undefined,
    duplex: string | undefined,
    signal: AbortSignal | undefined,
    arrayBufferImpl: ArrayBufferConstructor
  ): Promise<BareResponse> {
    if (this.wsproxy) {
      return libcurl.fetch(remote.href, {
          method,
          headers: requestHeaders,
          body,
          redirect: "manual",
        })
    } else {
      if (body instanceof Blob)
        body = await body.arrayBuffer();
      try {
        let payload = await this.epxclient.fetch(remote.href, { method, body, headers: requestHeaders, redirect: "manual" });
        return payload as BareResponse;
      } catch (e) {
        return new Response() as BareResponse;
      }
    }
  }

  connect(
    remote: URL,
    protocols: string | string[],
    getRequestHeaders: GetRequestHeadersCallback,
    onMeta: MetaCallback,
    onReadyState: ReadyStateCallback,
    webSocketImpl: WebSocketImpl,
    arrayBufferImpl: ArrayBufferConstructor
  ): WebSocket {
    // this will error. that's okay
    const ws = new WebSocket("wss:null", protocols);

    let initalCloseHappened = false;
    ws.addEventListener("close", (e) => {
      if (!initalCloseHappened) {
        // we can freely mess with the fake readyState here because there is no
        //  readyStateChange listener for WebSockets
        onReadyState(WebSocket.CONNECTING);
        e.stopImmediatePropagation();
        initalCloseHappened = true;
      }
    });
    let initialErrorHappened = false;
    ws.addEventListener("error", (e) => {
      if (!initialErrorHappened) {
        onReadyState(WebSocket.CONNECTING);
        e.stopImmediatePropagation();
        initialErrorHappened = true;
      }
    });  
    type WebSocketData = string | ArrayBuffer | Blob;
    // coerce iframe Array type to our window array type
    protocols = Array.from(protocols);
    let origin = arrayBufferImpl.prototype.constructor.constructor("return __uv$location")().origin;  
    if (this.wsproxy) {  
        let wsws = new libcurl.WebSocket(remote.toString(), protocols, true);
        wsws.onopen = (protocol: string) => {
          onReadyState(WebSocket.OPEN);
          (ws as any).__defineGetter__("protocol", () => { return protocol });
          Object.defineProperty(wsws, 'binaryType', {
            value: ws.binaryType,
            writable: false,
          });
          ws.dispatchEvent(new Event("open"));
        }
        //@ts-ignore
        wsws.onclose = (code: number, reason: string, wasClean: boolean) => {
          onReadyState(WebSocket.CLOSED);
          ws.dispatchEvent(new CloseEvent("close", { code, reason, wasClean }));
        }
         //@ts-ignore
        wsws.onerror = (message: string) => {
          ws.dispatchEvent(new ErrorEvent("error", { message }));
        }
         //@ts-ignore
        wsws.onmessage = (event) => {
          let payload = event.data
          if (typeof payload === "string") {
            ws.dispatchEvent(new MessageEvent("message", { data: payload }));
          } else if (payload instanceof ArrayBuffer) {
            (payload as any).__proto__ = arrayBufferImpl.prototype;

            ws.dispatchEvent(new MessageEvent("message", { data: payload }));
          } else if (payload instanceof Blob) {
            ws.dispatchEvent(new MessageEvent("message", { data: payload }));
          }
        }
        ws.send = (data: any) => {
          wsws.send(data);
        };
        ws.close = () => {
          wsws.close();
        }
        return ws;
    } else {
      let wsws = this.epxclient.connect_ws(
        (protocol: string) => {
          onReadyState(WebSocket.OPEN);
          (ws as any).__defineGetter__("protocol", () => { return protocol });
          ws.dispatchEvent(new Event("open"));
        },
        (code: number, reason: string, wasClean: boolean) => {
          onReadyState(WebSocket.CLOSED);
          ws.dispatchEvent(new CloseEvent("close", { code, reason, wasClean }));
        },
        (message: string) => {
          console.log({ message });
          ws.dispatchEvent(new ErrorEvent("error", { message }));
        },
        async (payload: Uint8Array | string) => {
          if (typeof payload === "string") {
            ws.dispatchEvent(new MessageEvent("message", { data: payload }));
          } else {
            let data = payload.buffer;
            (data as any).__proto__ = arrayBufferImpl.prototype;

            ws.dispatchEvent(new MessageEvent("message", { data }));
          }

        },
        remote.href,
        protocols,
        origin,
      );

      wsws.then(wsws => {
        ws.send = (data: any) => {
          wsws.send(data);
        };
        ws.close = () => {
          wsws.close();
          wsws.free();
        }
      });

      return ws;
    }
  }
}
