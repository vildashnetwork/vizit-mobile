import { io, Socket } from "socket.io-client";

const SOCKET_URL = "https://vizit-backend-hubw.onrender.com";

let socket: Socket | null = null;

/**
 * Connect socket ONCE per user
 * @param userId - current logged-in user ID
 * @param onOnlineUsersUpdate - callback when online users change
 * @returns The socket instance or null if userId is missing
 */
export const connectSocket = (
    userId: string | null | undefined,
    onOnlineUsersUpdate?: (onlineIds: string[]) => void
): Socket | null => {
    if (!userId) {
        console.warn("❌ Socket connection blocked: userId missing");
        return null;
    }

    if (socket) return socket; // already connected

    socket = io(SOCKET_URL, {
        auth: { userId },
        transports: ["websocket"],
        withCredentials: true,
        reconnectionAttempts: 5,
        timeout: 10000,
    });

    socket.on("connect", () => {
        console.log("✅ Socket connected:", socket?.id);
    });

    socket.on("disconnect", (reason: string) => {
        console.log("❌ Socket disconnected:", reason);
    });

    socket.on("connect_error", (err: Error) => {
        console.error("⚠️ Socket error:", err?.message || err);
    });

    if (onOnlineUsersUpdate) {
        socket.on("getOnlineUsers", (onlineIds: string[]) => {
            onOnlineUsersUpdate(onlineIds);
        });
    }

    return socket;
};

/**
 * Disconnect socket (logout / app close)
 */
export const disconnectSocket = (): void => {
    if (!socket) return;
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
};

/**
 * Access existing socket inside components
 * @returns The current socket instance or null if not connected
 */
export const getSocket = (): Socket | null => socket;

// Type definitions for socket events
export interface SocketEvents {
    // Server -> Client events
    "getOnlineUsers": (onlineIds: string[]) => void;
    "newMessage": (message: any) => void;
    "messagesRead": (data: { byUserId: string }) => void;
    "typingStatus": (data: { byUserId: string; isTyping: boolean }) => void;
    "incoming:call": (data: { fromUserId: string; offer: any; callerName: string }) => void;
    "call:accepted": (data: { answer: any }) => void;
    "call:rejected": () => void;
    "call:end": () => void;
    
    // Client -> Server events
    "registerUser": (userId: string) => void;
    "typing": (data: { chatUserId: string; isTyping: boolean }) => void;
    "markMessagesRead": (data: { chatUserId: string; readerId: string }) => void;
    "user:call": (data: { toUserId: string; offer: any; callerName: string }) => void;
    "call:accepted": (data: { toUserId: string; answer: any }) => void;
    "call:rejected": (data: { toUserId: string }) => void;
    "call:end": (data: { toUserId: string }) => void;
}

// Helper type for typed socket emits
export type TypedSocket = Socket & {
    emit: <E extends keyof SocketEvents>(
        event: E,
        ...args: Parameters<SocketEvents[E]>
    ) => boolean;
    on: <E extends keyof SocketEvents>(
        event: E,
        listener: SocketEvents[E]
    ) => this;
};

// Helper to get typed socket
export const getTypedSocket = (): TypedSocket | null => {
    return socket as TypedSocket | null;
};