// Entry point for the protocol-handler library.  Consumers should
// import from this file rather than referencing deep module
// internals directly.  The factory function `createProtocolHandler`
// constructs a ready‑to‑use handler based on user‑defined HTTP and
// WebSocket handlers.  Processor interfaces and type aliases are
// also exported for convenience.

export * from './factory/createProtocolHandler';
export type * from './core/ProtocolHandlerCore';
export type * from './types/index';
export type * from './processors/HttpProcessor';
export * from './processors/HttpProcessor';
export type * from './processors/WsProcessor';
export * from './types';
export * from './resolvers/index';
