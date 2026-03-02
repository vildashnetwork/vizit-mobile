// socketconnect.ts
import { io, Socket } from "socket.io-client";

// Define the shape of data coming from the server
interface ServerToClientEvents {
    getOnlineUsers: (userIds: string[]) => void;
    connect_error: (err: { message: string }) => void;
}

// Define the shape of data sent to the server (if any)
interface ClientToServerEvents {
    // Example: sendMessage: (msg: string) => void;
}

const SOCKET_URL = "https://vizit-backend-hubw.onrender.com";

// Type the socket variable with our custom interfaces
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

/**
 * Type for the callback function that updates online users
 */
type OnlineUsersCallback = (userIds: string[]) => void;

export const connectSocket = (
    userId: string | undefined,
    onOnlineUsersUpdate?: OnlineUsersCallback
): Socket<ServerToClientEvents, ClientToServerEvents> | null => {
    if (!userId) return null;
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

    socket.on("connect_error", (err) => {
        console.error("⚠️ Socket error:", err?.message || err);
    });

    if (onOnlineUsersUpdate) {
        socket.on("getOnlineUsers", onOnlineUsersUpdate);
    }

    return socket;
};

export const disconnectSocket = (): void => {
    if (!socket) return;
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
};

export const getSocket = (): Socket<ServerToClientEvents, ClientToServerEvents> | null => socket;mess