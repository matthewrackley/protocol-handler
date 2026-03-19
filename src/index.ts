// Entry point for the protocol-handler library.  Consumers should
// import from this file rather than referencing deep module
// internals directly.  The factory function `createProtocolHandler`
// constructs a ready‑to‑use handler based on user‑defined HTTP and
// WebSocket handlers.  Processor interfaces and type aliases are
// also exported for convenience.

export { createProtocolHandler } from './factory/createProtocolHandler';
export type {
  GenericHttpHandler,
  GenericWsHandler,
  HandlerContext,
} from './core/ProtocolHandlerCore';
export type {
  HttpMethod,
  WsAction,
  MaybePromise,
  HttpHandlerRequest,
  WsConnectHandlerRequest,
  WsSendHandlerRequest,
  WsCloseHandlerRequest,
  WsHandlerRequest,
  ProtocolHandlerRequest,
  ResponseEnvelope,
} from './types';
export type {
  HttpProcessor,
  HttpRequestInput,
} from './processors/HttpProcessor';
export type {
  WsProcessor,
  WsConnectInput,
  WsSendInput,
  WsCloseInput,
} from './processors/WsProcessor';
