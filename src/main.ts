import { setBareClientImplementation, Client, BareHeaders, BareResponse, GetRequestHeadersCallback, MetaCallback, ReadyStateCallback, WebSocketImpl } from "@mercuryworkshop/bare-client-custom";
// import { libcurl } from "../libcurl.js/client/out/libcurl.js";

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
      declare var wasm_bindgen: any;
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
      console.log(remote.href, { method, body, headers: requestHeaders });
      let payload = await this.tcp.fetch(remote.href, { method, body, headers: requestHeaders });
      console.log(payload);
      return payload as BareResponse;

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
    const ws = new webSocketImpl("wss:null", protocols);
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

    //   ws.send = (data: any) => {
    //     send(data);
    //   };

    //   ws.close = (code?: number, reason?: string) => {
    //     close(code, reason);
    //     onReadyState(WebSocket.CLOSING);
    //   };

    return ws;
  }
}
