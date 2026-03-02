import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Modal,
    StatusBar,
    SafeAreaView,
    Dimensions,
    Alert,
    RefreshControl,
    Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Video, ResizeMode } from "expo-av";
import { connectSocket, getSocket, disconnectSocket } from "../me";
import * as Haptics from "expo-haptics";
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get("window");
const API = "https://vizit-backend-hubw.onrender.com/api";

/* ================= TYPES ================= */

type User = {
    _id: string;
    name: string;
    email: string;
    profile: string;
    role?: string;
    verified?: boolean;
    allchatsId?: string[];
};

type Message = {
    _id?: string;
    senderId: string;
    receiverId: string;
    text?: string;
    image?: string;
    video?: string;
    audio?: string;
    createdAt: string;
    readistrue?: boolean;
    temp?: boolean;
    failed?: boolean;
};

type ChatUser = {
    _id: string;
    name: string;
    email: string;
    profile: string;
    role?: string;
    verified?: boolean;
    lastMessage?: string;
};

/* ================= CHAT INPUT COMPONENT ================= */

interface ChatInputProps {
    onSend: (text: string, imageFile: any, videoFile: any) => void;
    onTyping: (isTyping: boolean) => void;
}

const ChatInput = ({ onSend, onTyping }: ChatInputProps) => {
    const [message, setMessage] = useState("");
    const [imageFile, setImageFile] = useState<any>(null);
    const [videoFile, setVideoFile] = useState<any>(null);
    const inputRef = useRef<TextInput>(null);

    const handleSend = () => {
        if (!message.trim() && !imageFile && !videoFile) return;
        onSend(message, imageFile, videoFile);
        setMessage("");
        setImageFile(null);
        setVideoFile(null);
        onTyping(false);
        Keyboard.dismiss();
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            allowsEditing: true,
        });
        if (!result.canceled) {
            setImageFile(result.assets[0]);
        }
    };

    const pickVideo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            quality: 0.7,
            allowsEditing: true,
        });
        if (!result.canceled) {
            setVideoFile(result.assets[0]);
        }
    };

    return (
        <View style={styles.inputContainer}>
            {(imageFile || videoFile) && (
                <View style={styles.previewContainer}>
                    {imageFile && (
                        <View style={styles.previewItem}>
                            <Image source={{ uri: imageFile.uri }} style={styles.previewImage} />
                            <TouchableOpacity
                                style={styles.removePreview}
                                onPress={() => setImageFile(null)}
                            >
                                <Ionicons name="close-circle" size={20} color="#ff4444" />
                            </TouchableOpacity>
                        </View>
                    )}
                    {videoFile && (
                        <View style={styles.previewItem}>
                            <Video
                                source={{ uri: videoFile.uri }}
                                style={styles.previewVideo}
                                shouldPlay={false}
                                useNativeControls
                            />
                            <TouchableOpacity
                                style={styles.removePreview}
                                onPress={() => setVideoFile(null)}
                            >
                                <Ionicons name="close-circle" size={20} color="#ff4444" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            <View style={styles.inputRow}>
                <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
                    <Ionicons name="image-outline" size={24} color="#10ca8c" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.attachButton} onPress={pickVideo}>
                    <Ionicons name="videocam-outline" size={24} color="#10ca8c" />
                </TouchableOpacity>

                <TextInput
                    ref={inputRef}
                    style={styles.textInput}
                    placeholder="Type a message..."
                    value={message}
                    onChangeText={(text) => {
                        setMessage(text);
                        onTyping(text.length > 0);
                    }}
                    multiline
                    maxLength={1000}
                />

                <TouchableOpacity
                    style={[
                        styles.sendButton,
                        (!message.trim() && !imageFile && !videoFile) && styles.sendButtonDisabled,
                    ]}
                    onPress={handleSend}
                    disabled={!message.trim() && !imageFile && !videoFile}
                >
                    <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

/* ================= MAIN CHAT SCREEN CONTENT ================= */

function ChatScreenContent({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [chats, setChats] = useState<ChatUser[]>([]);
    const [messages, setMessages] = useState<Record<string, Message[]>>({});
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState<Record<string, boolean>>({});
    const [refreshingChats, setRefreshingChats] = useState(false);
    const [refreshingMessages, setRefreshingMessages] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [showGallery, setShowGallery] = useState(false);
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [galleryIndex, setGalleryIndex] = useState(0);
    const [showVideoCall, setShowVideoCall] = useState(false);
    const [incomingCall, setIncomingCall] = useState(false);
    const [callerInfo, setCallerInfo] = useState<any>(null);
    const [callActive, setCallActive] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [localStream, setLocalStream] = useState<any>(null);
    const [remoteStream, setRemoteStream] = useState<any>(null);
    const [socketConnected, setSocketConnected] = useState(false);

    const messagesEndRef = useRef<View>(null);
    const flatListRef = useRef<FlatList>(null);

    /* ================= CONNECT SOCKET ================= */
    useEffect(() => {
        if (!user?._id) return;

        const socket = connectSocket(user._id, (onlineIds: string[]) => {
            setOnlineUsers(onlineIds);
        });

        if (socket) {
            setSocketConnected(true);
            
            socket.on("connect", () => {
                console.log("Socket connected");
                setSocketConnected(true);
            });

            socket.on("disconnect", () => {
                console.log("Socket disconnected");
                setSocketConnected(false);
            });
        }

        return () => {
            disconnectSocket();
        };
    }, [user?._id]);

    /* ================= SOCKET EVENT LISTENERS ================= */
    useEffect(() => {
        if (!user?._id) return;
        
        const socket = getSocket();
        if (!socket) return;

        // Register user
        socket.emit("registerUser", user._id);

        // Listen for typing status
        socket.on("typingStatus", ({ byUserId, isTyping }: { byUserId: string; isTyping: boolean }) => {
            setTypingUsers(prev => ({ ...prev, [byUserId]: isTyping }));
        });

        // Listen for new messages
        socket.on("newMessage", (msg: Message) => {
            const chatId = msg.senderId === user._id ? msg.receiverId : msg.senderId;

            setMessages(prev => {
                const existing = prev[chatId] || [];
                // Remove any temp messages from same sender
                const filtered = existing.filter(m => !(m.temp && m.senderId === msg.senderId));
                // Check for duplicates
                if (filtered.some(m => m._id === msg._id)) return prev;
                
                // Add new message
                const updated = { ...prev, [chatId]: [...filtered, msg] };
                
                // Scroll to bottom if this is the active chat
                if (chatId === activeChatId) {
                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                }
                
                return updated;
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        });

        // Listen for read receipts
        socket.on("messagesRead", ({ byUserId }: { byUserId: string }) => {
            setMessages(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(chatId => {
                    updated[chatId] = updated[chatId].map(m =>
                        m.senderId === user._id && m.receiverId === byUserId
                            ? { ...m, readistrue: true }
                            : m
                    );
                });
                return updated;
            });
        });

        // Listen for call events
        socket.on("incoming:call", ({ fromUserId, offer, callerName }) => {
            setCallerInfo({ userId: fromUserId, name: callerName });
            setIncomingCall(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        });

        socket.on("call:accepted", () => {
            setCallActive(true);
            setShowVideoCall(true);
        });

        socket.on("call:rejected", () => {
            Alert.alert("Call Rejected", "The user declined your call");
            setShowVideoCall(false);
        });

        socket.on("call:end", () => {
            endCall();
        });

        return () => {
            socket.off("typingStatus");
            socket.off("newMessage");
            socket.off("messagesRead");
            socket.off("incoming:call");
            socket.off("call:accepted");
            socket.off("call:rejected");
            socket.off("call:end");
        };
    }, [user?._id, activeChatId]);

    /* ================= DECODE TOKEN ================= */
    const decodeToken = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            if (!token) {
                router.push("/Login");
                return;
            }

            const res = await axios.get(`${API}/owner/decode/token/owner`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setUser(res.data.res);
            await AsyncStorage.setItem("userId", res.data.res._id);
        } catch (err) {
            console.error("Decode token failed", err);
            router.push("/Login");
        }
    }, []);

    /* ================= FETCH CHAT USERS ================= */
    const fetchChats = useCallback(async (showLoading = true) => {
        if (!user?._id) return;

        if (showLoading) setLoadingChats(true);
        
        try {
            const res = await axios.get(`${API}/messages/users/${user._id}`);
            const { filteredUsers, filteredOwners } = res.data;
            setChats([...filteredOwners, ...filteredUsers]);
        } catch (err) {
            console.error("Fetch chats failed", err);
        } finally {
            setLoadingChats(false);
            setRefreshingChats(false);
        }
    }, [user?._id]);

    /* ================= LOAD MESSAGES ================= */
    const loadMessages = async (chatId: string, showLoading = true) => {
        if (!user?._id) return;

        setActiveChatId(chatId);
        setSidebarVisible(false);
        
        if (showLoading) {
            setLoadingMessages(prev => ({ ...prev, [chatId]: true }));
        }

        try {
            const res = await axios.get(`${API}/messages/${chatId}`, {
                params: { myId: user._id },
            });

            setMessages(prev => ({ ...prev, [chatId]: res.data }));

            // Mark as read
            await axios.put(`${API}/messages/read/${chatId}`, {
                readerId: user._id,
            });

            // Emit socket event
            const socket = getSocket();
            socket?.emit("markMessagesRead", {
                chatUserId: chatId,
                readerId: user._id,
            });

            // Scroll to bottom
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch (err) {
            console.error("Load messages failed", err);
        } finally {
            setLoadingMessages(prev => ({ ...prev, [chatId]: false }));
            setRefreshingMessages(false);
        }
    };

    /* ================= SEND MESSAGE ================= */
    const sendMessage = async (
        chatId: string,
        { text = "", imageFile = null, videoFile = null }
    ) => {
        if (!text.trim() && !imageFile && !videoFile) return;
        if (!user?._id) return;

        const tempId = Date.now().toString();
        const tempMessage: Message = {
            _id: tempId,
            senderId: user._id,
            receiverId: chatId,
            text: text || '',
            createdAt: new Date().toISOString(),
            temp: true,
        };

        // Optimistic update
        setMessages(prev => ({
            ...prev,
            [chatId]: [...(prev[chatId] || []), tempMessage],
        }));

        // Scroll to bottom
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        try {
            const formData = new FormData();
            formData.append('senderId', user._id);
            if (text) formData.append('text', text);
            
            if (imageFile) {
                formData.append('image', {
                    uri: imageFile.uri,
                    type: 'image/jpeg',
                    name: 'image.jpg',
                } as any);
            }
            
            if (videoFile) {
                formData.append('video', {
                    uri: videoFile.uri,
                    type: 'video/mp4',
                    name: 'video.mp4',
                } as any);
            }

            const res = await axios.post(`${API}/messages/send/${chatId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            // Replace temp message
            setMessages(prev => ({
                ...prev,
                [chatId]: prev[chatId].map(msg =>
                    msg._id === tempId ? res.data : msg
                ),
            }));

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error("Failed to send message:", error);
            setMessages(prev => ({
                ...prev,
                [chatId]: prev[chatId].map(msg =>
                    msg._id === tempId ? { ...msg, failed: true } : msg
                ),
            }));
        }
    };

    /* ================= MARK MESSAGES AS READ ================= */
    useEffect(() => {
        if (!activeChatId || !messages[activeChatId] || !user?._id) return;

        const unreadMessages = messages[activeChatId].filter(
            msg => msg.receiverId === user._id && !msg.readistrue
        );

        if (unreadMessages.length === 0) return;

        // Optimistic update
        setMessages(prev => ({
            ...prev,
            [activeChatId]: prev[activeChatId].map(msg =>
                msg.receiverId === user._id ? { ...msg, readistrue: true } : msg
            ),
        }));

        // Emit socket event
        const socket = getSocket();
        socket?.emit("markMessagesRead", {
            chatUserId: activeChatId,
            readerId: user._id,
        });

        // Update backend
        axios.put(`${API}/messages/read/${activeChatId}`, { readerId: user._id })
            .catch(err => console.error("Failed to mark messages read:", err));
    }, [activeChatId, messages, user?._id]);

    /* ================= INITIAL LOAD ================= */
    useEffect(() => {
        decodeToken();
    }, []);

    useEffect(() => {
        if (user?._id) {
            fetchChats();
        }
    }, [user?._id]);

    /* ================= TYPING HANDLER ================= */
    const handleTyping = (isTyping: boolean) => {
        const socket = getSocket();
        if (!socket || !activeChatId) return;
        socket.emit("typing", {
            chatUserId: activeChatId,
            isTyping,
        });
    };

    /* ================= REFRESH HANDLERS ================= */
    const onRefreshChats = useCallback(() => {
        setRefreshingChats(true);
        fetchChats(false);
    }, [fetchChats]);

    const onRefreshMessages = useCallback(() => {
        if (!activeChatId) return;
        setRefreshingMessages(true);
        loadMessages(activeChatId, false);
    }, [activeChatId]);

    /* ================= IMAGE GALLERY ================= */
    const openGallery = async (chatId: string) => {
        if (!user?._id) return;

        try {
            const res = await axios.get(`${API}/messages/${chatId}`, {
                params: { myId: user._id },
            });

            const images = res.data
                .filter((m: Message) => m.image)
                .map((m: Message) => m.image);

            setGalleryImages(images);
            setGalleryIndex(0);
            setShowGallery(true);
        } catch (err) {
            console.error("Failed to load gallery:", err);
        }
    };

    /* ================= VIDEO CALL ================= */
    const startCall = async () => {
        if (!activeChatId) return;
        
        const socket = getSocket();
        if (!socket) return;
        
        setShowVideoCall(true);
        
        socket.emit("user:call", {
            toUserId: activeChatId,
            offer: JSON.stringify({ type: "offer" }),
            callerName: user?.name,
        });
    };

    const acceptCall = () => {
        const socket = getSocket();
        if (!socket) return;
        
        setIncomingCall(false);
        setShowVideoCall(true);
        setCallActive(true);
        
        socket.emit("call:accepted", {
            toUserId: callerInfo.userId,
            answer: JSON.stringify({ type: "answer" }),
        });
    };

    const rejectCall = () => {
        const socket = getSocket();
        if (!socket) return;
        
        socket.emit("call:rejected", { toUserId: callerInfo.userId });
        setIncomingCall(false);
    };

    const endCall = () => {
        const socket = getSocket();
        if (!socket) return;
        
        socket.emit("call:end", { toUserId: activeChatId || callerInfo?.userId });
        setCallActive(false);
        setShowVideoCall(false);
        setLocalStream(null);
        setRemoteStream(null);
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
        // Implement audio toggle
    };

    const toggleVideo = () => {
        setIsVideoOff(!isVideoOff);
        // Implement video toggle
    };

    /* ================= FILTER CHATS ================= */
    const filteredChats = chats.filter(chat =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    /* ================= RENDER ================= */
    if (!user) {
        return (
            <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color="#10ca8c" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {sidebarVisible ? (
                /* ================= CHAT LIST SIDEBAR ================= */
                <View style={styles.sidebar}>
                    {/* Header */}
                    <View style={styles.sidebarHeader}>
                        <View style={styles.userInfo}>
                            <Image
                                source={{ uri: user.profile || "https://via.placeholder.com/40" }}
                                style={styles.userAvatar}
                            />
                            <Text style={styles.userName}>{user.name}</Text>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.headerIcon}
                                onPress={() => setActiveTab?.("feed")}
                            >
                                <Ionicons name="add-circle-outline" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Search */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#999"
                        />
                    </View>

                    {/* Connection Status */}
                    {!socketConnected && (
                        <View style={styles.connectionStatus}>
                            <Text style={styles.connectionText}>Connecting...</Text>
                        </View>
                    )}

                    {/* Chat List */}
                    {loadingChats ? (
                        <View style={styles.loadingChats}>
                            <ActivityIndicator size="large" color="#10ca8c" />
                        </View>
                    ) : (
                        <FlatList
                            data={filteredChats}
                            keyExtractor={(item) => item._id}
                            contentContainerStyle={styles.chatList}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshingChats}
                                    onRefresh={onRefreshChats}
                                    colors={["#10ca8c"]}
                                    tintColor="#10ca8c"
                                />
                            }
                            ListEmptyComponent={
                                <View style={styles.emptyChats}>
                                    <Ionicons name="chatbubbles-outline" size={50} color="#ccc" />
                                    <Text style={styles.emptyChatsText}>No chats found</Text>
                                </View>
                            }
                            renderItem={({ item }) => {
                                const isOnline = onlineUsers.includes(item._id);
                                const isTyping = typingUsers[item._id];
                                const chatMessages = messages[item._id] || [];
                                const lastMessage = chatMessages[chatMessages.length - 1];
                                const unreadCount = chatMessages.filter(
                                    m => m.receiverId === user._id && !m.readistrue
                                ).length;

                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.chatItem,
                                            activeChatId === item._id && styles.activeChatItem,
                                        ]}
                                        onPress={() => loadMessages(item._id)}
                                    >
                                        <Image
                                            source={{ uri: item.profile || "https://via.placeholder.com/50" }}
                                            style={styles.chatAvatar}
                                        />
                                        <View style={styles.chatInfo}>
                                            <View style={styles.chatHeader}>
                                                <View style={styles.chatNameContainer}>
                                                    <Text style={styles.chatName}>
                                                        {item.name.length > 20 ? item.name.slice(0, 20) + '...' : item.name}
                                                    </Text>
                                                    {item.role === "owner" && item.verified && (
                                                        <Ionicons name="checkmark-circle" size={14} color="#10ca8c" style={styles.verifiedIcon} />
                                                    )}
                                                </View>
                                                {isTyping ? (
                                                    <Text style={styles.typingText}>typing...</Text>
                                                ) : (
                                                    <Text style={[
                                                        styles.onlineStatus,
                                                        isOnline ? styles.online : styles.offline,
                                                    ]}>
                                                        {isOnline ? "online" : "offline"}
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={styles.chatFooter}>
                                                <Text style={styles.lastMessage} numberOfLines={1}>
                                                    {lastMessage?.text
                                                        ? lastMessage.text
                                                        : lastMessage?.image
                                                        ? "📷 Image"
                                                        : lastMessage?.video
                                                        ? "🎥 Video"
                                                        : "No messages yet"}
                                                </Text>
                                                {unreadCount > 0 && (
                                                    <View style={styles.unreadBadge}>
                                                        <Text style={styles.unreadText}>{unreadCount}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    )}
                </View>
            ) : (
                /* ================= CHAT MAIN ================= */
                <KeyboardAvoidingView
                    style={styles.chatMain}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
                >
                    {/* Chat Header */}
                    <View style={styles.chatHeader}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => {
                                setActiveChatId(null);
                                setSidebarVisible(true);
                            }}
                        >
                            <Ionicons name="arrow-back" size={24} color="#333" />
                        </TouchableOpacity>

                        {activeChatId && (
                            <>
                                <TouchableOpacity 
                                    style={styles.chatUserInfo}
                                    onPress={() => openGallery(activeChatId)}
                                >
                                    <Image
                                        source={{
                                            uri: chats.find(c => c._id === activeChatId)?.profile ||
                                                "https://via.placeholder.com/40",
                                        }}
                                        style={styles.chatUserAvatar}
                                    />
                                    <View>
                                        <Text style={styles.chatUserName}>
                                            {chats.find(c => c._id === activeChatId)?.name}
                                        </Text>
                                        {typingUsers[activeChatId] ? (
                                            <Text style={styles.chatUserTyping}>typing...</Text>
                                        ) : (
                                            <Text style={[
                                                styles.chatUserStatus,
                                                onlineUsers.includes(activeChatId) ? styles.online : styles.offline,
                                            ]}>
                                                {onlineUsers.includes(activeChatId) ? "online" : "offline"}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>

                                <View style={styles.chatActions}>
                                    <TouchableOpacity style={styles.chatAction} onPress={startCall}>
                                        <Ionicons name="videocam-outline" size={24} color="#333" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.chatAction} onPress={() => openGallery(activeChatId)}>
                                        <Ionicons name="images-outline" size={24} color="#333" />
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>

                    {/* Messages */}
                    {activeChatId && (
                        <>
                            {loadingMessages[activeChatId] ? (
                                <View style={styles.loadingMessages}>
                                    <ActivityIndicator size="large" color="#10ca8c" />
                                </View>
                            ) : (
                                <FlatList
                                    ref={flatListRef}
                                    data={messages[activeChatId] || []}
                                    keyExtractor={(item, index) => item._id || index.toString()}
                                    contentContainerStyle={styles.messagesList}
                                    showsVerticalScrollIndicator={false}
                                    refreshControl={
                                        <RefreshControl
                                            refreshing={refreshingMessages}
                                            onRefresh={onRefreshMessages}
                                            colors={["#10ca8c"]}
                                            tintColor="#10ca8c"
                                        />
                                    }
                                    onContentSizeChange={() => {
                                        flatListRef.current?.scrollToEnd({ animated: true });
                                    }}
                                    renderItem={({ item }) => {
                                        const isMine = item.senderId === user._id;
                                        const showImage = item.image;
                                        const showVideo = item.video;

                                        return (
                                            <View style={[
                                                styles.messageWrapper,
                                                isMine ? styles.myMessage : styles.theirMessage,
                                            ]}>
                                                {showImage && (
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            setGalleryImages([item.image!]);
                                                            setGalleryIndex(0);
                                                            setShowGallery(true);
                                                        }}
                                                    >
                                                        <Image
                                                            source={{ uri: item.image }}
                                                            style={styles.messageImage}
                                                        />
                                                    </TouchableOpacity>
                                                )}
                                                {showVideo && (
                                                    <Video
                                                        source={{ uri: item.video }}
                                                        style={styles.messageVideo}
                                                        useNativeControls
                                                        resizeMode={ResizeMode.CONTAIN}
                                                        shouldPlay={false}
                                                    />
                                                )}
                                                {item.text && (
                                                    <Text style={[
                                                        styles.messageText,
                                                        isMine ? styles.myMessageText : styles.theirMessageText,
                                                    ]}>
                                                        {item.text}
                                                    </Text>
                                                )}
                                                <View style={styles.messageMeta}>
                                                    <Text style={styles.messageTime}>
                                                        {new Date(item.createdAt).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </Text>
                                                    {isMine && item.readistrue && (
                                                        <Ionicons name="checkmark-done" size={16} color="#10ca8c" />
                                                    )}
                                                    {item.failed && (
                                                        <Text style={styles.failedText}>Failed</Text>
                                                    )}
                                                </View>
                                            </View>
                                        );
                                    }}
                                />
                            )}

                            {/* Chat Input */}
                            <ChatInput
                                onSend={(text, imageFile, videoFile) =>
                                    sendMessage(activeChatId, { text, imageFile, videoFile })
                                }
                                onTyping={handleTyping}
                            />
                        </>
                    )}
                </KeyboardAvoidingView>
            )}

            {/* Image Gallery Modal */}
            <Modal visible={showGallery} transparent={true} animationType="fade">
                <View style={styles.galleryOverlay}>
                    <View style={styles.galleryContainer}>
                        <TouchableOpacity
                            style={styles.galleryClose}
                            onPress={() => setShowGallery(false)}
                        >
                            <Ionicons name="close" size={30} color="#fff" />
                        </TouchableOpacity>

                        <Text style={styles.galleryCounter}>
                            {galleryIndex + 1} / {galleryImages.length}
                        </Text>

                        <Image
                            source={{ uri: galleryImages[galleryIndex] }}
                            style={styles.galleryImage}
                            resizeMode="contain"
                        />

                        <View style={styles.galleryControls}>
                            <TouchableOpacity
                                style={styles.galleryControl}
                                disabled={galleryIndex === 0}
                                onPress={() => setGalleryIndex(i => i - 1)}
                            >
                                <Ionicons name="chevron-back" size={30} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.galleryControl}
                                disabled={galleryIndex === galleryImages.length - 1}
                                onPress={() => setGalleryIndex(i => i + 1)}
                            >
                                <Ionicons name="chevron-forward" size={30} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Incoming Call Modal */}
            <Modal visible={incomingCall} transparent={true} animationType="slide">
                <View style={styles.callOverlay}>
                    <View style={styles.callContainer}>
                        <Text style={styles.callTitle}>Incoming Video Call</Text>
                        <Text style={styles.callerName}>{callerInfo?.name}</Text>
                        <View style={styles.callActions}>
                            <TouchableOpacity
                                style={[styles.callButton, styles.acceptButton]}
                                onPress={acceptCall}
                            >
                                <Ionicons name="videocam" size={30} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.callButton, styles.rejectButton]}
                                onPress={rejectCall}
                            >
                                <Ionicons name="close" size={30} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Video Call Modal */}
            <Modal visible={showVideoCall} transparent={true} animationType="slide">
                <View style={styles.videoCallOverlay}>
                    <View style={styles.videoCallContainer}>
                        {/* Remote Video */}
                        <View style={styles.remoteVideo}>
                            {remoteStream ? (
                                <Text>Remote Video</Text>
                            ) : (
                                <View style={styles.waitingContainer}>
                                    <ActivityIndicator size="large" color="#fff" />
                                    <Text style={styles.waitingText}>Waiting for answer...</Text>
                                </View>
                            )}
                        </View>

                        {/* Local Video */}
                        <View style={styles.localVideo}>
                            {localStream ? (
                                <Text>Local Video</Text>
                            ) : (
                                <View style={styles.localVideoPlaceholder}>
                                    <Ionicons name="videocam-off" size={30} color="#fff" />
                                </View>
                            )}
                        </View>

                        {/* Call Controls */}
                        <View style={styles.videoCallControls}>
                            <TouchableOpacity style={styles.videoCallControl} onPress={toggleMute}>
                                <Ionicons
                                    name={isMuted ? "mic-off" : "mic"}
                                    size={24}
                                    color="#fff"
                                />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.videoCallControl} onPress={toggleVideo}>
                                <Ionicons
                                    name={isVideoOff ? "videocam-off" : "videocam"}
                                    size={24}
                                    color="#fff"
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.videoCallControl, styles.endCallControl]}
                                onPress={endCall}
                            >
                                <Ionicons name="call" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

/* ================= MAIN SCREEN ================= */

export default function ChatScreen({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
    return (
        <SafeAreaProvider>
            <ChatScreenContent setActiveTab={setActiveTab} />
        </SafeAreaProvider>
    );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    /* Sidebar */
    sidebar: {
        flex: 1,
        backgroundColor: "#fff",
    },
    sidebarHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    userInfo: {
        flexDirection: "row",
        alignItems: "center",
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    headerActions: {
        flexDirection: "row",
    },
    headerIcon: {
        marginLeft: 16,
    },
    connectionStatus: {
        backgroundColor: "#fff3cd",
        padding: 8,
        alignItems: "center",
    },
    connectionText: {
        color: "#856404",
        fontSize: 12,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 8,
        height: 40,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: "#333",
    },
    loadingChats: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    chatList: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    emptyChats: {
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyChatsText: {
        marginTop: 10,
        fontSize: 14,
        color: "#999",
    },
    chatItem: {
        flexDirection: "row",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f5f5f5",
    },
    activeChatItem: {
        backgroundColor: "#f0fff9",
    },
    chatAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    chatInfo: {
        flex: 1,
    },
    chatHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    chatNameContainer: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    chatName: {
        fontSize: 15,
        fontWeight: "600",
        color: "#333",
        marginRight: 4,
    },
    verifiedIcon: {
        marginLeft: 2,
    },
    typingText: {
        fontSize: 11,
        color: "#10ca8c",
        fontStyle: "italic",
    },
    onlineStatus: {
        fontSize: 11,
    },
    online: {
        color: "#10ca8c",
    },
    offline: {
        color: "#999",
    },
    chatFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    lastMessage: {
        flex: 1,
        fontSize: 13,
        color: "#666",
        marginRight: 8,
    },
    unreadBadge: {
        backgroundColor: "#10ca8c",
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    unreadText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "600",
    },
    /* Chat Main */
    chatMain: {
        flex: 1,
        backgroundColor: "#fafafa",
    },
    chatHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    backButton: {
        marginRight: 12,
    },
    chatUserInfo: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
    },
    chatUserAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    chatUserName: {
        fontSize: 15,
        fontWeight: "600",
        color: "#333",
    },
    chatUserTyping: {
        fontSize: 11,
        color: "#10ca8c",
        fontStyle: "italic",
    },
    chatUserStatus: {
        fontSize: 11,
    },
    chatActions: {
        flexDirection: "row",
    },
    chatAction: {
        marginLeft: 16,
    },
    loadingMessages: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    messagesList: {
        padding: 16,
        paddingBottom: 20,
    },
    messageWrapper: {
        marginBottom: 12,
        maxWidth: "80%",
    },
    myMessage: {
        alignSelf: "flex-end",
    },
    theirMessage: {
        alignSelf: "flex-start",
    },
    messageText: {
        fontSize: 14,
        padding: 12,
        borderRadius: 18,
        overflow: "hidden",
    },
    myMessageText: {
        backgroundColor: "#10ca8c",
        color: "#fff",
    },
    theirMessageText: {
        backgroundColor: "#f0f0f0",
        color: "#333",
    },
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: 12,
        marginBottom: 4,
    },
    messageVideo: {
        width: 200,
        height: 200,
        borderRadius: 12,
        marginBottom: 4,
        backgroundColor: "#000",
    },
    messageMeta: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        marginTop: 4,
        gap: 4,
    },
    messageTime: {
        fontSize: 10,
        color: "#999",
    },
    failedText: {
        fontSize: 10,
        color: "#ff4444",
    },
    /* Input */
    inputContainer: {
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    previewContainer: {
        flexDirection: "row",
        marginBottom: 12,
    },
    previewItem: {
        position: "relative",
        marginRight: 12,
    },
    previewImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    previewVideo: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: "#000",
    },
    removePreview: {
        position: "absolute",
        top: -6,
        right: -6,
        backgroundColor: "#fff",
        borderRadius: 10,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    attachButton: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        backgroundColor: "#f5f5f5",
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 14,
        marginRight: 12,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#10ca8c",
        justifyContent: "center",
        alignItems: "center",
    },
    sendButtonDisabled: {
        backgroundColor: "#ccc",
    },
    /* Gallery Modal */
    galleryOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.9)",
        justifyContent: "center",
        alignItems: "center",
    },
    galleryContainer: {
        width: width,
        height: height,
        position: "relative",
    },
    galleryClose: {
        position: "absolute",
        top: 50,
        right: 20,
        zIndex: 10,
        backgroundColor: "rgba(0,0,0,0.5)",
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    galleryCounter: {
        position: "absolute",
        top: 50,
        left: 20,
        zIndex: 10,
        color: "#fff",
        fontSize: 14,
        backgroundColor: "rgba(0,0,0,0.5)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    galleryImage: {
        width: width,
        height: height,
    },
    galleryControls: {
        position: "absolute",
        bottom: 50,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
    },
    galleryControl: {
        backgroundColor: "rgba(0,0,0,0.5)",
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
    },
    /* Call Modals */
    callOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.8)",
        justifyContent: "center",
        alignItems: "center",
    },
    callContainer: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
        width: width * 0.8,
    },
    callTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#333",
        marginBottom: 8,
    },
    callerName: {
        fontSize: 18,
        color: "#10ca8c",
        marginBottom: 24,
    },
    callActions: {
        flexDirection: "row",
        gap: 20,
    },
    callButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
    },
    acceptButton: {
        backgroundColor: "#4caf50",
    },
    rejectButton: {
        backgroundColor: "#f44336",
    },
    videoCallOverlay: {
        flex: 1,
        backgroundColor: "#000",
    },
    videoCallContainer: {
        flex: 1,
        position: "relative",
    },
    remoteVideo: {
        flex: 1,
        backgroundColor: "#111",
        justifyContent: "center",
        alignItems: "center",
    },
    localVideo: {
        position: "absolute",
        top: 50,
        right: 20,
        width: 120,
        height: 160,
        backgroundColor: "#222",
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#10ca8c",
        overflow: "hidden",
    },
    localVideoPlaceholder: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    waitingContainer: {
        alignItems: "center",
    },
    waitingText: {
        color: "#fff",
        marginTop: 12,
        fontSize: 14,
    },
    videoCallControls: {
        position: "absolute",
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "center",
        gap: 20,
    },
    videoCallControl: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    endCallControl: {
        backgroundColor: "#f44336",
    },
});