import { setBareClientImplementation, Client, BareHeaders, BareResponse, GetRequestHeadersCallback, MetaCallback, ReadyStateCallback, WebSocketImpl } from "@mercuryworkshop/bare-client-custom";
// import { libcurl } from "../libcurl.js/client/out/libcurl.js";

declare var wasm_bindgen: any;
export class TLSClient extends Client {
  queue: (() => void)[] = [];
  canstart = true;
  // libcurlimpl = libcurl;
  mux;
  wsproxy;
  tcp;


  constructor({ wsproxy, mux }) {
    super();
    if (wsproxy) {
      libcurl.set_websocket(wsproxy);
      this.wsproxy = wsproxy;
    } else if (mux) {
      this.mux = mux;
      wasm_bindgen("./wstcp_client_bg.wasm").then(async () => {
        let tcp = await new wasm_bindgen.WsTcp(mux, navigator.userAgent, 10);
        window.tcp = tcp;
        this.tcp = tcp;
      });
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
        let payload: BareResponse = await this.tcp.fetch(remote.href, { method, body, headers: requestHeaders, redirect: "manual" });
        console.log(remote.href, { method, body, headers: requestHeaders });
        console.log(payload);
        return payload as BareResponse;
      } catch (e) {
        return new Response() as BareResponse;
      }

      // return new Response(payload.body, {
      //   status: payload.status,
      //   statusText: status_messages[payload.status],
      //   headers,
      // }) as BareResponse;
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
    console.log(arguments);
    const ws = new WebSocket("wss:null", protocols);
    remote.protocol = remote.protocol === "ws:" ? "http:" : "https:";
    // this will error. that's okay
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

    let wsws = new wasm_bindgen.WsWebSocket(
      (protocol: string) => {
        onReadyState(WebSocket.OPEN);
        (ws as any).__defineGetter__("protocol", () => { return protocol });
        ws.dispatchEvent(new Event("open"));
      },
      (code: number, reason: string, wasClean: boolean) => {
        onReadyState(WebSocket.CLOSED);
        ws.dispatchEvent(new CloseEvent("close", { code, reason, wasClean }));
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
      (message: string) => {
        console.log({ message });
        ws.dispatchEvent(new ErrorEvent("error", { message }));
      },
    );
    // let host = "remote-auth-gateway.discord.gg";
    let origin = arrayBufferImpl.prototype.constructor.constructor("return __uv$location")().origin;
    let _ptr = wsws.ptr();
    setTimeout(() => {

      wsws.connect(this.tcp, remote.href, protocols, origin).then(() => {
        setTimeout(() => {
          // i dont know anymore
          wsws.recv();

        }, 2000);
      });
    }, 2000);

    ws.send = (data: any) => {

      setTimeout(() => {
        wasm_bindgen.send(_ptr, data);
      }, 2100);
    };



    //   let { send, close } = this.connection.wsconnect(
    //     remote,
    //     protocols,
    //     (protocol: string) => {
    //       onReadyState(WebSocket.OPEN);
    //       (ws as any).__defineGetter__("protocol", () => { return protocol });
    //       ws.dispatchEvent(new Event("open"));
    //     },
    //     (code: number, reason: string, wasClean: boolean) => {
    //       onReadyState(WebSocket.CLOSED);
    //       ws.dispatchEvent(new CloseEvent("close", { code, reason, wasClean }));
    //     },
    //     async (stream, isBinary) => {
    //       let data: ArrayBuffer | string = await new Response(
    //         stream
    //       ).arrayBuffer();
    //       (data as any).__proto__ = arrayBufferImpl.prototype;
    //       if (!isBinary) {
    //         try {
    //           data = new TextDecoder().decode(data);
    //         } catch (e) {
    //           console.error(e);
    //           return;
    //         }
    //       }
    //       ws.dispatchEvent(new MessageEvent("message", { data }));
    //     },
    //     (message: string) => {
    //       console.log({ message });
    //       ws.dispatchEvent(new ErrorEvent("error", { message }));
    //     },
    //     arrayBufferImpl,
    //     arrayBufferImpl.prototype.constructor.constructor("return __uv$location")().origin,
    // //   );

    // ws.close = (code?: number, reason?: string) => {
    //   close(code, reason);
    //   onReadyState(WebSocket.CLOSING);
    // };

    return ws;
  }
}
