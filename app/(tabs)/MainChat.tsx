// import React, { useState, useEffect, useRef, useCallback } from "react";
// import {
//     View,
//     Text,
//     StyleSheet,
//     FlatList,
//     Image,
//     TouchableOpacity,
//     ActivityIndicator,
//     TextInput,
//     KeyboardAvoidingView,
//     Platform,
//     Modal,
//     StatusBar,
//     SafeAreaView,
//     Dimensions,
//     Alert,
//     RefreshControl,
//     Keyboard,
//     Animated,
//     KeyboardEvent,
// } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import axios from "axios";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { useRouter, useLocalSearchParams } from "expo-router";
// import * as ImagePicker from "expo-image-picker";
// import { Video, ResizeMode } from "expo-av";
// import { connectSocket, getSocket, disconnectSocket } from "../me";
// import * as Haptics from "expo-haptics";
// import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
// import { Linking } from "react-native";
// const { width, height } = Dimensions.get('window');
// const API = "https://vizit-backend-hubw.onrender.com/api";

// /* ================= TYPES ================= */

// type User = {
//     _id: string;
//     name: string;
//     email: string;
//     profile: string;
//     role?: string;
//     verified?: boolean;
//     allchatsId?: string[];
// };

// type Message = {
//     _id?: string;
//     senderId: string;
//     receiverId: string;
//     text?: string;
//     image?: string;
//     video?: string;
//     audio?: string;
//     createdAt: string;
//     readistrue?: boolean;
//     temp?: boolean;
//     failed?: boolean;
// };

// type ChatUser = {
//     _id: string;
//     name: string;
//     email: string;
//     profile: string;
//     role?: string;
//     verified?: boolean;
//     lastMessage?: string;
// };

// /* ================= CHAT INPUT COMPONENT ================= */

// interface ChatInputProps {
//     onSend: (text: string, imageFile: any, videoFile: any) => void;
//     onTyping: (isTyping: boolean) => void;
//     keyboardHeight?: number;
// }

// const ChatInput = ({ onSend, onTyping, keyboardHeight = 0 }: ChatInputProps) => {
//     const [message, setMessage] = useState("");
//     const [imageFile, setImageFile] = useState<any>(null);
//     const [videoFile, setVideoFile] = useState<any>(null);
//     const inputRef = useRef<TextInput>(null);

//     const handleSend = () => {
//         if (!message.trim() && !imageFile && !videoFile) return;
//         onSend(message, imageFile, videoFile);
//         setMessage("");
//         setImageFile(null);
//         setVideoFile(null);
//         onTyping(false);
//         Keyboard.dismiss();
//     };

//     const pickImage = async () => {
//         const result = await ImagePicker.launchImageLibraryAsync({
//             mediaTypes: ImagePicker.MediaTypeOptions.Images,
//             quality: 0.7,
//             allowsEditing: true,
//         });
//         if (!result.canceled) {
//             setImageFile(result.assets[0]);
//         }
//     };

//     const pickVideo = async () => {
//         const result = await ImagePicker.launchImageLibraryAsync({
//             mediaTypes: ImagePicker.MediaTypeOptions.Videos,
//             quality: 0.7,
//             allowsEditing: true,
//         });
//         if (!result.canceled) {
//             setVideoFile(result.assets[0]);
//         }
//     };

//     return (
//         <View style={[
//             styles.inputContainer,
//             keyboardHeight > 0 && { marginBottom: keyboardHeight * 0.5 } // Add margin to push input up
//         ]}>
//             {(imageFile || videoFile) && (
//                 <View style={styles.previewContainer}>
//                     {imageFile && (
//                         <View style={styles.previewItem}>
//                             <Image source={{ uri: imageFile.uri }} style={styles.previewImage} />
//                             <TouchableOpacity
//                                 style={styles.removePreview}
//                                 onPress={() => setImageFile(null)}
//                             >
//                                 <Ionicons name="close-circle" size={20} color="#ff4444" />
//                             </TouchableOpacity>
//                         </View>
//                     )}
//                     {videoFile && (
//                         <View style={styles.previewItem}>
//                             <Video
//                                 source={{ uri: videoFile.uri }}
//                                 style={styles.previewVideo}
//                                 shouldPlay={false}
//                                 useNativeControls
//                             />
//                             <TouchableOpacity
//                                 style={styles.removePreview}
//                                 onPress={() => setVideoFile(null)}
//                             >
//                                 <Ionicons name="close-circle" size={20} color="#ff4444" />
//                             </TouchableOpacity>
//                         </View>
//                     )}
//                 </View>
//             )}

//             <View style={styles.inputRow}>
//                 <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
//                     <Ionicons name="image-outline" size={24} color="#10ca8c" />
//                 </TouchableOpacity>

//                 <TouchableOpacity style={styles.attachButton} onPress={pickVideo}>
//                     <Ionicons name="videocam-outline" size={24} color="#10ca8c" />
//                 </TouchableOpacity>

//                 <TextInput
//                     ref={inputRef}
//                     style={styles.textInput}
//                     placeholder="Type a message..."
//                     placeholderTextColor="#999"
//                     value={message}
//                     onChangeText={(text) => {
//                         setMessage(text);
//                         onTyping(text.length > 0);
//                     }}
//                     multiline
//                     maxLength={1000}
//                 />

//                 <TouchableOpacity
//                     style={[
//                         styles.sendButton,
//                         (!message.trim() && !imageFile && !videoFile) && styles.sendButtonDisabled,
//                     ]}
//                     onPress={handleSend}
//                     disabled={!message.trim() && !imageFile && !videoFile}
//                 >
//                     <Ionicons name="send" size={20} color="#fff" />
//                 </TouchableOpacity>
//             </View>
//         </View>
//     );
// };

// /* ================= MAIN CHAT SCREEN CONTENT ================= */

// function ChatScreenContent({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
//     const insets = useSafeAreaInsets();
//     const router = useRouter();
//     const params = useLocalSearchParams<{ chatid?: string }>();

//     const [user, setUser] = useState<User | null>(null);
//     const [chats, setChats] = useState<ChatUser[]>([]);
//     const [messages, setMessages] = useState<Record<string, Message[]>>({});
//     const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
//     const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
//     const [activeChatId, setActiveChatId] = useState<string | null>(params.chatid || null);
//     const [loadingChats, setLoadingChats] = useState(true);
//     const [loadingMessages, setLoadingMessages] = useState<Record<string, boolean>>({});
//     const [refreshingChats, setRefreshingChats] = useState(false);
//     const [refreshingMessages, setRefreshingMessages] = useState(false);
//     const [searchQuery, setSearchQuery] = useState("");
//     const [sidebarVisible, setSidebarVisible] = useState(!params.chatid);
//     const [showGallery, setShowGallery] = useState(false);
//     const [galleryImages, setGalleryImages] = useState<string[]>([]);
//     const [galleryIndex, setGalleryIndex] = useState(0);
//     const [incomingCall, setIncomingCall] = useState(false);
//     const [callerInfo, setCallerInfo] = useState<any>(null);
//     const [socketConnected, setSocketConnected] = useState(false);
//     const [keyboardHeight, setKeyboardHeight] = useState(0);

//     const flatListRef = useRef<FlatList>(null);
//     const keyboardShowListener = useRef<any>(null);
//     const keyboardHideListener = useRef<any>(null);
//     const translateY = useRef(new Animated.Value(0)).current;

//     /* ================= KEYBOARD HANDLERS ================= */
//     useEffect(() => {
//         keyboardShowListener.current = Keyboard.addListener(
//             Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
//             (e: KeyboardEvent) => {
//                 // Calculate half screen position
//                 const halfScreenHeight = height / 2;
//                 const keyboardEndY = e.endCoordinates.screenY;
//                 // const targetPosition = keyboardEndY - halfScreenHeight;
//                 const targetPosition = (keyboardEndY - halfScreenHeight);

//                 setKeyboardHeight(e.endCoordinates.height);

//                 // Animate the input to halfway up
//                 Animated.spring(translateY, {
//                     toValue: -targetPosition,
//                     useNativeDriver: true,
//                     tension: 80,
//                     friction: 10,
//                 }).start();

//                 // Scroll to bottom when keyboard appears
//                 setTimeout(() => {
//                     flatListRef.current?.scrollToEnd({ animated: true });
//                 }, 100);
//             }
//         );

//         keyboardHideListener.current = Keyboard.addListener(
//             Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
//             () => {
//                 setKeyboardHeight(0);

//                 // Animate back to original position
//                 Animated.spring(translateY, {
//                     toValue: 0,
//                     useNativeDriver: true,
//                     tension: 80,
//                     friction: 10,
//                 }).start();
//             }
//         );

//         return () => {
//             keyboardShowListener.current?.remove();
//             keyboardHideListener.current?.remove();
//         };
//     }, []);

//     /* ================= URL PARAMS HANDLER ================= */
//     useEffect(() => {
//         if (params.chatid && user?._id) {
//             setActiveChatId(params.chatid);
//             setSidebarVisible(false);
//             loadMessages(params.chatid, true);

//             // Update URL without reloading
//             router.setParams({ chatid: params.chatid });
//         }
//     }, [params.chatid, user?._id]);

//     /* ================= CONNECT SOCKET ================= */
//     useEffect(() => {
//         if (!user?._id) return;

//         const socket = connectSocket(user._id, (onlineIds: string[]) => {
//             setOnlineUsers(onlineIds);
//         });

//         if (socket) {
//             setSocketConnected(true);

//             socket.on("connect", () => {
//                 console.log("Socket connected");
//                 setSocketConnected(true);
//             });

//             socket.on("disconnect", () => {
//                 console.log("Socket disconnected");
//                 setSocketConnected(false);
//             });
//         }

//         return () => {
//             disconnectSocket();
//         };
//     }, [user?._id]);


//     const Openweb = async () => {
//         if (!activeChatId) return;

//         try {
//             // Get token from AsyncStorage
//             const token = await AsyncStorage.getItem("userToken");

//             if (!token) {
//                 Alert.alert("Error", "No authentication token found");
//                 return;
//             }

//             // Get user role (default to "owner" as specified)
//             const role = "owner";

//             // Get user ID
//             const userId = user?._id;

//             if (!userId) {
//                 Alert.alert("Error", "User ID not found");
//                 return;
//             }

//             // Construct the URL with parameters
//             const url = `https://www.vizit.homes/chat?role=${role}&token=${encodeURIComponent(token)}&id=${userId}&chatid=${activeChatId}`;

//             // Check if the URL can be opened
//             const supported = await Linking.canOpenURL(url);

//             if (supported) {
//                 // Open in external browser
//                 await Linking.openURL(url);
//             } else {
//                 Alert.alert("Error", "Cannot open URL");
//             }

//         } catch (error) {
//             console.error("Failed to start call:", error);
//             Alert.alert("Error", "Failed to initiate call");
//         }
//     };

//     /* ================= SOCKET EVENT LISTENERS ================= */
//     useEffect(() => {
//         if (!user?._id) return;

//         const socket = getSocket();
//         if (!socket) return;

//         socket.emit("registerUser", user._id);

//         socket.on("typingStatus", ({ byUserId, isTyping }: { byUserId: string; isTyping: boolean }) => {
//             setTypingUsers(prev => ({ ...prev, [byUserId]: isTyping }));
//         });

//         socket.on("newMessage", (msg: Message) => {
//             const chatId = msg.senderId === user._id ? msg.receiverId : msg.senderId;

//             setMessages(prev => {
//                 const existing = prev[chatId] || [];
//                 const filtered = existing.filter(m => !(m.temp && m.senderId === msg.senderId));
//                 if (filtered.some(m => m._id === msg._id)) return prev;

//                 const updated = { ...prev, [chatId]: [...filtered, msg] };

//                 if (chatId === activeChatId) {
//                     setTimeout(() => {
//                         flatListRef.current?.scrollToEnd({ animated: true });
//                     }, 100);
//                 }

//                 return updated;
//             });

//             Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
//         });

//         socket.on("messagesRead", ({ byUserId }: { byUserId: string }) => {
//             setMessages(prev => {
//                 const updated = { ...prev };
//                 Object.keys(updated).forEach(chatId => {
//                     updated[chatId] = updated[chatId].map(m =>
//                         m.senderId === user._id && m.receiverId === byUserId
//                             ? { ...m, readistrue: true }
//                             : m
//                     );
//                 });
//                 return updated;
//             });
//         });

//         // Handle incoming calls with Alert (no WebRTC)
//         socket.on("incoming:call", ({ fromUserId, callerName }) => {
//             setCallerInfo({ userId: fromUserId, name: callerName });
//             setIncomingCall(true);

//             Alert.alert(
//                 "Incoming Call",
//                 `${callerName} is calling you. Video calls are not available in Expo Go.`,
//                 [
//                     {
//                         text: "OK",
//                         onPress: () => {
//                             socket?.emit("call:rejected", { toUserId: fromUserId });
//                             setIncomingCall(false);
//                         },
//                         style: "cancel"
//                     }
//                 ]
//             );

//             Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
//         });

//         socket.on("call:accepted", () => {
//             Alert.alert("Call Connected", "Call accepted but WebRTC not available in Expo Go");
//         });

//         socket.on("call:rejected", () => {
//             Alert.alert("Call Rejected", "The user declined your call");
//         });

//         socket.on("call:end", () => {
//             Alert.alert("Call Ended", "The call has ended");
//         });

//         return () => {
//             socket.off("typingStatus");
//             socket.off("newMessage");
//             socket.off("messagesRead");
//             socket.off("incoming:call");
//             socket.off("call:accepted");
//             socket.off("call:rejected");
//             socket.off("call:end");
//         };
//     }, [user?._id, activeChatId]);

//     /* ================= DECODE TOKEN ================= */
//     const decodeToken = useCallback(async () => {
//         try {
//             const token = await AsyncStorage.getItem("userToken");
//             if (!token) {
//                 router.push("/Login");
//                 return;
//             }

//             const res = await axios.get(`${API}/owner/decode/token/owner`, {
//                 headers: { Authorization: `Bearer ${token}` },
//             });

//             setUser(res.data.res);
//             await AsyncStorage.setItem("userId", res.data.res._id);
//         } catch (err) {
//             console.error("Decode token failed", err);
//             router.push("/Login");
//         }
//     }, []);

//     /* ================= FETCH CHAT USERS ================= */
//     const fetchChats = useCallback(async (showLoading = true) => {
//         if (!user?._id) return;

//         if (showLoading) setLoadingChats(true);

//         try {
//             const res = await axios.get(`${API}/messages/users/${user._id}`);
//             const { filteredUsers, filteredOwners } = res.data;
//             setChats([...filteredOwners, ...filteredUsers]);
//         } catch (err) {
//             console.error("Fetch chats failed", err);
//         } finally {
//             setLoadingChats(false);
//             setRefreshingChats(false);
//         }
//     }, [user?._id]);

//     /* ================= LOAD MESSAGES ================= */
//     const loadMessages = async (chatId: string, showLoading = true) => {
//         if (!user?._id) return;

//         setActiveChatId(chatId);
//         setSidebarVisible(false);

//         // Update URL with chatId
//         router.setParams({ chatid: chatId });

//         if (showLoading) {
//             setLoadingMessages(prev => ({ ...prev, [chatId]: true }));
//         }

//         try {
//             const res = await axios.get(`${API}/messages/${chatId}`, {
//                 params: { myId: user._id },
//             });

//             setMessages(prev => ({ ...prev, [chatId]: res.data }));

//             await axios.put(`${API}/messages/read/${chatId}`, {
//                 readerId: user._id,
//             });

//             const socket = getSocket();
//             socket?.emit("markMessagesRead", {
//                 chatUserId: chatId,
//                 readerId: user._id,
//             });

//             setTimeout(() => {
//                 flatListRef.current?.scrollToEnd({ animated: true });
//             }, 100);
//         } catch (err) {
//             console.error("Load messages failed", err);
//         } finally {
//             setLoadingMessages(prev => ({ ...prev, [chatId]: false }));
//             setRefreshingMessages(false);
//         }
//     };

//     /* ================= SEND MESSAGE ================= */
//     const sendMessage = async (
//         chatId: string,
//         { text = "", imageFile = null, videoFile = null }
//     ) => {
//         if (!text.trim() && !imageFile && !videoFile) return;
//         if (!user?._id) return;

//         const tempId = Date.now().toString();
//         const tempMessage: Message = {
//             _id: tempId,
//             senderId: user._id,
//             receiverId: chatId,
//             text: text || '',
//             createdAt: new Date().toISOString(),
//             temp: true,
//         };

//         setMessages(prev => ({
//             ...prev,
//             [chatId]: [...(prev[chatId] || []), tempMessage],
//         }));

//         setTimeout(() => {
//             flatListRef.current?.scrollToEnd({ animated: true });
//         }, 100);

//         try {
//             const formData = new FormData();
//             formData.append('senderId', user._id);
//             if (text) formData.append('text', text);

//             if (imageFile) {
//                 formData.append('image', {
//                     uri: imageFile.uri,
//                     type: 'image/jpeg',
//                     name: 'image.jpg',
//                 } as any);
//             }

//             if (videoFile) {
//                 formData.append('video', {
//                     uri: videoFile.uri,
//                     type: 'video/mp4',
//                     name: 'video.mp4',
//                 } as any);
//             }

//             const res = await axios.post(`${API}/messages/send/${chatId}`, formData, {
//                 headers: { 'Content-Type': 'multipart/form-data' },
//             });

//             setMessages(prev => ({
//                 ...prev,
//                 [chatId]: prev[chatId].map(msg =>
//                     msg._id === tempId ? res.data : msg
//                 ),
//             }));

//             Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
//         } catch (error) {
//             console.error("Failed to send message:", error);
//             setMessages(prev => ({
//                 ...prev,
//                 [chatId]: prev[chatId].map(msg =>
//                     msg._id === tempId ? { ...msg, failed: true } : msg
//                 ),
//             }));
//         }
//     };

//     /* ================= MARK MESSAGES AS READ ================= */
//     useEffect(() => {
//         if (!activeChatId || !messages[activeChatId] || !user?._id) return;

//         const unreadMessages = messages[activeChatId].filter(
//             msg => msg.receiverId === user._id && !msg.readistrue
//         );

//         if (unreadMessages.length === 0) return;

//         setMessages(prev => ({
//             ...prev,
//             [activeChatId]: prev[activeChatId].map(msg =>
//                 msg.receiverId === user._id ? { ...msg, readistrue: true } : msg
//             ),
//         }));

//         const socket = getSocket();
//         socket?.emit("markMessagesRead", {
//             chatUserId: activeChatId,
//             readerId: user._id,
//         });

//         axios.put(`${API}/messages/read/${activeChatId}`, { readerId: user._id })
//             .catch(err => console.error("Failed to mark messages read:", err));
//     }, [activeChatId, messages, user?._id]);

//     /* ================= INITIAL LOAD ================= */
//     useEffect(() => {
//         decodeToken();
//     }, []);

//     useEffect(() => {
//         if (user?._id) {
//             fetchChats();
//         }
//     }, [user?._id]);

//     /* ================= TYPING HANDLER ================= */
//     const handleTyping = (isTyping: boolean) => {
//         const socket = getSocket();
//         if (!socket || !activeChatId) return;
//         socket.emit("typing", {
//             chatUserId: activeChatId,
//             isTyping,
//         });
//     };

//     /* ================= REFRESH HANDLERS ================= */
//     const onRefreshChats = useCallback(() => {
//         setRefreshingChats(true);
//         fetchChats(false);
//     }, [fetchChats]);

//     const onRefreshMessages = useCallback(() => {
//         if (!activeChatId) return;
//         setRefreshingMessages(true);
//         loadMessages(activeChatId, false);
//     }, [activeChatId]);

//     /* ================= IMAGE GALLERY ================= */
//     const openGallery = async (chatId: string) => {
//         if (!user?._id) return;

//         try {
//             const res = await axios.get(`${API}/messages/${chatId}`, {
//                 params: { myId: user._id },
//             });

//             const images = res.data
//                 .filter((m: Message) => m.image)
//                 .map((m: Message) => m.image);

//             setGalleryImages(images);
//             setGalleryIndex(0);
//             setShowGallery(true);
//         } catch (err) {
//             console.error("Failed to load gallery:", err);
//         }
//     };

//     /* ================= START CALL ================= */
//     const startCall = () => {
//         if (!activeChatId) return;

//         Alert.alert(
//             "Video Call",
//             "Video calls require a development build with react-native-webrtc installed.\n\nFor now, you can send messages and media files.",
//             [{ text: "OK" }]
//         );
//     };

//     /* ================= FILTER CHATS ================= */
//     const filteredChats = chats.filter(chat =>
//         chat.name.toLowerCase().includes(searchQuery.toLowerCase())
//     );

//     /* ================= HANDLE BACK TO SIDEBAR ================= */
//     const handleBackToSidebar = () => {
//         setActiveChatId(null);
//         setSidebarVisible(true);
//         // Remove chatid from URL
//         router.setParams({});
//     };

//     /* ================= RENDER ================= */
//     if (!user) {
//         return (
//             <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
//                 <ActivityIndicator size="large" color="#10ca8c" />
//             </View>
//         );
//     }

//     return (
//         <SafeAreaProvider>
//             <View style={[styles.container, { paddingTop: insets.top }]}>
//                 <StatusBar barStyle="dark-content" backgroundColor="#fff" />

//                 {sidebarVisible ? (
//                     <View style={styles.sidebar}>
//                         <View style={styles.sidebarHeader}>
//                             <View style={styles.userInfo}>
//                                 <Image
//                                     source={{ uri: user.profile || "https://via.placeholder.com/40" }}
//                                     style={styles.userAvatar}
//                                 />
//                                 <Text style={styles.userName}>{user.name}</Text>
//                             </View>
//                             <View style={styles.headerActions}>
//                                 <TouchableOpacity
//                                     style={styles.headerIcon}
//                                     onPress={() => setActiveTab?.("feed")}
//                                 >
//                                     <Ionicons name="add-circle-outline" size={24} color="#333" />
//                                 </TouchableOpacity>
//                             </View>
//                         </View>

//                         <View style={styles.searchContainer}>
//                             <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
//                             <TextInput
//                                 style={styles.searchInput}
//                                 placeholder="Search chats..."
//                                 value={searchQuery}
//                                 onChangeText={setSearchQuery}
//                                 placeholderTextColor="#999"
//                             />
//                         </View>

//                         {!socketConnected && (
//                             <View style={styles.connectionStatus}>
//                                 <Text style={styles.connectionText}>Connecting...</Text>
//                             </View>
//                         )}

//                         {loadingChats ? (
//                             <View style={styles.loadingChats}>
//                                 <ActivityIndicator size="large" color="#10ca8c" />
//                             </View>
//                         ) : (
//                             <FlatList
//                                 data={filteredChats}
//                                 keyExtractor={(item) => item._id}
//                                 contentContainerStyle={styles.chatList}
//                                 refreshControl={
//                                     <RefreshControl
//                                         refreshing={refreshingChats}
//                                         onRefresh={onRefreshChats}
//                                         colors={["#10ca8c"]}
//                                         tintColor="#10ca8c"
//                                     />
//                                 }
//                                 ListEmptyComponent={
//                                     <View style={styles.emptyChats}>
//                                         <Ionicons name="chatbubbles-outline" size={50} color="#ccc" />
//                                         <Text style={styles.emptyChatsText}>No chats found</Text>
//                                     </View>
//                                 }
//                                 renderItem={({ item }) => {
//                                     const isOnline = onlineUsers.includes(item._id);
//                                     const isTyping = typingUsers[item._id];
//                                     const chatMessages = messages[item._id] || [];
//                                     const lastMessage = chatMessages[chatMessages.length - 1];
//                                     const unreadCount = chatMessages.filter(
//                                         m => m.receiverId === user._id && !m.readistrue
//                                     ).length;

//                                     return (
//                                         <TouchableOpacity
//                                             style={[
//                                                 styles.chatItem,
//                                                 activeChatId === item._id && styles.activeChatItem,
//                                             ]}
//                                             onPress={() => loadMessages(item._id)}
//                                         >
//                                             <Image
//                                                 source={{ uri: item.profile || "https://via.placeholder.com/50" }}
//                                                 style={styles.chatAvatar}
//                                             />
//                                             <View style={styles.chatInfo}>
//                                                 <View style={styles.chatHeader}>
//                                                     <View style={styles.chatNameContainer}>
//                                                         <Text style={styles.chatName}>
//                                                             {item.name.length > 20 ? item.name.slice(0, 20) + '...' : item.name}
//                                                         </Text>
//                                                         {item.role === "owner" && item.verified && (
//                                                             <Ionicons name="checkmark-circle" size={14} color="#10ca8c" style={styles.verifiedIcon} />
//                                                         )}
//                                                     </View>
//                                                     {isTyping ? (
//                                                         <Text style={styles.typingText}>typing...</Text>
//                                                     ) : (
//                                                         <Text style={[
//                                                             styles.onlineStatus,
//                                                             isOnline ? styles.online : styles.offline,
//                                                         ]}>
//                                                             {isOnline ? "online" : "offline"}
//                                                         </Text>
//                                                     )}
//                                                 </View>
//                                                 <View style={styles.chatFooter}>
//                                                     <Text style={styles.lastMessage} numberOfLines={1}>
//                                                         {lastMessage?.text
//                                                             ? lastMessage.text
//                                                             : lastMessage?.image
//                                                                 ? "📷 Image"
//                                                                 : lastMessage?.video
//                                                                     ? "🎥 Video"
//                                                                     : "No messages yet"}
//                                                     </Text>
//                                                     {unreadCount > 0 && (
//                                                         <View style={styles.unreadBadge}>
//                                                             <Text style={styles.unreadText}>{unreadCount}</Text>
//                                                         </View>
//                                                     )}
//                                                 </View>
//                                             </View>
//                                         </TouchableOpacity>
//                                     );
//                                 }}
//                             />
//                         )}
//                     </View>
//                 ) : (
//                     <KeyboardAvoidingView
//                         style={styles.chatMain}
//                         behavior={Platform.OS === "ios" ? "padding" : "height"}
//                         keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 60 : insets.top + 20}
//                     >
//                         <View style={styles.chatHeader}>
//                             <TouchableOpacity
//                                 style={styles.backButton}
//                                 onPress={handleBackToSidebar}
//                             >
//                                 <Ionicons name="arrow-back" size={24} color="#333" />
//                             </TouchableOpacity>

//                             {activeChatId && (
//                                 <>
//                                     <TouchableOpacity
//                                         style={styles.chatUserInfo}
//                                         onPress={() => openGallery(activeChatId)}
//                                     >
//                                         <Image
//                                             source={{
//                                                 uri: chats.find(c => c._id === activeChatId)?.profile ||
//                                                     "https://via.placeholder.com/40",
//                                             }}
//                                             style={styles.chatUserAvatar}
//                                         />
//                                         <View style={styles.chatUserDetails}>
//                                             <Text style={styles.chatUserName}>
//                                                 {chats.find(c => c._id === activeChatId)?.name}
//                                             </Text>
//                                             {typingUsers[activeChatId] ? (
//                                                 <Text style={styles.chatUserTyping}>typing...</Text>
//                                             ) : (
//                                                 <Text style={[
//                                                     styles.chatUserStatus,
//                                                     onlineUsers.includes(activeChatId) ? styles.online : styles.offline,
//                                                 ]}>
//                                                     {onlineUsers.includes(activeChatId) ? "online" : "offline"}
//                                                 </Text>
//                                             )}
//                                         </View>
//                                     </TouchableOpacity>

//                                     <View style={styles.chatActions}>
//                                         <TouchableOpacity style={styles.chatAction}
//                                             // onPress={startCall}
//                                             onPress={Openweb}
//                                         >
//                                             <Ionicons name="videocam-outline" size={24} color="#333" />
//                                         </TouchableOpacity>
//                                         <TouchableOpacity style={styles.chatAction} onPress={() => openGallery(activeChatId)}>
//                                             <Ionicons name="images-outline" size={24} color="#333" />
//                                         </TouchableOpacity>
//                                     </View>
//                                 </>
//                             )}



//                         </View>

//                         {activeChatId && (
//                             <>
//                                 {loadingMessages[activeChatId] ? (
//                                     <View style={styles.loadingMessages}>
//                                         <ActivityIndicator size="large" color="#10ca8c" />
//                                     </View>
//                                 ) : (
//                                     <FlatList
//                                         ref={flatListRef}
//                                         data={messages[activeChatId] || []}
//                                         keyExtractor={(item, index) => item._id || index.toString()}
//                                         // contentContainerStyle={[
//                                         //     styles.messagesList,
//                                         //     keyboardHeight > 0 && { paddingBottom: keyboardHeight + 40 }
//                                         // ]}

//                                         // In ChatInput component, change this:
//                                         style={[
//                                             styles.inputContainer,
//                                             keyboardHeight > 0 && { marginBottom: keyboardHeight * 0.5 } // Remove or reduce this
//                                         ]}


//                                         showsVerticalScrollIndicator={false}
//                                         refreshControl={
//                                             <RefreshControl
//                                                 refreshing={refreshingMessages}
//                                                 onRefresh={onRefreshMessages}
//                                                 colors={["#10ca8c"]}
//                                                 tintColor="#10ca8c"
//                                             />
//                                         }
//                                         onContentSizeChange={() => {
//                                             flatListRef.current?.scrollToEnd({ animated: true });
//                                         }}
//                                         renderItem={({ item }) => {
//                                             const isMine = item.senderId === user._id;
//                                             const showImage = item.image;
//                                             const showVideo = item.video;

//                                             return (
//                                                 <View style={[
//                                                     styles.messageWrapper,
//                                                     isMine ? styles.myMessage : styles.theirMessage,
//                                                 ]}>
//                                                     {showImage && (
//                                                         <TouchableOpacity
//                                                             onPress={() => {
//                                                                 setGalleryImages([item.image!]);
//                                                                 setGalleryIndex(0);
//                                                                 setShowGallery(true);
//                                                             }}
//                                                         >
//                                                             <Image
//                                                                 source={{ uri: item.image }}
//                                                                 style={styles.messageImage}
//                                                             />
//                                                         </TouchableOpacity>
//                                                     )}
//                                                     {showVideo && (
//                                                         <Video
//                                                             source={{ uri: item.video }}
//                                                             style={styles.messageVideo}
//                                                             useNativeControls
//                                                             resizeMode={ResizeMode.CONTAIN}
//                                                             shouldPlay={false}
//                                                         />
//                                                     )}
//                                                     {item.text && (
//                                                         <Text style={[
//                                                             styles.messageText,
//                                                             isMine ? styles.myMessageText : styles.theirMessageText,
//                                                         ]}>
//                                                             {item.text}
//                                                         </Text>
//                                                     )}
//                                                     <View style={styles.messageMeta}>
//                                                         <Text style={styles.messageTime}>
//                                                             {new Date(item.createdAt).toLocaleTimeString([], {
//                                                                 hour: '2-digit',
//                                                                 minute: '2-digit',
//                                                             })}
//                                                         </Text>
//                                                         {isMine && item.readistrue && (
//                                                             <Ionicons name="checkmark-done" size={16} color="#10ca8c" />
//                                                         )}
//                                                         {item.failed && (
//                                                             <Text style={styles.failedText}>Failed</Text>
//                                                         )}
//                                                     </View>
//                                                 </View>
//                                             );
//                                         }}
//                                     />
//                                 )}

//                                 <Animated.View style={{ transform: [{ translateY }] }}>
//                                     <ChatInput
//                                         onSend={(text, imageFile, videoFile) =>
//                                             sendMessage(activeChatId, { text, imageFile, videoFile })
//                                         }
//                                         onTyping={handleTyping}
//                                         keyboardHeight={keyboardHeight}
//                                     />
//                                 </Animated.View>
//                             </>
//                         )}
//                     </KeyboardAvoidingView>
//                 )}

//                 {/* Image Gallery Modal */}
//                 <Modal visible={showGallery} transparent={true} animationType="fade">
//                     <View style={styles.galleryOverlay}>
//                         <View style={styles.galleryContainer}>
//                             <TouchableOpacity
//                                 style={styles.galleryClose}
//                                 onPress={() => setShowGallery(false)}
//                             >
//                                 <Ionicons name="close" size={30} color="#fff" />
//                             </TouchableOpacity>

//                             <Text style={styles.galleryCounter}>
//                                 {galleryIndex + 1} / {galleryImages.length}
//                             </Text>

//                             <Image
//                                 source={{ uri: galleryImages[galleryIndex] }}
//                                 style={styles.galleryImage}
//                                 resizeMode="contain"
//                             />

//                             <View style={styles.galleryControls}>
//                                 <TouchableOpacity
//                                     style={styles.galleryControl}
//                                     disabled={galleryIndex === 0}
//                                     onPress={() => setGalleryIndex(i => i - 1)}
//                                 >
//                                     <Ionicons name="chevron-back" size={30} color="#fff" />
//                                 </TouchableOpacity>
//                                 <TouchableOpacity
//                                     style={styles.galleryControl}
//                                     disabled={galleryIndex === galleryImages.length - 1}
//                                     onPress={() => setGalleryIndex(i => i + 1)}
//                                 >
//                                     <Ionicons name="chevron-forward" size={30} color="#fff" />
//                                 </TouchableOpacity>
//                             </View>
//                         </View>
//                     </View>
//                 </Modal>
//             </View>
//         </SafeAreaProvider>
//     );
// }

// /* ================= MAIN SCREEN ================= */

// export default function ChatScreen({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
//     return (
//         <SafeAreaProvider>
//             <ChatScreenContent setActiveTab={setActiveTab} />
//         </SafeAreaProvider>
//     );
// }

// /* ================= STYLES ================= */

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: "#fff",
//     },
//     loadingContainer: {
//         flex: 1,
//         justifyContent: "center",
//         alignItems: "center",
//         backgroundColor: "#fff",
//     },
//     /* Sidebar */
//     sidebar: {
//         flex: 1,
//         backgroundColor: "#fff",
//     },
//     sidebarHeader: {
//         flexDirection: "row",
//         justifyContent: "space-between",
//         alignItems: "center",
//         paddingHorizontal: 16,
//         paddingVertical: 12,
//         borderBottomWidth: 1,
//         borderBottomColor: "#f0f0f0",
//     },
//     userInfo: {
//         flexDirection: "row",
//         alignItems: "center",
//     },
//     userAvatar: {
//         width: 40,
//         height: 40,
//         borderRadius: 20,
//         marginRight: 12,
//     },
//     userName: {
//         fontSize: 16,
//         fontWeight: "600",
//         color: "#333",
//     },
//     headerActions: {
//         flexDirection: "row",
//     },
//     headerIcon: {
//         marginLeft: 16,
//     },
//     connectionStatus: {
//         backgroundColor: "#fff3cd",
//         padding: 8,
//         alignItems: "center",
//     },
//     connectionText: {
//         color: "#856404",
//         fontSize: 12,
//     },
//     searchContainer: {
//         flexDirection: "row",
//         alignItems: "center",
//         backgroundColor: "#f5f5f5",
//         margin: 16,
//         paddingHorizontal: 12,
//         borderRadius: 8,
//         height: 40,
//     },
//     searchIcon: {
//         marginRight: 8,
//     },
//     searchInput: {
//         flex: 1,
//         fontSize: 14,
//         color: "#333",
//         padding: 0,
//     },
//     loadingChats: {
//         flex: 1,
//         justifyContent: "center",
//         alignItems: "center",
//     },
//     chatList: {
//         paddingHorizontal: 16,
//         paddingBottom: 20,
//     },
//     emptyChats: {
//         alignItems: "center",
//         paddingVertical: 40,
//     },
//     emptyChatsText: {
//         marginTop: 10,
//         fontSize: 14,
//         color: "#999",
//     },
//     chatItem: {
//         flexDirection: "row",
//         paddingVertical: 12,
//         borderBottomWidth: 1,
//         borderBottomColor: "#f5f5f5",
//     },
//     activeChatItem: {
//         backgroundColor: "#f0fff9",
//     },
//     chatAvatar: {
//         width: 50,
//         height: 50,
//         borderRadius: 25,
//         marginRight: 12,
//     },
//     chatInfo: {
//         flex: 1,
//     },
//     chatHeader: {
//         flexDirection: "row",
//         justifyContent: "space-between",
//         alignItems: "center",
//         marginBottom: 4,
//     },
//     chatNameContainer: {
//         flexDirection: "row",
//         alignItems: "center",
//         flex: 1,
//     },
//     chatName: {
//         fontSize: 15,
//         fontWeight: "600",
//         color: "#333",
//         marginRight: 4,
//     },
//     verifiedIcon: {
//         marginLeft: 2,
//     },
//     typingText: {
//         fontSize: 11,
//         color: "#10ca8c",
//         fontStyle: "italic",
//     },
//     onlineStatus: {
//         fontSize: 11,
//     },
//     online: {
//         color: "#10ca8c",
//     },
//     offline: {
//         color: "#999",
//     },
//     chatFooter: {
//         flexDirection: "row",
//         justifyContent: "space-between",
//         alignItems: "center",
//     },
//     lastMessage: {
//         flex: 1,
//         fontSize: 13,
//         color: "#666",
//         marginRight: 8,
//     },
//     unreadBadge: {
//         backgroundColor: "#10ca8c",
//         borderRadius: 10,
//         minWidth: 20,
//         height: 20,
//         justifyContent: "center",
//         alignItems: "center",
//     },
//     unreadText: {
//         color: "#fff",
//         fontSize: 11,
//         fontWeight: "600",
//     },
//     /* Chat Main */
//     chatMain: {
//         flex: 1,
//         backgroundColor: "#fafafa",
//     },
//     chatHeader: {
//         flexDirection: "row",
//         alignItems: "center",
//         paddingHorizontal: 16,
//         paddingVertical: 12,
//         backgroundColor: "#fff",
//         borderBottomWidth: 1,
//         borderBottomColor: "#f0f0f0",
//     },
//     backButton: {
//         marginRight: 12,
//     },
//     chatUserInfo: {
//         flex: 1,
//         flexDirection: "row",
//         alignItems: "center",
//     },
//     chatUserAvatar: {
//         width: 40,
//         height: 40,
//         borderRadius: 20,
//         marginRight: 12,
//     },
//     chatUserDetails: {
//         flex: 1,
//     },
//     chatUserName: {
//         fontSize: 15,
//         fontWeight: "600",
//         color: "#333",
//     },
//     chatUserTyping: {
//         fontSize: 11,
//         color: "#10ca8c",
//         fontStyle: "italic",
//     },
//     chatUserStatus: {
//         fontSize: 11,
//     },
//     chatActions: {
//         flexDirection: "row",
//     },
//     chatAction: {
//         marginLeft: 16,
//     },
//     loadingMessages: {
//         flex: 1,
//         justifyContent: "center",
//         alignItems: "center",
//     },
//     messagesList: {
//         padding: 16,
//     },
//     messageWrapper: {
//         marginBottom: 12,
//         maxWidth: "80%",
//     },
//     myMessage: {
//         alignSelf: "flex-end",
//     },
//     theirMessage: {
//         alignSelf: "flex-start",
//     },
//     messageText: {
//         fontSize: 14,
//         padding: 12,
//         borderRadius: 18,
//         overflow: "hidden",
//     },
//     myMessageText: {
//         backgroundColor: "#10ca8c",
//         color: "#fff",
//     },
//     theirMessageText: {
//         backgroundColor: "#f0f0f0",
//         color: "#333",
//     },
//     messageImage: {
//         width: 200,
//         height: 200,
//         borderRadius: 12,
//         marginBottom: 4,
//     },
//     messageVideo: {
//         width: 200,
//         height: 200,
//         borderRadius: 12,
//         marginBottom: 4,
//         backgroundColor: "#000",
//     },
//     messageMeta: {
//         flexDirection: "row",
//         alignItems: "center",
//         justifyContent: "flex-end",
//         marginTop: 4,
//         gap: 4,
//     },
//     messageTime: {
//         fontSize: 10,
//         color: "#999",
//     },
//     failedText: {
//         fontSize: 10,
//         color: "#ff4444",
//     },
//     /* Input */
//     inputContainer: {
//         backgroundColor: "#fff",
//         paddingHorizontal: 16,
//         paddingVertical: 12,
//         borderTopWidth: 1,
//         borderTopColor: "#f0f0f0",
//     },
//     previewContainer: {
//         flexDirection: "row",
//         marginBottom: 12,
//     },
//     previewItem: {
//         position: "relative",
//         marginRight: 12,
//     },
//     previewImage: {
//         width: 60,
//         height: 60,
//         borderRadius: 8,
//     },
//     previewVideo: {
//         width: 60,
//         height: 60,
//         borderRadius: 8,
//         backgroundColor: "#000",
//     },
//     removePreview: {
//         position: "absolute",
//         top: -6,
//         right: -6,
//         backgroundColor: "#fff",
//         borderRadius: 10,
//     },
//     inputRow: {
//         flexDirection: "row",
//         alignItems: "flex-end",
//     },
//     attachButton: {
//         marginRight: 12,
//         marginBottom: 8,
//     },
//     textInput: {
//         flex: 1,
//         minHeight: 40,
//         maxHeight: 100,
//         backgroundColor: "#f5f5f5",
//         borderRadius: 20,
//         paddingHorizontal: 16,
//         paddingVertical: 8,
//         fontSize: 14,
//         marginRight: 12,
//         marginBottom: 8,
//     },
//     sendButton: {
//         width: 40,
//         height: 40,
//         borderRadius: 20,
//         backgroundColor: "#10ca8c",
//         justifyContent: "center",
//         alignItems: "center",
//         marginBottom: 8,
//     },
//     sendButtonDisabled: {
//         backgroundColor: "#ccc",
//     },
//     /* Gallery Modal */
//     galleryOverlay: {
//         flex: 1,
//         backgroundColor: "rgba(0,0,0,0.9)",
//         justifyContent: "center",
//         alignItems: "center",
//     },
//     galleryContainer: {
//         width: width,
//         height: height,
//         position: "relative",
//     },
//     galleryClose: {
//         position: "absolute",
//         top: 50,
//         right: 20,
//         zIndex: 10,
//         backgroundColor: "rgba(0,0,0,0.5)",
//         width: 40,
//         height: 40,
//         borderRadius: 20,
//         justifyContent: "center",
//         alignItems: "center",
//     },
//     galleryCounter: {
//         position: "absolute",
//         top: 50,
//         left: 20,
//         zIndex: 10,
//         color: "#fff",
//         fontSize: 14,
//         backgroundColor: "rgba(0,0,0,0.5)",
//         paddingHorizontal: 12,
//         paddingVertical: 6,
//         borderRadius: 16,
//     },
//     galleryImage: {
//         width: width,
//         height: height,
//     },
//     galleryControls: {
//         position: "absolute",
//         bottom: 50,
//         left: 0,
//         right: 0,
//         flexDirection: "row",
//         justifyContent: "space-between",
//         paddingHorizontal: 20,
//     },
//     galleryControl: {
//         backgroundColor: "rgba(0,0,0,0.5)",
//         width: 50,
//         height: 50,
//         borderRadius: 25,
//         justifyContent: "center",
//         alignItems: "center",
//     },
// });






























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
    Animated,
    KeyboardEvent,
    Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Video, ResizeMode } from "expo-av";
import { Audio } from 'expo-av';
import { connectSocket, getSocket, disconnectSocket } from "../me";
import * as Haptics from "expo-haptics";
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const API = "https://vizit-backend-hubw.onrender.com/api";

// Sound URLs from online sources (Google Fonts/Mixkit sounds)
const SOUNDS = {
    // Notification sounds - short, clear alerts
    NOTIFICATION: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
    MESSAGE_SENT: 'https://www.soundjay.com/button/sounds/button-09.mp3',
    TYPING: 'https://www.soundjay.com/misc/sounds/typewriter-key-1.mp3',
    ERROR: 'https://www.soundjay.com/misc/sounds/buzzer-or-wrong-answer.mp3',
    SUCCESS: 'https://www.soundjay.com/button/sounds/button-37.mp3',
};

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

type InAppNotification = {
    id: string;
    chatId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    message: string;
    type: 'text' | 'image' | 'video';
    timestamp: Date;
};

/* ================= SOUND MANAGER ================= */

const useSound = () => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isSoundEnabled, setIsSoundEnabled] = useState(true);

    // Configure audio mode
    useEffect(() => {
        const configureAudio = async () => {
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    staysActiveInBackground: true,
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                });
            } catch (error) {
                console.log('Error configuring audio:', error);
            }
        };

        configureAudio();
    }, []);

    const playSound = async (soundUrl: string) => {
        if (!isSoundEnabled) return;

        try {
            // Unload previous sound
            if (sound) {
                await sound.unloadAsync();
            }

            // Create and play new sound
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: soundUrl },
                { shouldPlay: true, volume: 0.5 }
            );

            setSound(newSound);

            // Auto-unload after playing
            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    newSound.unloadAsync();
                }
            });
        } catch (error) {
            console.log('Error playing sound:', error);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    return { playSound, isSoundEnabled, setIsSoundEnabled };
};

/* ================= NOTIFICATION COMPONENT ================= */

interface NotificationBannerProps {
    notification: InAppNotification;
    onPress: (chatId: string) => void;
    onDismiss: (id: string) => void;
    index: number;
}

const NotificationBanner = ({ notification, onPress, onDismiss, index }: NotificationBannerProps) => {
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 80,
                friction: 10,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto dismiss after 4 seconds
        const timer = setTimeout(() => {
            handleDismiss();
        }, 4000);

        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onDismiss(notification.id);
        });
    };

    const handlePress = () => {
        handleDismiss();
        onPress(notification.chatId);
    };

    const getMessagePreview = () => {
        if (notification.type === 'image') return '📷 Image';
        if (notification.type === 'video') return '🎥 Video';
        return notification.message.length > 30
            ? notification.message.substring(0, 30) + '...'
            : notification.message;
    };

    return (
        <Animated.View
            style={[
                styles.notificationBanner,
                {
                    transform: [{ translateY: slideAnim }],
                    opacity: opacityAnim,
                    top: index * 80, // Stack notifications
                },
            ]}
        >
            <TouchableOpacity
                style={styles.notificationContent}
                onPress={handlePress}
                activeOpacity={0.9}
            >
                <Image
                    source={{ uri: notification.senderAvatar || 'https://via.placeholder.com/40' }}
                    style={styles.notificationAvatar}
                />
                <View style={styles.notificationTextContainer}>
                    <View style={styles.notificationHeader}>
                        <Text style={styles.notificationName}>{notification.senderName}</Text>
                        <Text style={styles.notificationTime}>
                            {new Date(notification.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </Text>
                    </View>
                    <Text style={styles.notificationMessage} numberOfLines={1}>
                        {getMessagePreview()}
                    </Text>
                </View>
                <TouchableOpacity style={styles.notificationClose} onPress={handleDismiss}>
                    <Ionicons name="close" size={18} color="#999" />
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );
};

/* ================= CHAT INPUT COMPONENT ================= */

interface ChatInputProps {
    onSend: (text: string, imageFile: any, videoFile: any) => void;
    onTyping: (isTyping: boolean) => void;
    keyboardHeight?: number;
    playSound?: (soundUrl: string) => void;
}

const ChatInput = ({ onSend, onTyping, keyboardHeight = 0, playSound }: ChatInputProps) => {
    const [message, setMessage] = useState("");
    const [imageFile, setImageFile] = useState<any>(null);
    const [videoFile, setVideoFile] = useState<any>(null);
    const inputRef = useRef<TextInput>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout>();

    const handleSend = () => {
        if (!message.trim() && !imageFile && !videoFile) return;

        // Play message sent sound
        if (playSound) {
            playSound(SOUNDS.MESSAGE_SENT);
        }

        onSend(message, imageFile, videoFile);
        setMessage("");
        setImageFile(null);
        setVideoFile(null);
        onTyping(false);
        Keyboard.dismiss();
    };

    const handleTextChange = (text: string) => {
        setMessage(text);

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set typing status
        onTyping(text.length > 0);

        // Set timeout to stop typing after 2 seconds
        typingTimeoutRef.current = setTimeout(() => {
            onTyping(false);
        }, 2000);
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.7,
                allowsEditing: true,
            });
            if (!result.canceled) {
                setImageFile(result.assets[0]);
                // Play success sound
                if (playSound) playSound(SOUNDS.SUCCESS);
            }
        } catch (error) {
            if (playSound) playSound(SOUNDS.ERROR);
        }
    };

    const pickVideo = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                quality: 0.7,
                allowsEditing: true,
            });
            if (!result.canceled) {
                setVideoFile(result.assets[0]);
                // Play success sound
                if (playSound) playSound(SOUNDS.SUCCESS);
            }
        } catch (error) {
            if (playSound) playSound(SOUNDS.ERROR);
        }
    };

    return (
        <View style={[
            styles.inputContainer,
            keyboardHeight > 0 && { marginBottom: keyboardHeight * 0.5 }
        ]}>
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
                    placeholderTextColor="#999"
                    value={message}
                    onChangeText={handleTextChange}
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
    const params = useLocalSearchParams<{ chatid?: string }>();

    const [user, setUser] = useState<User | null>(null);
    const [chats, setChats] = useState<ChatUser[]>([]);
    const [messages, setMessages] = useState<Record<string, Message[]>>({});
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
    const [activeChatId, setActiveChatId] = useState<string | null>(params.chatid || null);
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState<Record<string, boolean>>({});
    const [refreshingChats, setRefreshingChats] = useState(false);
    const [refreshingMessages, setRefreshingMessages] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [sidebarVisible, setSidebarVisible] = useState(!params.chatid);
    const [showGallery, setShowGallery] = useState(false);
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [galleryIndex, setGalleryIndex] = useState(0);
    const [incomingCall, setIncomingCall] = useState(false);
    const [callerInfo, setCallerInfo] = useState<any>(null);
    const [socketConnected, setSocketConnected] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [notifications, setNotifications] = useState<InAppNotification[]>([]);
    const [showSoundToggle, setShowSoundToggle] = useState(false);

    const flatListRef = useRef<FlatList>(null);
    const keyboardShowListener = useRef<any>(null);
    const keyboardHideListener = useRef<any>(null);
    const translateY = useRef(new Animated.Value(0)).current;

    // Initialize sound manager
    const { playSound, isSoundEnabled, setIsSoundEnabled } = useSound();

    /* ================= KEYBOARD HANDLERS ================= */
    useEffect(() => {
        keyboardShowListener.current = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e: KeyboardEvent) => {
                const halfScreenHeight = height / 2;
                const keyboardEndY = e.endCoordinates.screenY;
                const targetPosition = (keyboardEndY - halfScreenHeight);

                setKeyboardHeight(e.endCoordinates.height);

                Animated.spring(translateY, {
                    toValue: -targetPosition,
                    useNativeDriver: true,
                    tension: 80,
                    friction: 10,
                }).start();

                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
            }
        );

        keyboardHideListener.current = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardHeight(0);
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 80,
                    friction: 10,
                }).start();
            }
        );

        return () => {
            keyboardShowListener.current?.remove();
            keyboardHideListener.current?.remove();
        };
    }, []);

    /* ================= URL PARAMS HANDLER ================= */
    useEffect(() => {
        if (params.chatid && user?._id) {
            setActiveChatId(params.chatid);
            setSidebarVisible(false);
            loadMessages(params.chatid, true);
            router.setParams({ chatid: params.chatid });
        }
    }, [params.chatid, user?._id]);

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
                if (playSound) playSound(SOUNDS.SUCCESS);
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

    const Openweb = async () => {
        if (!activeChatId) return;

        try {
            const token = await AsyncStorage.getItem("userToken");
            if (!token) {
                Alert.alert("Error", "No authentication token found");
                if (playSound) playSound(SOUNDS.ERROR);
                return;
            }

            const role = "owner";
            const userId = user?._id;

            if (!userId) {
                Alert.alert("Error", "User ID not found");
                if (playSound) playSound(SOUNDS.ERROR);
                return;
            }

            const url = `https://www.vizit.homes/chat?role=${role}&token=${encodeURIComponent(token)}&id=${userId}&chatid=${activeChatId}`;
            const supported = await Linking.canOpenURL(url);

            if (supported) {
                await Linking.openURL(url);
                if (playSound) playSound(SOUNDS.SUCCESS);
            } else {
                Alert.alert("Error", "Cannot open URL");
                if (playSound) playSound(SOUNDS.ERROR);
            }
        } catch (error) {
            console.error("Failed to start call:", error);
            Alert.alert("Error", "Failed to initiate call");
            if (playSound) playSound(SOUNDS.ERROR);
        }
    };

    /* ================= SOCKET EVENT LISTENERS ================= */
    useEffect(() => {
        if (!user?._id) return;

        const socket = getSocket();
        if (!socket) return;

        socket.emit("registerUser", user._id);

        socket.on("typingStatus", ({ byUserId, isTyping }: { byUserId: string; isTyping: boolean }) => {
            setTypingUsers(prev => ({ ...prev, [byUserId]: isTyping }));

            // Play typing sound (optional - can be enabled/disabled)
            // if (isTyping && playSound) playSound(SOUNDS.TYPING);
        });

        socket.on("newMessage", (msg: Message) => {
            const chatId = msg.senderId === user._id ? msg.receiverId : msg.senderId;

            // Only show notification if message is from someone else and not in current chat
            if (msg.senderId !== user._id && chatId !== activeChatId) {
                // Find sender info from chats list
                const sender = chats.find(c => c._id === msg.senderId);

                const notification: InAppNotification = {
                    id: msg._id || Date.now().toString(),
                    chatId: chatId,
                    senderId: msg.senderId,
                    senderName: sender?.name || 'Unknown User',
                    senderAvatar: sender?.profile,
                    message: msg.text || '',
                    type: msg.image ? 'image' : msg.video ? 'video' : 'text',
                    timestamp: new Date(),
                };

                // Add to in-app notifications (keep only last 3)
                setNotifications(prev => {
                    const updated = [notification, ...prev].slice(0, 3);
                    return updated;
                });

                // Play notification sound
                if (playSound) playSound(SOUNDS.NOTIFICATION);

                // Haptic feedback
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            setMessages(prev => {
                const existing = prev[chatId] || [];
                const filtered = existing.filter(m => !(m.temp && m.senderId === msg.senderId));
                if (filtered.some(m => m._id === msg._id)) return prev;

                const updated = { ...prev, [chatId]: [...filtered, msg] };

                if (chatId === activeChatId) {
                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                }

                return updated;
            });
        });

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

        socket.on("incoming:call", ({ fromUserId, callerName }) => {
            setCallerInfo({ userId: fromUserId, name: callerName });
            setIncomingCall(true);

            Alert.alert(
                "Incoming Call",
                `${callerName} is calling you.`,
                [
                    {
                        text: "Answer",
                        onPress: () => handleAnswerCall(fromUserId)
                    },
                    {
                        text: "Decline",
                        onPress: () => {
                            socket?.emit("call:rejected", { toUserId: fromUserId });
                            setIncomingCall(false);
                        },
                        style: "cancel"
                    }
                ]
            );

            // Play notification sound for call
            if (playSound) playSound(SOUNDS.NOTIFICATION);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        });

        socket.on("call:accepted", () => {
            Alert.alert("Call Connected", "Call accepted");
            if (playSound) playSound(SOUNDS.SUCCESS);
        });

        socket.on("call:rejected", () => {
            Alert.alert("Call Rejected", "The user declined your call");
            if (playSound) playSound(SOUNDS.ERROR);
        });

        socket.on("call:end", () => {
            Alert.alert("Call Ended", "The call has ended");
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
    }, [user?._id, activeChatId, chats]);

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

            // Play success sound
            if (playSound) playSound(SOUNDS.SUCCESS);
        } catch (err) {
            console.error("Decode token failed", err);
            if (playSound) playSound(SOUNDS.ERROR);
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
            if (playSound) playSound(SOUNDS.ERROR);
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
        router.setParams({ chatid: chatId });

        if (showLoading) {
            setLoadingMessages(prev => ({ ...prev, [chatId]: true }));
        }

        try {
            const res = await axios.get(`${API}/messages/${chatId}`, {
                params: { myId: user._id },
            });

            setMessages(prev => ({ ...prev, [chatId]: res.data }));

            await axios.put(`${API}/messages/read/${chatId}`, {
                readerId: user._id,
            });

            const socket = getSocket();
            socket?.emit("markMessagesRead", {
                chatUserId: chatId,
                readerId: user._id,
            });

            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch (err) {
            console.error("Load messages failed", err);
            if (playSound) playSound(SOUNDS.ERROR);
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

        setMessages(prev => ({
            ...prev,
            [chatId]: [...(prev[chatId] || []), tempMessage],
        }));

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
            if (playSound) playSound(SOUNDS.ERROR);
        }
    };

    /* ================= MARK MESSAGES AS READ ================= */
    useEffect(() => {
        if (!activeChatId || !messages[activeChatId] || !user?._id) return;

        const unreadMessages = messages[activeChatId].filter(
            msg => msg.receiverId === user._id && !msg.readistrue
        );

        if (unreadMessages.length === 0) return;

        setMessages(prev => ({
            ...prev,
            [activeChatId]: prev[activeChatId].map(msg =>
                msg.receiverId === user._id ? { ...msg, readistrue: true } : msg
            ),
        }));

        const socket = getSocket();
        socket?.emit("markMessagesRead", {
            chatUserId: activeChatId,
            readerId: user._id,
        });

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
            if (playSound) playSound(SOUNDS.ERROR);
        }
    };

    /* ================= START CALL ================= */
    const startCall = () => {
        if (!activeChatId) return;

        Alert.alert(
            "Video Call",
            "Video calls require a development build with react-native-webrtc installed.\n\nFor now, you can send messages and media files.",
            [{ text: "OK" }]
        );
    };

    /* ================= HANDLE ANSWER CALL ================= */
    const handleAnswerCall = async (fromUserId: string) => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            const role = "owner";
            const userId = user?._id;

            if (!token || !userId) {
                Alert.alert("Error", "Authentication failed");
                if (playSound) playSound(SOUNDS.ERROR);
                return;
            }

            const url = `https://www.vizit.homes/chat?role=${role}&token=${encodeURIComponent(token)}&id=${userId}&chatid=${fromUserId}`;

            const supported = await Linking.canOpenURL(url);

            if (supported) {
                await Linking.openURL(url);
                setIncomingCall(false);
                if (playSound) playSound(SOUNDS.SUCCESS);
            }
        } catch (error) {
            console.error("Failed to answer call:", error);
            if (playSound) playSound(SOUNDS.ERROR);
        }
    };

    /* ================= FILTER CHATS ================= */
    const filteredChats = chats.filter(chat =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    /* ================= HANDLE BACK TO SIDEBAR ================= */
    const handleBackToSidebar = () => {
        setActiveChatId(null);
        setSidebarVisible(true);
        router.setParams({});
    };

    /* ================= HANDLE NOTIFICATION PRESS ================= */
    const handleNotificationPress = (chatId: string) => {
        if (sidebarVisible) {
            setSidebarVisible(false);
        }
        setActiveChatId(chatId);
        loadMessages(chatId, true);
        router.setParams({ chatid: chatId });

        // Play success sound
        if (playSound) playSound(SOUNDS.SUCCESS);
    };

    /* ================= DISMISS NOTIFICATION ================= */
    const dismissNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    /* ================= TOGGLE SOUND ================= */
    const toggleSound = () => {
        setIsSoundEnabled(!isSoundEnabled);
        if (!isSoundEnabled && playSound) {
            playSound(SOUNDS.SUCCESS);
        }
        setShowSoundToggle(false);
    };

    /* ================= RENDER ================= */
    if (!user) {
        return (
            <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color="#10ca8c" />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />

                {/* Notification Banner Container - WhatsApp Style */}
                <View style={styles.notificationContainer} pointerEvents="box-none">
                    {notifications.map((notification, index) => (
                        <NotificationBanner
                            key={notification.id}
                            notification={notification}
                            onPress={handleNotificationPress}
                            onDismiss={dismissNotification}
                            index={index}
                        />
                    ))}
                </View>

                {/* Sound Toggle Button */}
                <TouchableOpacity
                    style={styles.soundToggle}
                    onPress={() => setShowSoundToggle(!showSoundToggle)}
                >
                    <Ionicons
                        name={isSoundEnabled ? "volume-high" : "volume-mute"}
                        size={24}
                        color="#10ca8c"
                    />
                </TouchableOpacity>

                {/* Sound Toggle Menu */}
                {showSoundToggle && (
                    <View style={styles.soundMenu}>
                        <TouchableOpacity
                            style={styles.soundMenuItem}
                            onPress={toggleSound}
                        >
                            <Ionicons
                                name={isSoundEnabled ? "checkmark-circle" : "close-circle"}
                                size={20}
                                color={isSoundEnabled ? "#10ca8c" : "#ff4444"}
                            />
                            <Text style={styles.soundMenuText}>
                                {isSoundEnabled ? 'Sound On' : 'Sound Off'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {sidebarVisible ? (
                    <View style={styles.sidebar}>
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

                        {!socketConnected && (
                            <View style={styles.connectionStatus}>
                                <Text style={styles.connectionText}>Connecting...</Text>
                            </View>
                        )}

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
                    <KeyboardAvoidingView
                        style={styles.chatMain}
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 60 : insets.top + 20}
                    >
                        <View style={styles.chatHeader}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={handleBackToSidebar}
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
                                        <View style={styles.chatUserDetails}>
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
                                        <TouchableOpacity
                                            style={styles.chatAction}
                                            onPress={Openweb}
                                        >
                                            <Ionicons name="videocam-outline" size={24} color="#333" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.chatAction}
                                            onPress={() => openGallery(activeChatId)}
                                        >
                                            <Ionicons name="images-outline" size={24} color="#333" />
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>

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
                                        contentContainerStyle={[
                                            styles.messagesList,
                                            keyboardHeight > 0 && { paddingBottom: keyboardHeight + 20 }
                                        ]}
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

                                <Animated.View style={{ transform: [{ translateY }] }}>
                                    <ChatInput
                                        onSend={(text, imageFile, videoFile) =>
                                            sendMessage(activeChatId, { text, imageFile, videoFile })
                                        }
                                        onTyping={handleTyping}
                                        keyboardHeight={keyboardHeight}
                                        playSound={playSound}
                                    />
                                </Animated.View>
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
            </View>
        </SafeAreaProvider>
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
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: "#666",
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
        padding: 0,
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
    chatUserDetails: {
        flex: 1,
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
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
        alignItems: "flex-end",
    },
    attachButton: {
        marginRight: 12,
        marginBottom: 8,
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
        marginBottom: 8,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#10ca8c",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
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
    /* Notification Styles - WhatsApp Style */
    notificationContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 40,
        left: 16,
        right: 16,
        zIndex: 1000,
        elevation: 1000,
    },
    notificationBanner: {
        position: 'absolute',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#10ca8c',
        borderLeftWidth: 4,
        borderLeftColor: '#10ca8c',
    },
    notificationContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    notificationAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#10ca8c',
    },
    notificationTextContainer: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    notificationName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#10ca8c',
    },
    notificationTime: {
        fontSize: 10,
        color: '#999',
    },
    notificationMessage: {
        fontSize: 12,
        color: '#666',
    },
    notificationClose: {
        padding: 4,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    /* Sound Toggle Styles */
    soundToggle: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 100 : 90,
        right: 16,
        zIndex: 1001,
        backgroundColor: '#fff',
        borderRadius: 30,
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    soundMenu: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 150 : 140,
        right: 16,
        zIndex: 1002,
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    soundMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    soundMenuText: {
        fontSize: 14,
        color: '#333',
        marginLeft: 8,
    },
});