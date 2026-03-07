

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Modal,
    StatusBar,
    SafeAreaView,
    Animated,
    RefreshControl,
    Share,
    Linking,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams, router } from "expo-router";
import { getSocket } from "./socketconnect";
import * as Haptics from "expo-haptics";
import AntDesign from '@expo/vector-icons/AntDesign';

const { width, height } = Dimensions.get("window");

/* ================= TYPES ================= */

type Reel = {
    _id: string;
    videoUrl: string;
    caption: string;
    createdAt: string;
    postownerId: string;
    email: string;
    likes?: Array<{ id: string; name: string }>;
    comments?: Array<Comment>;
    shares?: Array<any>;
};

type Comment = {
    _id: string;
    id: string;
    name: string;
    email: string;
    profile: string;
    text: string;
    date: string;
    likes?: Array<{ id: string }>;
};

type User = {
    _id: string;
    name: string;
    email: string;
    profile: string;
    verified?: boolean;
};

/* ================= UTILS ================= */

const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

/* ================= REEL HEADER ================= */

interface ReelHeaderProps {
    username: string;
    caption: string;
    avatar: string;
    timestamp: string;
    reelOwnerId: string;
    verified?: boolean;
    currentUser?: User;
    onChatPress: (targetUserId: string) => void;
    chatLoading: boolean;
}

const ReelHeader = ({
    username,
    caption,
    avatar,
    timestamp,
    reelOwnerId,
    verified,
    currentUser,
    onChatPress,
    chatLoading,
}: ReelHeaderProps) => {
    return (
        <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
                <Image
                    source={{ uri: avatar || "https://via.placeholder.com/40" }}
                    style={styles.headerAvatar}
                />
                <View style={styles.headerInfo}>
                    <View style={styles.usernameContainer}>
                        <Text style={styles.headerUsername}>@{username}</Text>
                        {verified && (
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={14} color="#10ca8c" />
                            </View>
                        )}
                    </View>
                    <Text style={styles.headerCaption} numberOfLines={2}>
                        {caption}
                    </Text>
                    <Text style={styles.headerTimestamp}>{timestamp}</Text>
                </View>
            </View>
            {currentUser && currentUser._id !== reelOwnerId && (
                <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => onChatPress(reelOwnerId)}
                    disabled={chatLoading}
                >
                    <Text style={styles.chatButtonText}>
                        {chatLoading ? "Adding..." : "Chat"}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

/* ================= REEL ACTIONS - TIKTOK STYLE (RIGHT SIDE) ================= */

interface ReelActionsProps {
    likes: number;
    comments: number;
    shares: number;
    isLiked: boolean;
    onLike: () => void;
    onComment: () => void;
    onShare: () => void;
    shareLoading?: boolean;
}

const ReelActions = ({
    likes,
    comments,
    shares,
    isLiked,
    onLike,
    onComment,
    onShare,
    shareLoading = false,
}: ReelActionsProps) => {
    return (
        <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={onLike}>
                <Ionicons
                    name={isLiked ? "heart" : "heart-outline"}
                    size={32}
                    color={isLiked ? "#ff4444" : "#fff"}
                />
                <Text style={styles.actionText}>{likes}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={onComment}>
                <Ionicons name="chatbubble-outline" size={28} color="#fff" />
                <Text style={styles.actionText}>{comments}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={onShare} disabled={shareLoading}>
                {shareLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <>
                        <Ionicons name="share-social-outline" size={28} color="#fff" />
                        <Text style={styles.actionText}>{shares}</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
};

/* ================= COMMENTS MODAL ================= */

interface CommentsModalProps {
    visible: boolean;
    onClose: () => void;
    reelId: string;
    commentCount: number;
    currentUser?: User;
}

const CommentsModal = ({
    visible,
    onClose,
    reelId,
    commentCount,
    currentUser,
}: CommentsModalProps) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [posting, setPosting] = useState(false);
    const holdTimeout = useRef<NodeJS.Timeout>();

    const socket = getSocket();

    /* ---------------- FETCH COMMENTS ---------------- */
    const fetchComments = async () => {
        try {
            setLoading(true);
            const res = await axios.get(
                `https://auth.vizit.homes/api/reels/reel/${reelId}`
            );
            setComments(res.data.reel.comments || []);
        } catch (err) {
            console.error("FETCH COMMENTS ERROR:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible) {
            fetchComments();
        }
    }, [reelId, visible]);

    /* ---------------- SOCKET LISTENERS ---------------- */
    useEffect(() => {
        if (!socket) return;

        const handleLikeUpdate = ({ reelId: rId, commentId, likes }: any) => {
            if (rId !== reelId) return;

            setComments((prev) =>
                prev.map((comment) =>
                    comment._id === commentId
                        ? { ...comment, likes }
                        : comment
                )
            );
        };

        socket.on("commentLikeUpdated", handleLikeUpdate);

        return () => {
            socket.off("commentLikeUpdated", handleLikeUpdate);
        };
    }, [socket, reelId]);

    /* ---------------- ADD COMMENT ---------------- */
    const handleAddComment = async () => {
        if (!newComment.trim() || !currentUser?._id || posting) return;

        setPosting(true);
        try {
            await axios.post(
                `https://auth.vizit.homes/api/reels/reel/${reelId}/comment`,
                {
                    id: currentUser._id,
                    name: currentUser.name,
                    email: currentUser.email,
                    profile: currentUser.profile,
                    text: newComment,
                }
            );

            setNewComment("");
            fetchComments();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
            console.error("POST COMMENT ERROR:", err);
        } finally {
            setPosting(false);
        }
    };

    /* ---------------- LIKE COMMENT ---------------- */
    const toggleLikeComment = async (commentId: string) => {
        if (!currentUser?._id) return;

        try {
            await axios.put(
                `https://auth.vizit.homes/api/like/reel/${reelId}/comment/${commentId}/like`,
                { id: currentUser._id }
            );
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (err) {
            console.error("LIKE COMMENT ERROR:", err);
        }
    };

    /* ---------------- LONG PRESS ---------------- */
    const startHold = (commentId: string) => {
        holdTimeout.current = setTimeout(() => {
            toggleLikeComment(commentId);
        }, 500);
    };

    const cancelHold = () => {
        clearTimeout(holdTimeout.current);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            Comments ({commentCount})
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.modalClose}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.commentsLoading}>
                            <ActivityIndicator size="large" color="#10ca8c" />
                        </View>
                    ) : (
                        <FlatList
                            data={comments}
                            keyExtractor={(item) => item._id}
                            style={styles.commentsList}
                            contentContainerStyle={styles.commentsListContent}
                            ListEmptyComponent={
                                <View style={styles.emptyComments}>
                                    <Ionicons name="chatbubble-outline" size={40} color="#ccc" />
                                    <Text style={styles.emptyCommentsText}>
                                        No comments yet. Be the first to comment!
                                    </Text>
                                </View>
                            }
                            renderItem={({ item }) => {
                                const hasLiked = item.likes?.some(
                                    (like) => String(like.id) === String(currentUser?._id)
                                );

                                return (
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onLongPress={() => startHold(item._id)}
                                        onPressOut={cancelHold}
                                        delayLongPress={500}
                                    >
                                        <View style={styles.commentItem}>
                                            <Image
                                                source={{
                                                    uri: item.profile ||
                                                        "https://via.placeholder.com/36",
                                                }}
                                                style={styles.commentAvatar}
                                            />
                                            <View style={styles.commentContent}>
                                                <View style={styles.commentHeader}>
                                                    <Text style={styles.commentUsername}>
                                                        @{item.name}
                                                    </Text>
                                                    <Text style={styles.commentTime}>
                                                        {item.date
                                                            ? formatTime(item.date)
                                                            : ""}
                                                    </Text>
                                                </View>
                                                <Text style={styles.commentText}>
                                                    {item.text}
                                                </Text>
                                                <TouchableOpacity
                                                    style={styles.commentLike}
                                                    onPress={() => toggleLikeComment(item._id)}
                                                >
                                                    <Ionicons
                                                        name={hasLiked ? "heart" : "heart-outline"}
                                                        size={16}
                                                        color={hasLiked ? "#ff4444" : "#999"}
                                                    />
                                                    <Text
                                                        style={[
                                                            styles.commentLikeText,
                                                            hasLiked && styles.commentLikedText,
                                                        ]}
                                                    >
                                                        {item.likes?.length || 0}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    )}

                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
                    >
                        <View style={styles.commentInputContainer}>
                            <TextInput
                                style={styles.commentInput}
                                placeholder="Add a comment..."
                                placeholderTextColor="#999"
                                value={newComment}
                                onChangeText={setNewComment}
                                multiline
                                maxLength={500}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.commentPostButton,
                                    (!newComment.trim() || posting) &&
                                    styles.commentPostButtonDisabled,
                                ]}
                                onPress={handleAddComment}
                                disabled={!newComment.trim() || posting}
                            >
                                {posting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.commentPostButtonText}>Post</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </View>
        </Modal>
    );
};

/* ================= CUSTOM VIDEO CONTROLS ================= */

interface VideoControlsProps {
    isPlaying: boolean;
    onPlayPause: () => void;
    onSeekForward: () => void;
    onSeekBackward: () => void;
    currentTime: number;
    duration: number;
    onSeek: (value: number) => void;
    visible: boolean;
}

const VideoControls = ({
    isPlaying,
    onPlayPause,
    onSeekForward,
    onSeekBackward,
    currentTime,
    duration,
    onSeek,
    visible,
}: VideoControlsProps) => {
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (!visible) return null;

    return (
        <View style={styles.controlsOverlay}>
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>

            <View style={styles.centerControls}>
                <TouchableOpacity onPress={onSeekBackward} style={styles.controlButton}>
                    <Ionicons name="play-back" size={36} color="#fff" />
                    <Text style={styles.controlText}>10s</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onPlayPause} style={styles.playButton}>
                    <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={48}
                        color="#fff"
                    />
                </TouchableOpacity>

                <TouchableOpacity onPress={onSeekForward} style={styles.controlButton}>
                    <Ionicons name="play-forward" size={36} color="#fff" />
                    <Text style={styles.controlText}>10s</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{formatDuration(currentTime)}</Text>
                <Text style={styles.timeText}>/</Text>
                <Text style={styles.timeText}>{formatDuration(duration)}</Text>
            </View>

            <TouchableOpacity
                style={styles.seekContainer}
                onPress={(e) => {
                    const { locationX } = e.nativeEvent;
                    const seekPercent = (locationX / (width - 32)) * 100;
                    onSeek(seekPercent);
                }}
            >
                <View style={styles.seekTrack}>
                    <View style={[styles.seekFill, { width: `${progress}%` }]} />
                </View>
            </TouchableOpacity>
        </View>
    );
};

/* ================= LIKE ANIMATION ================= */

const LikeAnimation = ({ visible }: { visible: boolean }) => {
    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            scale.setValue(0);
            opacity.setValue(1);

            Animated.sequence([
                Animated.spring(scale, {
                    toValue: 1.5,
                    friction: 3,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.likeAnimation,
                {
                    transform: [{ scale }],
                    opacity,
                },
            ]}
        >
            <Ionicons name="heart" size={80} color="#ff4444" />
        </Animated.View>
    );
};

/* ================= REEL ITEM ================= */

interface ReelItemProps {
    reel: Reel;
    currentUser?: User;
    onLike: (id: string) => Promise<void>;
    isActive: boolean;
    onReelDeleted?: (id: string) => void;
    onShare?: (reelId: string) => void;
    shareLoading?: boolean;
}

const ReelItem = ({
    reel,
    currentUser,
    onLike,
    isActive,
    onReelDeleted,
    onShare,
    shareLoading = false,
}: ReelItemProps) => {
    const videoRef = useRef<Video>(null);
    const socket = getSocket();
    const lastTap = useRef(0);
    const doubleTapTimeout = useRef<NodeJS.Timeout>();

    const [showComments, setShowComments] = useState(false);
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [likes, setLikes] = useState<any[]>([]);
    const [shares, setShares] = useState<any[]>([]);
    const [isLiked, setIsLiked] = useState(false);
    const [postOwner, setPostOwner] = useState<any>(null);
    const [chatLoading, setChatLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showLikeAnimation, setShowLikeAnimation] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const controlsTimeout = useRef<NodeJS.Timeout>();

    /* ================= FETCH INITIAL DATA ================= */
    const fetchReelData = async () => {
        try {
            const res = await axios.get(
                `https://auth.vizit.homes/api/reels/reel/${reel._id}`
            );

            const { likes = [], comments = [], shares = [] } = res.data.reel || {};

            setLikes(likes);
            setComments(comments);
            setShares(shares);

            if (currentUser) {
                setIsLiked(likes.some((like: any) => String(like.id) === String(currentUser._id)));
            }
        } catch (err) {
            console.error("Failed to fetch reel data:", err);
        }
    };

    /* ================= FETCH POST OWNER ================= */
    const fetchPostOwner = async () => {
        if (!reel?.email) return;

        try {
            const res = await axios.get(
                `https://auth.vizit.homes/api/user/me/${reel.email}`
            );
            setPostOwner(res.data.user);
        } catch (error) {
            console.error("Failed to fetch user:", error);
        }
    };

    useEffect(() => {
        if (reel?._id) {
            fetchReelData();
            fetchPostOwner();
        }
    }, [reel._id]);

    /* ================= SOCKET LISTENERS ================= */
    useEffect(() => {
        if (!socket) return;

        const handleLikeUpdated = ({ reelId, likes }: any) => {
            if (reelId !== reel._id) return;
            setLikes(likes);
            if (currentUser) {
                setIsLiked(likes.some((like: any) => String(like.id) === String(currentUser._id)));
            }
        };

        const handleCommentAdded = ({ reelId, comment }: any) => {
            if (reelId !== reel._id) return;
            setComments(prev => [comment, ...prev]);
        };

        const handleReelDeleted = ({ reelId }: any) => {
            if (reelId === reel._id && onReelDeleted) {
                onReelDeleted(reelId);
            }
        };

        socket.on("reel:likeUpdated", handleLikeUpdated);
        socket.on("reel:commentAdded", handleCommentAdded);
        socket.on("reel:deleted", handleReelDeleted);

        return () => {
            socket.off("reel:likeUpdated", handleLikeUpdated);
            socket.off("reel:commentAdded", handleCommentAdded);
            socket.off("reel:deleted", handleReelDeleted);
        };
    }, [socket, reel._id, currentUser, onReelDeleted]);

    /* ================= VIDEO PLAYBACK ================= */
    useEffect(() => {
        if (!videoRef.current) return;

        if (isActive) {
            videoRef.current.playAsync();
            setIsPlaying(true);
        } else {
            videoRef.current.pauseAsync();
            setIsPlaying(false);
        }
    }, [isActive]);

    /* ================= AUTO-HIDE CONTROLS ================= */
    useEffect(() => {
        if (showControls) {
            if (controlsTimeout.current) {
                clearTimeout(controlsTimeout.current);
            }
            controlsTimeout.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }

        return () => {
            if (controlsTimeout.current) {
                clearTimeout(controlsTimeout.current);
            }
        };
    }, [showControls]);

    /* ================= HANDLERS ================= */
    const handleTap = () => {
        setShowControls(true);

        const now = Date.now();
        if (lastTap.current && now - lastTap.current < 300) {
            clearTimeout(doubleTapTimeout.current);
            handleDoubleTap();
            lastTap.current = 0;
        } else {
            lastTap.current = now;
            doubleTapTimeout.current = setTimeout(() => {
                lastTap.current = 0;
            }, 300);
        }
    };

    const handleDoubleTap = () => {
        if (!currentUser) return;

        setShowLikeAnimation(true);
        setTimeout(() => setShowLikeAnimation(false), 1000);

        if (!isLiked) {
            handleLikeClick();
        } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const handlePlayPause = () => {
        if (!videoRef.current) return;

        if (isPlaying) {
            videoRef.current.pauseAsync();
        } else {
            videoRef.current.playAsync();
        }
        setIsPlaying(!isPlaying);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowControls(true);
    };

    const handleSeekForward = async () => {
        if (!videoRef.current) return;
        const newTime = Math.min(currentTime + 10, duration);
        await videoRef.current.setPositionAsync(newTime * 1000);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowControls(true);
    };

    const handleSeekBackward = async () => {
        if (!videoRef.current) return;
        const newTime = Math.max(currentTime - 10, 0);
        await videoRef.current.setPositionAsync(newTime * 1000);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowControls(true);
    };

    const handleSeek = async (value: number) => {
        if (!videoRef.current) return;
        const newTime = (value / 100) * duration;
        await videoRef.current.setPositionAsync(newTime * 1000);
        setShowControls(true);
    };

    const handlePlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setCurrentTime(status.positionMillis / 1000);
            setDuration(status.durationMillis / 1000);
            setIsPlaying(status.isPlaying);

            if (status.isBuffering) {
                setLoadingProgress(status.playableDurationMillis / status.durationMillis * 100);
            } else {
                setLoadingProgress(100);
            }
        }
    };

    const handleLikeClick = async () => {
        if (!currentUser) return;

        setIsLiked(prev => !prev);
        setLikes(prev =>
            isLiked
                ? prev.filter(l => String(l.id) !== String(currentUser._id))
                : [...prev, { id: currentUser._id, name: currentUser.name }]
        );

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            await onLike(reel._id);
        } catch {
            fetchReelData();
        }
    };

    const handleCommentClick = () => {
        setShowComments(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleShareClick = async () => {
        if (onShare) {
            onShare(reel._id);
        } else {
            // Default share behavior if no handler provided
            try {
                await Share.share({
                    message: `Check out this reel on Vizit!\n\n${reel.caption}\n\nWatch here: vizit://reels/${reel._id}`,
                    title: 'Share Reel',
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
                console.error('Error sharing:', error);
            }
        }
    };

    const handleChatPress = async (targetUserId: string) => {
        if (!targetUserId || !currentUser) return;

        try {
            setChatLoading(true);
            const token = await AsyncStorage.getItem("userToken");
            const loggedInUserId = currentUser._id;

            await axios.put(
                `https://auth.vizit.homes/api/owner/add/chat/idnow/${loggedInUserId}`,
                { chatId: targetUserId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            await axios.put(
                `https://auth.vizit.homes/api/owner/add/chat/id/${targetUserId}`,
                { chatId: loggedInUserId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.push({
                pathname: "/MainChat",
                params: {
                    chatid: targetUserId,
                    type: "direct"
                }
            })
        } catch (error) {
            console.error("Add chat error:", error);
        } finally {
            setChatLoading(false);
        }
    };

    return (
        <View style={styles.reelContainer}>
            <StatusBar hidden />

            <TouchableOpacity
                activeOpacity={1}
                onPress={handleTap}
                style={styles.videoTouchable}
            >
                <Video
                    ref={videoRef}
                    source={{ uri: reel.videoUrl }}
                    style={styles.video}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    isLooping
                    isMuted={false}
                    onLoad={() => setVideoLoaded(true)}
                    onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                />

                <VideoControls
                    isPlaying={isPlaying}
                    onPlayPause={handlePlayPause}
                    onSeekForward={handleSeekForward}
                    onSeekBackward={handleSeekBackward}
                    currentTime={currentTime}
                    duration={duration}
                    onSeek={handleSeek}
                    visible={showControls}
                />

                <LikeAnimation visible={showLikeAnimation} />
            </TouchableOpacity>

            <View style={styles.overlay}>
                <View style={styles.bottomSection}>
                    <ReelHeader
                        username={postOwner?.name || reel.email?.split('@')[0] || "User"}
                        caption={reel.caption}
                        avatar={postOwner?.profile}
                        timestamp={formatTime(reel.createdAt)}
                        reelOwnerId={reel.postownerId}
                        verified={postOwner?.verified}
                        currentUser={currentUser}
                        onChatPress={handleChatPress}
                        chatLoading={chatLoading}
                    />
                </View>

                <View style={styles.rightSection}>
                    <ReelActions
                        likes={likes.length}
                        comments={comments.length}
                        shares={shares.length}
                        isLiked={isLiked}
                        onLike={handleLikeClick}
                        onComment={handleCommentClick}
                        onShare={handleShareClick}
                        shareLoading={shareLoading}
                    />
                </View>
            </View>

            <CommentsModal
                visible={showComments}
                onClose={() => setShowComments(false)}
                reelId={reel._id}
                commentCount={comments.length}
                currentUser={currentUser}
            />
        </View>
    );
};

/* ================= MAIN REELS SCREEN ================= */

export default function ReelsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [reels, setReels] = useState<Reel[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUser, setCurrentUser] = useState<User>();
    const [activeIndex, setActiveIndex] = useState(0);
    const [shareLoading, setShareLoading] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);

    /* ================= LOAD USER & REELS ================= */
    useEffect(() => {
        const initialize = async () => {
            await Promise.all([decodeUser(), fetchReels()]);
        };
        initialize();
    }, []);

    /* ================= HANDLE DEEP LINK / SHARED REEL ================= */
    useEffect(() => {
        if (reels.length > 0 && params.reelId) {
            const reelId = params.reelId as string;
            const index = reels.findIndex(r => r._id === reelId);

            if (index !== -1) {
                // Scroll to the specific reel
                setTimeout(() => {
                    flatListRef.current?.scrollToIndex({
                        index,
                        animated: true,
                        viewPosition: 0,
                    });
                    setActiveIndex(index);
                }, 500);
            }
        }
    }, [reels, params.reelId]);

    /* ================= HANDLE INCOMING LINKS ================= */
    useEffect(() => {
        const handleDeepLink = (event: { url: string }) => {
            const url = event.url;
            const reelIdMatch = url.match(/reels\/([a-zA-Z0-9]+)/);
            if (reelIdMatch && reelIdMatch[1]) {
                const reelId = reelIdMatch[1];
                const index = reels.findIndex(r => r._id === reelId);
                if (index !== -1) {
                    flatListRef.current?.scrollToIndex({
                        index,
                        animated: true,
                        viewPosition: 0,
                    });
                    setActiveIndex(index);
                }
            }
        };

        // Listen for deep links
        const subscription = Linking.addEventListener('url', handleDeepLink);

        // Check initial URL
        Linking.getInitialURL().then((url) => {
            if (url) {
                handleDeepLink({ url });
            }
        });

        return () => {
            subscription.remove();
        };
    }, [reels]);

    const decodeUser = async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            if (!token) return;

            const res = await axios.get(
                "https://auth.vizit.homes/api/owner/decode/token/owner",
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.status === 200) {
                setCurrentUser(res.data.res);
            }
        } catch (err) {
            console.error("Failed to decode user:", err);
        }
    };

    const fetchReels = async () => {
        try {
            const res = await axios.get(
                "https://auth.vizit.homes/api/reels/reels"
            );
            if (res.status === 200) {
                setReels(res.data.reels);
            }
        } catch (err) {
            console.error("Failed to fetch reels:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    /* ================= PULL TO REFRESH ================= */
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchReels();
    }, []);

    /* ================= HANDLE LIKE ================= */
    const handleLike = async (reelId: string) => {
        if (!currentUser) return;

        await axios.post(
            `https://auth.vizit.homes/api/reels/reel/${reelId}/like`,
            {
                id: currentUser._id,
                name: currentUser.name,
                email: currentUser.email,
                profile: currentUser.profile,
            }
        );
    };

    /* ================= HANDLE SHARE ================= */
    const handleShare = async (reelId: string) => {
        setShareLoading(reelId);

        try {
            // Create shareable link
            const shareUrl = `vizit://reels/${reelId}`;
            const webUrl = `https://vizit.app/reels?reelId=${reelId}`;

            await Share.share({
                message: `Check out this amazing reel on Vizit!\n\nWatch here: ${webUrl}`,
                title: 'Share Reel',
                url: shareUrl, // iOS only
            });

            // Increment share count via API
            await axios.post(
                `https://auth.vizit.homes/api/reels/reel/${reelId}/share`,
                {
                    id: currentUser?._id,
                }
            );

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Error sharing:', error);
        } finally {
            setShareLoading(null);
        }
    };

    /* ================= HANDLE REEL DELETED ================= */
    const handleReelDeleted = (reelId: string) => {
        setReels(prev => prev.filter(r => r._id !== reelId));
    };

    /* ================= RENDER ITEM ================= */
    const renderItem = ({ item, index }: { item: Reel; index: number }) => (
        <ReelItem
            reel={item}
            currentUser={currentUser}
            onLike={handleLike}
            isActive={index === activeIndex}
            onReelDeleted={handleReelDeleted}
            onShare={handleShare}
            shareLoading={shareLoading === item._id}
        />
    );

    /* ================= ON VIEWABLE ITEMS CHANGED ================= */
    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setActiveIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 70,
    }).current;

    const getItemLayout = useCallback((_data: any, index: number) => ({
        length: height,
        offset: height * index,
        index,
    }), []);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10ca8c" />
                <Text style={styles.loadingText}>Loading reels...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>

                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <AntDesign name="home" size={24} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Reels</Text>
                {/* <View style={styles.headerRight} /> */}

                <TouchableOpacity onPress={() => router.push("/addreel")} style={styles.backButton}>
                    <AntDesign name="plus-circle" size={24} color="#fff" />
                </TouchableOpacity>

            </View>

            <FlatList
                ref={flatListRef}
                data={reels}
                renderItem={renderItem}
                keyExtractor={(item) => item._id}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                initialNumToRender={3}
                maxToRenderPerBatch={3}
                windowSize={5}
                removeClippedSubviews={true}
                getItemLayout={getItemLayout}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#10ca8c"
                        colors={["#10ca8c"]}
                        progressBackgroundColor="#fff"
                    />
                }
            />
        </SafeAreaView>
    );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
        marginTop: -30
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: "#fff",
    },
    header: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 10,
        backgroundColor: "transparent",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#fff",
    },
    headerRight: {
        width: 40,
    },
    reelContainer: {
        width: width,
        height: height,
        backgroundColor: "#000",
        position: "relative",
    },
    videoTouchable: {
        width: width,
        height: height,
    },
    video: {
        width: width,
        height: height,
    },
    bottomLoadingContainer: {
        position: "absolute",
        bottom: 100,
        left: 16,
        right: 80,
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 20,
        padding: 8,
        alignItems: "center",
    },
    bottomLoadingTrack: {
        width: "100%",
        height: 4,
        backgroundColor: "rgba(255,255,255,0.3)",
        borderRadius: 2,
        overflow: "hidden",
        marginBottom: 4,
    },
    bottomLoadingFill: {
        height: "100%",
        backgroundColor: "#10ca8c",
        borderRadius: 2,
    },
    bottomLoadingText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "space-between",
        paddingBottom: 40,
    },
    bottomSection: {
        position: "absolute",
        bottom: 40,
        left: 16,
        right: 80,
    },
    rightSection: {
        position: "absolute",
        bottom: 100,
        right: 16,
        alignItems: "center",
    },
    headerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: "row",
        flex: 1,
    },
    headerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: "#10ca8c",
        marginRight: 12,
    },
    headerInfo: {
        flex: 1,
    },
    usernameContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    headerUsername: {
        fontSize: 16,
        fontWeight: "700",
        color: "#fff",
        marginRight: 4,
    },
    verifiedBadge: {
        marginLeft: 4,
    },
    headerCaption: {
        fontSize: 14,
        color: "#fff",
        marginBottom: 4,
        opacity: 0.9,
    },
    headerTimestamp: {
        fontSize: 11,
        color: "#ccc",
    },
    chatButton: {
        backgroundColor: "#10ca8c",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginLeft: 12,
    },
    chatButtonText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "600",
    },
    actionsContainer: {
        alignItems: "center",
        gap: 16,
    },
    actionButton: {
        alignItems: "center",
        gap: 4,
    },
    actionText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    /* Controls Styles */
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    progressContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: "rgba(255,255,255,0.3)",
    },
    progressBar: {
        height: "100%",
        backgroundColor: "#10ca8c",
    },
    centerControls: {
        flexDirection: "row",
        alignItems: "center",
        gap: 30,
    },
    controlButton: {
        alignItems: "center",
        justifyContent: "center",
    },
    controlText: {
        color: "#fff",
        fontSize: 10,
        marginTop: 2,
    },
    playButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    timeContainer: {
        position: "absolute",
        bottom: 60,
        left: 16,
        flexDirection: "row",
        gap: 4,
    },
    timeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    seekContainer: {
        position: "absolute",
        bottom: 40,
        left: 16,
        right: 16,
        height: 30,
        justifyContent: "center",
    },
    seekTrack: {
        width: "100%",
        height: 4,
        backgroundColor: "rgba(255,255,255,0.3)",
        borderRadius: 2,
    },
    seekFill: {
        height: "100%",
        backgroundColor: "#10ca8c",
        borderRadius: 2,
    },
    likeAnimation: {
        position: "absolute",
        top: "50%",
        left: "50%",
        marginLeft: -40,
        marginTop: -40,
        zIndex: 100,
    },
    /* Modal Styles */
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: "80%",
        paddingTop: 16,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333",
    },
    modalClose: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#f5f5f5",
        justifyContent: "center",
        alignItems: "center",
    },
    commentsLoading: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    commentsList: {
        flex: 1,
    },
    commentsListContent: {
        padding: 16,
    },
    emptyComments: {
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyCommentsText: {
        marginTop: 10,
        fontSize: 14,
        color: "#999",
        textAlign: "center",
    },
    commentItem: {
        flexDirection: "row",
        marginBottom: 16,
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 12,
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    commentUsername: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
        marginRight: 8,
    },
    commentTime: {
        fontSize: 11,
        color: "#999",
    },
    commentText: {
        fontSize: 14,
        color: "#444",
        lineHeight: 20,
        marginBottom: 8,
    },
    commentLike: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 4,
    },
    commentLikeText: {
        fontSize: 12,
        color: "#999",
    },
    commentLikedText: {
        color: "#ff4444",
    },
    commentInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
        backgroundColor: "#fff",
    },
    commentInput: {
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
    commentPostButton: {
        backgroundColor: "#10ca8c",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    commentPostButtonDisabled: {
        backgroundColor: "#ccc",
    },
    commentPostButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
});