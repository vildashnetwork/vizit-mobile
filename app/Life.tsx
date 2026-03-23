// LiveSessionManager.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
    Platform,
    StatusBar,
    KeyboardAvoidingView,
    useWindowDimensions,
    Animated,
    Easing,
    Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

// Types
interface Owner {
    _id: string;
    name: string;
    email: string;
    profile: string;
    companyname?: string;
}

interface LiveSession {
    _id: string;
    title: string;
    description: string;
    streamKey: string;
    roomUrl: string;
    viewers: string[];
    viewerCount?: number;
    isLive: boolean;
    isScheduled: boolean;
    scheduledAt: string;
    startedAt: string;
    endedAt: string;
    createdAt: string;
    createdbyId: Owner;
    status: "live" | "scheduled" | "ended";
}

const API_BASE = "https://vizit-backend-hubw.onrender.com/api";

const LiveSessionManager: React.FC = () => {
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const [owner, setOwner] = useState<Owner | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
    const [scheduledSessions, setScheduledSessions] = useState<LiveSession[]>([]);
    const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [scheduleMode, setScheduleMode] = useState(false);
    const [scheduledDateTime, setScheduledDateTime] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [newSession, setNewSession] = useState({
        title: "",
        description: ""
    });
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState<string | null>(null);
    const [countdowns, setCountdowns] = useState<Record<string, string>>({});
    const [pulseAnim] = useState(new Animated.Value(1));

    // Pulse animation
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    // Decode owner token
    const decodeOwner = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            if (!token) {
                console.warn("No token found");
                setLoading(false);
                return;
            }

            const res = await axios.get(`${API_BASE}/owner/decode/token/owner`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 200) {
                setOwner(res.data.res);
                console.log("✅ Owner decoded:", res.data.res.name);
            }
        } catch (error) {
            console.error("Failed to decode token:", error);
            setError("Failed to authenticate. Please login again.");
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch all live sessions for owner
    const fetchLiveSessions = useCallback(async () => {
        if (!owner?._id) return;

        try {
            const res = await axios.get(`${API_BASE}/live/owner/${owner._id}`);
            if (res.data.success) {
                const allSessions: LiveSession[] = res.data.liveSessions;
                setLiveSessions(allSessions.filter(s => !s.isLive && !s.isScheduled));
                setScheduledSessions(allSessions.filter(s => s.isScheduled && !s.isLive && new Date(s.scheduledAt) > new Date()));
                const active = allSessions.find(s => s.isLive);
                setActiveSession(active || null);
            }
        } catch (err) {
            console.error("Failed to fetch live sessions:", err);
            setError("Failed to load live sessions");
        }
    }, [owner?._id]);

    // Fetch active session for owner
    const fetchActiveSession = useCallback(async () => {
        if (!owner?._id) return;

        try {
            const res = await axios.get(`${API_BASE}/live/owner/${owner._id}/active`);
            if (res.data.success) {
                setActiveSession(res.data.activeSession);
            }
        } catch (err) {
            console.error("Failed to fetch active session:", err);
        }
    }, [owner?._id]);

    // Initial load
    useEffect(() => {
        decodeOwner();
    }, [decodeOwner]);

    // Load sessions after owner is loaded
    useEffect(() => {
        if (owner?._id) {
            fetchLiveSessions();
            const interval = setInterval(fetchActiveSession, 10000);
            return () => clearInterval(interval);
        }
    }, [owner?._id, fetchLiveSessions, fetchActiveSession]);

    // Countdown timer for scheduled sessions
    useEffect(() => {
        const interval = setInterval(() => {
            const newCountdowns: Record<string, string> = {};
            scheduledSessions.forEach(session => {
                if (session.scheduledAt) {
                    const diff = new Date(session.scheduledAt).getTime() - Date.now();
                    if (diff > 0) {
                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                        if (days > 0) {
                            newCountdowns[session._id] = `${days}d ${hours}h`;
                        } else if (hours > 0) {
                            newCountdowns[session._id] = `${hours}h ${minutes}m`;
                        } else {
                            newCountdowns[session._id] = `${minutes}m`;
                        }
                    } else {
                        newCountdowns[session._id] = "Ready to start!";
                    }
                }
            });
            setCountdowns(newCountdowns);
        }, 60000);
        return () => clearInterval(interval);
    }, [scheduledSessions]);

    // Create a new live session
    const createLiveSession = async () => {
        if (!newSession.title.trim()) {
            Alert.alert("Error", "Please enter a title");
            return;
        }

        if (scheduleMode && !scheduledDateTime) {
            Alert.alert("Error", "Please select a date and time for the scheduled session");
            return;
        }

        if (scheduleMode && scheduledDateTime && scheduledDateTime <= new Date()) {
            Alert.alert("Error", "Please select a future date and time");
            return;
        }

        setActionLoading(true);
        setError(null);

        try {
            const payload: any = {
                createdbyId: owner?._id,
                title: newSession.title,
                description: newSession.description
            };

            if (scheduleMode && scheduledDateTime) {
                payload.scheduledAt = scheduledDateTime.toISOString();
            }

            const res = await axios.post(`${API_BASE}/live/create`, payload);

            if (res.data.success) {
                if (scheduleMode) {
                    Alert.alert(
                        "Session Scheduled",
                        `Live session scheduled for ${scheduledDateTime?.toLocaleString()}! Notifications sent to house seekers.`
                    );
                } else {
                    Alert.alert("Success", "Live session created successfully! Click 'Go Live' to start streaming.");
                }
                setShowCreateModal(false);
                setNewSession({ title: "", description: "" });
                setScheduleMode(false);
                setScheduledDateTime(null);
                fetchLiveSessions();
            }
        } catch (err: any) {
            console.error("Create session error:", err);
            Alert.alert("Error", err.response?.data?.message || "Failed to create live session");
        } finally {
            setActionLoading(false);
        }
    };

    // Start a scheduled session
    const startScheduledSession = async (session: LiveSession) => {
        Alert.alert(
            "Start Session",
            `Start "${session.title}" now? This will send live notifications to all house seekers.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Start Now",
                    onPress: async () => {
                        setActionLoading(true);
                        setError(null);

                        try {
                            const res = await axios.post(`${API_BASE}/live/toggle`, {
                                sessionId: session._id,
                                streamKey: session.streamKey
                            });

                            if (res.data.success && res.data.isLive) {
                                Alert.alert("Live", `${session.title} is now LIVE! Notifications sent.`);
                                // Open the room URL in browser
                                if (res.data.roomUrl) {
                                    Linking.openURL(res.data.roomUrl);
                                }
                                fetchLiveSessions();
                            }
                        } catch (err: any) {
                            console.error("Start scheduled session error:", err);
                            Alert.alert("Error", err.response?.data?.message || "Failed to start scheduled session");
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Start an immediate live session (Go Live)
    const startImmediateSession = async (session: LiveSession) => {
        setActionLoading(true);
        setError(null);

        try {
            const res = await axios.post(`${API_BASE}/live/toggle`, {
                sessionId: session._id,
                streamKey: session.streamKey
            });

            if (res.data.success && res.data.isLive) {
                Alert.alert("Live", `${session.title} is now LIVE! Notifications sent to house seekers.`);
                // Open the room URL in browser
                if (res.data.roomUrl) {
                    Linking.openURL(res.data.roomUrl);
                }
                fetchLiveSessions();
            }
        } catch (err: any) {
            console.error("Start live session error:", err);
            Alert.alert("Error", err.response?.data?.message || "Failed to start live session");
        } finally {
            setActionLoading(false);
        }
    };

    // End live session
    const endLiveSession = async (session: LiveSession) => {
        Alert.alert(
            "End Session",
            `Are you sure you want to end "${session.title}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "End Session",
                    style: "destructive",
                    onPress: async () => {
                        setActionLoading(true);
                        setError(null);

                        try {
                            const res = await axios.post(`${API_BASE}/live/toggle`, {
                                sessionId: session._id,
                                streamKey: session.streamKey
                            });

                            if (res.data.success && !res.data.isLive) {
                                Alert.alert("Ended", `${session.title} has ended.`);
                                fetchLiveSessions();
                            }
                        } catch (err: any) {
                            console.error("End live session error:", err);
                            Alert.alert("Error", err.response?.data?.message || "Failed to end live session");
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Delete live session
    const deleteLiveSession = async (session: LiveSession) => {
        Alert.alert(
            "Delete Session",
            `Are you sure you want to delete "${session.title}"? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setActionLoading(true);
                        setError(null);

                        try {
                            const res = await axios.delete(`${API_BASE}/live/delete`, {
                                data: {
                                    sessionId: session._id,
                                    streamKey: session.streamKey
                                }
                            });

                            if (res.data.success) {
                                setLiveSessions(liveSessions.filter(s => s._id !== session._id));
                                setScheduledSessions(scheduledSessions.filter(s => s._id !== session._id));
                                if (activeSession?._id === session._id) {
                                    setActiveSession(null);
                                }
                                Alert.alert("Deleted", "Live session deleted successfully!");
                            }
                        } catch (err: any) {
                            console.error("Delete session error:", err);
                            Alert.alert("Error", err.response?.data?.message || "Failed to delete live session");
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Copy to clipboard
    const copyToClipboard = async (text: string) => {
        await Clipboard.setString(text);
        setCopySuccess(text);
        setTimeout(() => setCopySuccess(null), 2000);
    };

    const formatDate = (date: string) => {
        if (!date) return "";
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (date: string) => {
        if (!date) return "";
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDateTime = (date: string) => {
        if (!date) return "";
        return new Date(date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDuration = (start: string, end: string) => {
        if (!start || !end) return null;
        const duration = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
        if (duration < 60) return `${duration} min`;
        const hours = Math.floor(duration / 60);
        const mins = duration % 60;
        return `${hours}h ${mins}m`;
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchLiveSessions();
        setRefreshing(false);
    }, [fetchLiveSessions]);

    // Loading state
    if (loading) {
        return (
            <SafeAreaView style={styles.safeContainer}>
                <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#10ca8c" />
                    <Text style={styles.loadingText}>Loading your dashboard...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!owner) {
        return (
            <SafeAreaView style={styles.safeContainer}>
                <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
                <View style={styles.errorContainer}>
                    <Ionicons name="lock-closed" size={64} color="#dc2626" />
                    <Text style={styles.errorText}>Please login to access live sessions</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.rootContainer}>
            <StatusBar barStyle="light-content" backgroundColor="#10ca8c" />
            <SafeAreaView style={styles.safeContainer} edges={["top"]}>
                <LinearGradient
                    colors={["#10ca8c", "#0e9f6e"]}
                    style={[styles.headerGradient, { paddingTop: insets.top || 12 }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.headerContent}>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Live Sessions</Text>
                            <Text style={styles.headerSubtitle}>Create and manage your live streaming sessions</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.createButton, activeSession && styles.createButtonDisabled]}
                            onPress={() => setShowCreateModal(true)}
                            disabled={activeSession !== null}
                        >
                            <Ionicons name="add" size={20} color="#fff" />
                            <Text style={styles.createButtonText}>Create</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#10ca8c"]} />
                    }
                >
                    {/* Error Message */}
                    {error && (
                        <View style={styles.errorBanner}>
                            <Ionicons name="alert-circle" size={20} color="#dc2626" />
                            <Text style={styles.errorBannerText}>{error}</Text>
                            <TouchableOpacity onPress={() => setError(null)}>
                                <Ionicons name="close" size={18} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Welcome Banner */}
                    <View style={styles.welcomeBanner}>
                        <Ionicons name="checkmark-circle" size={16} color="#10ca8c" />
                        <Text style={styles.welcomeText}>
                            Welcome back, <Text style={styles.welcomeName}>{owner.name}</Text>!
                        </Text>
                    </View>

                    {/* Active Session Banner */}
                    {activeSession && (
                        <LinearGradient
                            colors={["#ef4444", "#dc2626"]}
                            style={styles.activeBanner}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.liveIndicator}>
                                <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]} />
                                <Text style={styles.liveText}>LIVE</Text>
                            </View>
                            <View style={styles.activeInfo}>
                                <Text style={styles.activeTitle}>{activeSession.title}</Text>
                                <Text style={styles.activeDesc} numberOfLines={2}>
                                    {activeSession.description || "No description provided"}
                                </Text>
                                <View style={styles.activeStats}>
                                    <View style={styles.statBadge}>
                                        <Ionicons name="people-outline" size={14} color="#fff" />
                                        <Text style={styles.statBadgeText}>{activeSession.viewers?.length || 0} viewers</Text>
                                    </View>
                                    <View style={styles.statBadge}>
                                        <Ionicons name="time-outline" size={14} color="#fff" />
                                        <Text style={styles.statBadgeText}>Started: {formatTime(activeSession.startedAt)}</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.activeActions}>
                                <TouchableOpacity
                                    style={styles.roomButton}
                                    onPress={() => Linking.openURL(`https://sfu.mirotalk.com/join/?room=${activeSession.streamKey}`)}
                                >
                                    <Ionicons name="videocam" size={16} color="#dc2626" />
                                    <Text style={styles.roomButtonText}>Go to Room</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.copyButton}
                                    onPress={() => copyToClipboard(`https://sfu.mirotalk.com/join/?room=${activeSession.streamKey}`)}
                                >
                                    <Ionicons name="copy-outline" size={16} color="#fff" />
                                    <Text style={styles.copyButtonText}>Copy Link</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.endButton}
                                    onPress={() => endLiveSession(activeSession)}
                                    disabled={actionLoading}
                                >
                                    <Ionicons name="stop-circle" size={16} color="#fff" />
                                    <Text style={styles.endButtonText}>End Live</Text>
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    )}

                    {/* Scheduled Sessions Section */}
                    {scheduledSessions.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="calendar" size={22} color="#f59e0b" />
                                <Text style={styles.sectionTitle}>Upcoming Scheduled Sessions ({scheduledSessions.length})</Text>
                            </View>
                            <View style={styles.grid}>
                                {scheduledSessions.map(session => (
                                    <View key={session._id} style={styles.scheduledCard}>
                                        <View style={styles.scheduledBadge}>
                                            <Ionicons name="calendar" size={12} color="#fff" />
                                            <Text style={styles.scheduledBadgeText}>Scheduled</Text>
                                        </View>
                                        <View style={styles.cardContent}>
                                            <Text style={styles.cardTitle}>{session.title}</Text>
                                            <View style={styles.dateTimeBadge}>
                                                <Ionicons name="calendar-outline" size={12} color="#b85c00" />
                                                <Text style={styles.dateTimeText}>{formatDateTime(session.scheduledAt)}</Text>
                                            </View>
                                            <Text style={styles.cardDesc} numberOfLines={2}>{session.description || "No description"}</Text>
                                            <View style={styles.cardFooter}>
                                                <View style={styles.countdownBadge}>
                                                    <Ionicons name="time-outline" size={12} color="#b85c00" />
                                                    <Text style={styles.countdownText}>{countdowns[session._id] || "Calculating..."}</Text>
                                                </View>
                                                <View style={styles.viewerBadge}>
                                                    <Ionicons name="people-outline" size={12} color="#6b7280" />
                                                    <Text style={styles.viewerBadgeText}>{session.viewers?.length || 0} interested</Text>
                                                </View>
                                            </View>
                                            <View style={styles.cardActions}>
                                                <TouchableOpacity
                                                    style={styles.startButton}
                                                    onPress={() => startScheduledSession(session)}
                                                    disabled={actionLoading}
                                                >
                                                    <Ionicons name="play" size={14} color="#fff" />
                                                    <Text style={styles.startButtonText}>Start Now</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.copySmallButton}
                                                    onPress={() => copyToClipboard(`https://sfu.mirotalk.com/join/?room=${session.streamKey}`)}
                                                >
                                                    <Ionicons name="copy-outline" size={14} color="#6b7280" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.deleteSmallButton}
                                                    onPress={() => deleteLiveSession(session)}
                                                    disabled={actionLoading}
                                                >
                                                    <Ionicons name="trash-outline" size={14} color="#dc2626" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Past Sessions Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Past Sessions</Text>
                        {liveSessions.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="tv-outline" size={64} color="#9ca3af" />
                                <Text style={styles.emptyTitle}>No past sessions yet</Text>
                                <Text style={styles.emptySubtext}>Create your first live session to connect with your audience!</Text>
                            </View>
                        ) : (
                            <View style={styles.pastList}>
                                {liveSessions.map(session => (
                                    <View key={session._id} style={styles.pastCard}>
                                        <View style={styles.pastCardContent}>
                                            <View style={styles.pastCardHeader}>
                                                <Text style={styles.pastCardTitle}>{session.title}</Text>
                                                <Text style={styles.pastCardDate}>
                                                    <Ionicons name="calendar-outline" size={10} color="#9ca3af" />
                                                    {formatDate(session.createdAt)}
                                                </Text>
                                            </View>
                                            <Text style={styles.pastCardDesc} numberOfLines={1}>{session.description || "No description"}</Text>
                                            <View style={styles.pastCardStats}>
                                                <View style={styles.pastStatItem}>
                                                    <Ionicons name="people-outline" size={12} color="#9ca3af" />
                                                    <Text>{session.viewers?.length || 0} viewers</Text>
                                                </View>
                                                {session.startedAt && session.endedAt && (
                                                    <View style={styles.pastStatItem}>
                                                        <Ionicons name="time-outline" size={12} color="#9ca3af" />
                                                        <Text>{formatDuration(session.startedAt, session.endedAt)}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        <View style={styles.pastCardActions}>
                                            <TouchableOpacity
                                                style={styles.copySmallButton}
                                                onPress={() => copyToClipboard(`https://sfu.mirotalk.com/join/?room=${session.streamKey}`)}
                                            >
                                                <Ionicons name="copy-outline" size={14} color="#6b7280" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.deleteSmallButton}
                                                onPress={() => deleteLiveSession(session)}
                                                disabled={actionLoading}
                                            >
                                                <Ionicons name="trash-outline" size={14} color="#dc2626" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>

            {/* Create Session Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCreateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
                        <View style={[styles.modal, { width: width * 0.9 }]}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Create New Live Session</Text>
                                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                    <Ionicons name="close" size={24} color="#9ca3af" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.modalBody}>
                                <View style={styles.toggleMode}>
                                    <TouchableOpacity
                                        style={[styles.modeButton, !scheduleMode && styles.activeMode]}
                                        onPress={() => setScheduleMode(false)}
                                    >
                                        <Ionicons name="videocam" size={18} color={!scheduleMode ? "#fff" : "#6b7280"} />
                                        <Text style={[styles.modeButtonText, !scheduleMode && styles.activeModeText]}>Go Live Now</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modeButton, scheduleMode && styles.activeMode]}
                                        onPress={() => setScheduleMode(true)}
                                    >
                                        <Ionicons name="calendar" size={18} color={scheduleMode ? "#fff" : "#6b7280"} />
                                        <Text style={[styles.modeButtonText, scheduleMode && styles.activeModeText]}>Schedule Later</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Session Title *</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="e.g., Luxury Apartment Tour"
                                        value={newSession.title}
                                        onChangeText={(text) => setNewSession({ ...newSession, title: text })}
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Description</Text>
                                    <TextInput
                                        style={styles.formTextarea}
                                        placeholder="Describe what viewers can expect in this live session..."
                                        value={newSession.description}
                                        onChangeText={(text) => setNewSession({ ...newSession, description: text })}
                                        multiline
                                        numberOfLines={3}
                                    />
                                </View>

                                {scheduleMode && (
                                    <View style={styles.formGroup}>
                                        <Text style={styles.formLabel}>Schedule Date & Time *</Text>
                                        <TouchableOpacity
                                            style={styles.datePickerButton}
                                            onPress={() => setShowDatePicker(true)}
                                        >
                                            <Ionicons name="calendar-outline" size={18} color="#10ca8c" />
                                            <Text style={styles.datePickerText}>
                                                {scheduledDateTime ? scheduledDateTime.toLocaleString() : "Select date and time"}
                                            </Text>
                                        </TouchableOpacity>
                                        {showDatePicker && Platform.OS === 'ios' && (
                                            <DateTimePicker
                                                value={scheduledDateTime || new Date()}
                                                mode="datetime"
                                                display="spinner"
                                                onChange={(event, selectedDate) => {
                                                    if (selectedDate) setScheduledDateTime(selectedDate);
                                                }}
                                                minimumDate={new Date()}
                                            />
                                        )}
                                        {showDatePicker && Platform.OS === 'android' && (
                                            <DateTimePicker
                                                value={scheduledDateTime || new Date()}
                                                mode="date"
                                                display="default"
                                                onChange={(event, selectedDate) => {
                                                    setShowDatePicker(false);
                                                    if (selectedDate) {
                                                        setScheduledDateTime(selectedDate);
                                                        setShowTimePicker(true);
                                                    }
                                                }}
                                                minimumDate={new Date()}
                                            />
                                        )}
                                        {showTimePicker && Platform.OS === 'android' && (
                                            <DateTimePicker
                                                value={scheduledDateTime || new Date()}
                                                mode="time"
                                                display="default"
                                                onChange={(event, selectedTime) => {
                                                    setShowTimePicker(false);
                                                    if (selectedTime && scheduledDateTime) {
                                                        const newDateTime = new Date(scheduledDateTime);
                                                        newDateTime.setHours(selectedTime.getHours());
                                                        newDateTime.setMinutes(selectedTime.getMinutes());
                                                        setScheduledDateTime(newDateTime);
                                                    }
                                                }}
                                            />
                                        )}
                                        <Text style={styles.helperText}>
                                            House seekers will receive an email notification now and a reminder 5 minutes before the session starts.
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.formNote}>
                                    <Ionicons name="information-circle" size={16} color="#92400e" />
                                    <Text style={styles.noteText}>
                                        {scheduleMode
                                            ? "When scheduled, all house seekers will receive an email with the date/time and room link. A reminder will be sent 5 minutes before start."
                                            : "When you start the session, all house seekers will receive an email notification with the room link."
                                        }
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.modalFooter}>
                                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCreateModal(false)}>
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.createModalButton, (!newSession.title.trim() || (scheduleMode && !scheduledDateTime)) && styles.disabledButton]}
                                    onPress={createLiveSession}
                                    disabled={actionLoading || !newSession.title.trim() || (scheduleMode && !scheduledDateTime)}
                                >
                                    {actionLoading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.createModalButtonText}>{scheduleMode ? "Schedule Session" : "Create Session"}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Toast */}
            {copySuccess && (
                <View style={styles.toast}>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.toastText}>Link copied to clipboard!</Text>
                </View>
            )}
        </View>
    );
};

// Add Clipboard import
import { Clipboard } from "react-native";

const styles = StyleSheet.create({
    rootContainer: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    safeContainer: {
        flex: 1,
    },
    headerGradient: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#fff",
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 12,
        color: "rgba(255,255,255,0.9)",
    },
    createButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 4,
    },
    createButtonDisabled: {
        opacity: 0.5,
    },
    createButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: "#6b7280",
    },
    welcomeBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#e8f5e9",
        marginHorizontal: 16,
        marginTop: 16,
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    welcomeText: {
        fontSize: 13,
        color: "#2e7d32",
    },
    welcomeName: {
        fontWeight: "600",
    },
    errorBanner: {
        backgroundColor: "#fef2f2",
        borderWidth: 1,
        borderColor: "#fecaca",
        borderRadius: 8,
        padding: 12,
        marginHorizontal: 16,
        marginTop: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    errorBannerText: {
        flex: 1,
        fontSize: 13,
        color: "#dc2626",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        gap: 12,
    },
    errorText: {
        fontSize: 14,
        color: "#dc2626",
        textAlign: "center",
    },
    activeBanner: {
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 16,
        gap: 12,
    },
    liveIndicator: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        alignSelf: "flex-start",
        gap: 6,
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#fff",
    },
    liveText: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#fff",
        textTransform: "uppercase",
    },
    activeInfo: {
        flex: 1,
    },
    activeTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#fff",
        marginBottom: 4,
    },
    activeDesc: {
        fontSize: 12,
        color: "rgba(255,255,255,0.9)",
        marginBottom: 8,
    },
    activeStats: {
        flexDirection: "row",
        gap: 12,
    },
    statBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    statBadgeText: {
        fontSize: 11,
        color: "#fff",
    },
    activeActions: {
        flexDirection: "row",
        gap: 8,
        flexWrap: "wrap",
    },
    roomButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    roomButtonText: {
        fontSize: 12,
        fontWeight: "500",
        color: "#dc2626",
    },
    copyButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    copyButtonText: {
        fontSize: 12,
        color: "#fff",
    },
    endButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.3)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    endButtonText: {
        fontSize: 12,
        color: "#fff",
    },
    section: {
        paddingHorizontal: 16,
        marginTop: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#374151",
    },
    grid: {
        gap: 16,
    },
    scheduledCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#fed7aa",
        overflow: "hidden",
    },
    scheduledBadge: {
        position: "absolute",
        top: 12,
        left: 12,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f59e0b",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 4,
        zIndex: 2,
    },
    scheduledBadgeText: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#fff",
        textTransform: "uppercase",
    },
    cardContent: {
        padding: 16,
        paddingTop: 48,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#b85c00",
        marginBottom: 8,
    },
    dateTimeBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff2e0",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 16,
        alignSelf: "flex-start",
        marginBottom: 12,
        gap: 4,
    },
    dateTimeText: {
        fontSize: 11,
        color: "#b85c00",
    },
    cardDesc: {
        fontSize: 13,
        color: "#6b7280",
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 12,
    },
    countdownBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fef3c7",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 16,
        gap: 4,
    },
    countdownText: {
        fontSize: 11,
        color: "#b85c00",
    },
    viewerBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f3f4f6",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 16,
        gap: 4,
    },
    viewerBadgeText: {
        fontSize: 11,
        color: "#6b7280",
    },
    cardActions: {
        flexDirection: "row",
        gap: 8,
    },
    startButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#10ca8c",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    startButtonText: {
        fontSize: 12,
        color: "#fff",
        fontWeight: "500",
    },
    copySmallButton: {
        backgroundColor: "#f3f4f6",
        padding: 8,
        borderRadius: 8,
    },
    deleteSmallButton: {
        backgroundColor: "#fee2e2",
        padding: 8,
        borderRadius: 8,
    },
    pastList: {
        gap: 12,
    },
    pastCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#f9fafb",
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    pastCardContent: {
        flex: 1,
    },
    pastCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    pastCardTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#111827",
    },
    pastCardDate: {
        fontSize: 10,
        color: "#9ca3af",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    pastCardDesc: {
        fontSize: 12,
        color: "#6b7280",
        marginBottom: 8,
    },
    pastCardStats: {
        flexDirection: "row",
        gap: 12,
    },
    pastStatItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    pastCardActions: {
        flexDirection: "row",
        gap: 8,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 48,
        backgroundColor: "#f9fafb",
        borderRadius: 16,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: "500",
        color: "#374151",
        marginTop: 12,
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 12,
        color: "#9ca3af",
        textAlign: "center",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    modal: {
        backgroundColor: "#fff",
        borderRadius: 16,
        overflow: "hidden",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111827",
    },
    modalBody: {
        padding: 16,
    },
    toggleMode: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 20,
        backgroundColor: "#f3f4f6",
        padding: 4,
        borderRadius: 12,
    },
    modeButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 10,
        borderRadius: 8,
    },
    activeMode: {
        backgroundColor: "#10ca8c",
    },
    modeButtonText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#6b7280",
    },
    activeModeText: {
        color: "#fff",
    },
    formGroup: {
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 13,
        fontWeight: "500",
        color: "#374151",
        marginBottom: 6,
    },
    formInput: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
    },
    formTextarea: {
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: "top",
    },
    datePickerButton: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 8,
        padding: 10,
        gap: 8,
    },
    datePickerText: {
        fontSize: 14,
        color: "#374151",
    },
    helperText: {
        fontSize: 11,
        color: "#9ca3af",
        marginTop: 4,
    },
    formNote: {
        backgroundColor: "#fef3c7",
        padding: 12,
        borderRadius: 8,
        flexDirection: "row",
        gap: 8,
    },
    noteText: {
        flex: 1,
        fontSize: 12,
        color: "#92400e",
    },
    modalFooter: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
    },
    cancelButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    cancelButtonText: {
        fontSize: 14,
        color: "#6b7280",
    },
    createModalButton: {
        backgroundColor: "#10ca8c",
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
    },
    createModalButtonText: {
        fontSize: 14,
        color: "#fff",
        fontWeight: "500",
    },
    disabledButton: {
        opacity: 0.5,
    },
    toast: {
        position: "absolute",
        bottom: 24,
        left: "50%",
        transform: [{ translateX: -150 }],
        backgroundColor: "#10ca8c",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        width: 300,
        justifyContent: "center",
    },
    toastText: {
        color: "#fff",
        fontSize: 13,
    },
});

export default LiveSessionManager;