"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypedWebSocketServer = void 0;
const node_http_1 = require("node:http");
const ws_1 = require("ws");
class TypedWebSocketServer {
    constructor(options = {
        handlers: {}
    }) {
        var _a, _b;
        this.clients = new Map();
        this.options = options;
        this.handlers = options.handlers;
        this.httpServer = (_a = options.httpServer) !== null && _a !== void 0 ? _a : (0, node_http_1.createServer)();
        this.wsServer = new ws_1.WebSocketServer({
            server: this.httpServer,
            path: (_b = options.path) !== null && _b !== void 0 ? _b : "/ws",
        });
        this.wsServer.on("connection", (socket, request) => {
            const clientId = this.createClientId({ socket, request });
            const clientData = this.createClientData({
                socket,
                request,
                clientId,
            });
            const client = {
                id: clientId,
                socket,
                channels: new Set(),
                data: clientData,
            };
            this.clients.set(client.id, client);
            this.handleConnect({ socket, request, client });
            socket.on("message", (raw) => {
                this.handleRawMessage(client, raw);
            });
            socket.on("close", (code, reason) => {
                this.clients.delete(client.id);
                this.handleDisconnect({
                    socket,
                    client,
                    code,
                    reason,
                });
            });
            socket.on("error", (error) => {
                this.handleError({
                    socket,
                    client,
                    error: error instanceof Error ? error : new Error(String(error)),
                });
            });
        });
    }
    listen(port, callback) {
        const resolvedPort = port !== null && port !== void 0 ? port : this.options.port;
        if (typeof resolvedPort !== "number") {
            throw new Error("No port provided.");
        }
        this.httpServer.listen(resolvedPort, callback);
    }
    close(callback) {
        this.wsServer.close((wsError) => {
            this.httpServer.close((httpError) => {
                var _a;
                callback === null || callback === void 0 ? void 0 : callback((_a = wsError !== null && wsError !== void 0 ? wsError : httpError) !== null && _a !== void 0 ? _a : undefined);
            });
        });
    }
    getClients() {
        return Array.from(this.clients.values());
    }
    getClientById(clientId) {
        var _a;
        return (_a = this.clients.get(clientId)) !== null && _a !== void 0 ? _a : null;
    }
    getClientIds() {
        return Array.from(this.clients.keys());
    }
    joinChannel(clientId, channelId) {
        const client = this.clients.get(clientId);
        if (!client)
            return false;
        client.channels.add(channelId);
        return true;
    }
    leaveChannel(clientId, channelId) {
        const client = this.clients.get(clientId);
        if (!client)
            return false;
        client.channels.delete(channelId);
        return true;
    }
    send(message) {
        switch (message.scope) {
            case "broadcast":
                this.broadcast(message);
                return;
            case "channel":
                this.sendToChannel(message.channelId, message);
                return;
            case "client":
                this.sendToClient(message.targetId, message);
                return;
        }
    }
    broadcast(message) {
        const serialized = JSON.stringify(message);
        for (const client of this.clients.values()) {
            this.sendSerialized(client.socket, serialized);
        }
    }
    sendToChannel(channelId, message) {
        const serialized = JSON.stringify(message);
        for (const client of this.clients.values()) {
            if (!client.channels.has(channelId))
                continue;
            this.sendSerialized(client.socket, serialized);
        }
    }
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client)
            return;
        this.sendSerialized(client.socket, JSON.stringify(message));
    }
    // client: this.getClientById(key) as WsConnectedClient<TClientData>,
    // socket: this.getClientById(key)?.socket as WebSocket,
    // type: key,
    // data: this.getClientById(key)?.data as TIncomingMap[K],
    // message: {
    //   type: key,
    //   data: this.getClientById(key)?.data as TIncomingMap[K],
    //   scope: "client",
    //   targetId: key,
    // } as Extract<WsMessageFromMap<TIncomingMap>, { type: K; }>,
    // },
    // server: this,
    createHandlerContext(ctx) {
        return {
            client: ctx.client,
            socket: ctx.socket,
            type: ctx.type,
            data: ctx.data,
            message: ctx.message,
            server: this,
        };
    }
    createClientId(ctx) {
        if (this.options.createClientId) {
            return this.options.createClientId(ctx);
        }
        return crypto.randomUUID();
    }
    createClientData(ctx) {
        if (this.options.createClientData) {
            return this.options.createClientData(ctx);
        }
        return {};
    }
    handleConnect(ctx) {
        var _a, _b;
        (_b = (_a = this.options).onConnect) === null || _b === void 0 ? void 0 : _b.call(_a, ctx);
    }
    handleDisconnect(ctx) {
        var _a, _b;
        (_b = (_a = this.options).onDisconnect) === null || _b === void 0 ? void 0 : _b.call(_a, ctx);
    }
    handleError(ctx) {
        var _a, _b;
        (_b = (_a = this.options).onError) === null || _b === void 0 ? void 0 : _b.call(_a, ctx);
    }
    async dispatchTypedHandler(type, ctx) {
        var _a;
        const handler = (_a = this.options.handlers) === null || _a === void 0 ? void 0 : _a[type];
        if (!handler)
            return;
        await handler(this.createHandlerContext({
            client: ctx.client,
            socket: ctx.socket,
            type,
            data: ctx.message.data,
            message: ctx.message,
        }));
    }
    async handleMessage(ctx) {
        var _a, _b;
        (_b = (_a = this.options).onMessage) === null || _b === void 0 ? void 0 : _b.call(_a, ctx);
        await this.dispatchTypedHandler(ctx.message.type, ctx);
    }
    parseIncomingMessage(raw) {
        try {
            const text = typeof raw === "string" ? raw : raw.toString();
            const parsed = JSON.parse(text);
            if (this.options.validateIncomingMessage) {
                return this.options.validateIncomingMessage(parsed) ? parsed : null;
            }
            return parsed;
        }
        catch {
            return null;
        }
    }
    getConnectedClients() {
        return Array.from(this.clients.values());
    }
    handleRawMessage(client, raw) {
        const message = this.parseIncomingMessage(raw);
        if (!message)
            return;
        this.handleMessage({
            raw,
            socket: client.socket,
            client,
            message,
        });
    }
    sendSerialized(socket, payload) {
        if (socket.readyState !== ws_1.WebSocket.OPEN)
            return;
        socket.send(payload);
    }
}
exports.TypedWebSocketServer = TypedWebSocketServer;
