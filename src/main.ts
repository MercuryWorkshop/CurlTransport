import { setBareClientImplementation, Client, BareHeaders, BareResponse, GetRequestHeadersCallback, MetaCallback, ReadyStateCallback, WebSocketImpl } from "@mercuryworkshop/bare-client-custom";
// import { libcurl } from "../libcurl.js/client/out/libcurl.js";
import epoxy from "@mercuryworkshop/epoxy-tls";


export class TLSClient extends Client {
  queue: (() => void)[] = [];
  canstart = true;

  wsproxy;
  epxclient: Awaited<ReturnType<typeof epoxy>>["EpoxyClient"]["prototype"];


  constructor({ wsproxy, mux }) {
    super();
    if (wsproxy) {
      // libcurl.set_websocket(wsproxy);
      this.wsproxy = wsproxy;
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

      return new Promise((resolve, reject) => {
        let cb = () => {
          this.canstart = false;
          libcurl.fetch(remote.href, {
            method,
            headers: requestHeaders,
            body,
            redirect: "manual",
          }).then(payload => {

            // the vk6headers are weird
            const headers = new Headers();
            for (const [header, value] of Object.entries(payload.headers)) {
              headers.append(header, value);
            }

            resolve(new Response(payload.body, {
              status: payload.status,
              statusText: payload.statusText,
              headers,
            }) as BareResponse);
            // setTimeout(() => {
            this.canstart = true;
            this.queue.pop()!();
            // }, 1000);
          }).catch(err => {
            this.canstart = true;
            this.queue.pop()!();
            reject(err);
          });
        };

        this.queue.push(cb);
        if (this.canstart)
          this.queue.pop()!();

        setTimeout(() => {

          const headers = new Headers();
          for (const [header, value] of Object.entries(payload.headers)) {
            headers.append(header, value);
          }

          resolve(new Response(payload.body, {
            status: payload.status,
            statusText: payload.statusText,
            headers,
          }) as BareResponse);
        });
      });
    } else {
      if (body instanceof Blob)
        body = await body.arrayBuffer();
      try {
        let payload: BareResponse = await this.epxclient.fetch(remote.href, { method, body, headers: requestHeaders, redirect: "manual" });
        // console.log(remote.href, { method, body, headers: requestHeaders });
        // console.log(payload);
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

    // coerce iframe Array type to our window array type
    protocols = Array.from(protocols);


    let origin = arrayBufferImpl.prototype.constructor.constructor("return __uv$location")().origin;

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
