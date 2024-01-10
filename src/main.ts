import { setBareClientImplementation, Client, BareHeaders, BareResponse, GetRequestHeadersCallback, MetaCallback, ReadyStateCallback, WebSocketImpl } from "@mercuryworkshop/bare-client-custom";
// import { libcurl } from "../libcurl.js/client/out/libcurl.js";

const status_messages = {
  100: "Continue",
  101: "Switching Protocols",
  102: "Processing",
  103: "Early Hints",
  200: "OK",
  201: "Created",
  202: "Accepted",
  203: "Non-Authoritative Information",
  204: "No Content",
  205: "Reset Content",
  206: "Partial Content",
  207: "Multi-Status",
  208: "Already Reported",
  226: "IM Used",
  300: "Multiple Choices",
  301: "Moved Permanently",
  302: "Found",
  303: "See Other",
  304: "Not Modified",
  305: "Use Proxy",
  306: "Switch Proxy",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  416: "Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a teapot",
  421: "Misdirected Request",
  422: "Unprocessable Content",
  423: "Locked",
  424: "Failed Dependency",
  425: "Too Early",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  451: "Unavailable For Legal Reasons",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  510: "Not Extended",
  511: "Network Authentication Required"
}

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
        let tcp = await new wasm_bindgen.WsTcpWorker(mux, navigator.userAgent);
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
            console.log("poppin!");
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
        });
      });
    } else {
      let payload = await this.tcp.fetch(remote.href, { method, body, requestHeaders });

      const headers = new Headers();
      for (const [header, value] of payload.headers) {
        headers.append(header, value);
      }

      return new Response(payload.body, {
        status: payload.status,
        statusText: status_messages[payload.status],
        headers,
      }) as BareResponse;
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
