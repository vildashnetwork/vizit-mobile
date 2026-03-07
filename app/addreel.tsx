import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    Modal,
    StatusBar,
    SafeAreaView,
    Dimensions,
    Alert,
    Platform,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const API = "https://vizit-backend-hubw.onrender.com/api";

// Types
type User = {
    _id: string;
    name: string;
    email: string;
    profile: string;
    role?: string;
    verified?: boolean;
};

type Reel = {
    _id: string;
    username: string;
    postownerId: string;
    email: string;
    caption: string;
    videoUrl: string;
    avatar: string;
    likes: Array<any>;
    comments: Array<any>;
    createdAt: string;
    updatedAt: string;
};

/* ================= MAIN ADD REEL SCREEN ================= */

export default function AddReelScreen() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [caption, setCaption] = useState('');
    const [videoFile, setVideoFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef<Video>(null);

    // Decode token to get user
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
        } catch (error) {
            console.error("Failed to decode token:", error);
            router.push("/Login");
        }
    }, []);

    useEffect(() => {
        decodeToken();
    }, []);

    const pickVideo = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                quality: 0.8,
                allowsEditing: true,
                videoMaxDuration: 60,
            });

            if (!result.canceled && result.assets[0]) {
                setVideoFile(result.assets[0]);
            }
        } catch (error) {
            console.error("Error picking video:", error);
            Alert.alert("Error", "Failed to pick video");
        }
    };

    const handlePlayPause = async () => {
        if (videoRef.current) {
            if (isPlaying) {
                await videoRef.current.pauseAsync();
            } else {
                await videoRef.current.playAsync();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handlePost = async () => {
        if (!videoFile) {
            Alert.alert("Error", "Please select a video");
            return;
        }

        if (!user?._id) {
            Alert.alert("Error", "User not authenticated");
            return;
        }

        setLoading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', {
                uri: videoFile.uri,
                type: videoFile.mimeType || 'video/mp4',
                name: videoFile.fileName || 'video.mp4',
            } as any);
            formData.append('upload_preset', 'vizit-video');

            const uploadRes = await axios.post(
                `https://api.cloudinary.com/v1_1/dgigs6v72/video/upload`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                        setUploadProgress(percentCompleted);
                    },
                }
            );

            const videoUrl = uploadRes.data.secure_url;

            await axios.post(`${API}/reels/post/reel`, {
                username: user.name,
                postownerId: user._id,
                email: user.email,
                caption,
                videoUrl,
                avatar: user.profile || 'https://via.placeholder.com/100',
            });

            Alert.alert(
                "Success",
                "Your reel has been posted successfully!",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            resetForm();
                            router.back();
                        }
                    }
                ]
            );

        } catch (error) {
            console.error("Error posting reel:", error);
            Alert.alert("Error", "Failed to post reel. Please try again.");
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    const resetForm = () => {
        setVideoFile(null);
        setCaption('');
        setIsPlaying(false);
        setUploadProgress(0);
    };

    const handleCancel = () => {
        Alert.alert(
            "Discard Reel",
            "Are you sure you want to discard this reel?",
            [
                { text: "Stay", style: "cancel" },
                {
                    text: "Discard",
                    style: "destructive",
                    onPress: () => {
                        resetForm();
                        router.back();
                    }
                }
            ]
        );
    };

    if (!user) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
                <ActivityIndicator size="large" color="#10ca8c" />
                <Text style={styles.loadingText}>Loading...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create New Reel</Text>
                <TouchableOpacity
                    onPress={handlePost}
                    style={[
                        styles.postButton,
                        (!videoFile || loading) && styles.disabledButton
                    ]}
                    disabled={!videoFile || loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.postButtonText}>Post</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
            >
                {/* User Info */}
                <LinearGradient
                    colors={['#10ca8c', '#0d9b6e']}
                    style={styles.userCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                >
                    <Image
                        source={{ uri: user.profile || 'https://via.placeholder.com/60' }}
                        style={styles.userAvatar}
                    />
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.name}</Text>
                        <Text style={styles.userEmail}>{user.email}</Text>
                    </View>
                </LinearGradient>

                {/* Video Selection/Preview */}
                <View style={styles.videoSection}>
                    <Text style={styles.sectionTitle}>Video</Text>

                    {!videoFile ? (
                        <TouchableOpacity
                            style={styles.dropzone}
                            onPress={pickVideo}
                            activeOpacity={0.7}
                        >
                            <View style={styles.dropzoneIconContainer}>
                                <Ionicons name="cloud-upload-outline" size={50} color="#10ca8c" />
                            </View>
                            <Text style={styles.dropzoneText}>Tap to select video</Text>
                            <Text style={styles.dropzoneSubtext}>
                                MP4, MOV • Max 60 seconds • Up to 100MB
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.previewContainer}>
                            <View style={styles.previewHeader}>
                                <Text style={styles.previewTitle}>Preview</Text>
                                <TouchableOpacity
                                    onPress={() => setVideoFile(null)}
                                    style={styles.removeButton}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#ff4444" />
                                    <Text style={styles.removeText}>Remove</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.videoContainer}>
                                <Video
                                    ref={videoRef}
                                    source={{ uri: videoFile.uri }}
                                    style={styles.previewVideo}
                                    resizeMode={ResizeMode.CONTAIN}
                                    shouldPlay={false}
                                    isLooping
                                    useNativeControls={false}
                                />
                                <TouchableOpacity
                                    style={styles.playButton}
                                    onPress={handlePlayPause}
                                >
                                    <Ionicons
                                        name={isPlaying ? "pause" : "play"}
                                        size={30}
                                        color="#fff"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* Caption Input */}
                <View style={styles.captionSection}>
                    <Text style={styles.sectionTitle}>Caption</Text>
                    <TextInput
                        style={styles.captionInput}
                        placeholder="Write a caption for your reel..."
                        placeholderTextColor="#999"
                        value={caption}
                        onChangeText={setCaption}
                        multiline
                        maxLength={200}
                    />
                    <Text style={styles.charCount}>
                        {caption.length}/200
                    </Text>
                </View>

                {/* Upload Progress */}
                {loading && (
                    <View style={styles.progressContainer}>
                        <Text style={styles.progressLabel}>Uploading to Your Video...</Text>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${uploadProgress}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>
                            {uploadProgress}% Complete
                        </Text>
                    </View>
                )}

                {/* Guidelines */}
                <View style={styles.guidelinesContainer}>
                    <Text style={styles.guidelinesTitle}>Guidelines</Text>
                    <View style={styles.guidelineItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#10ca8c" />
                        <Text style={styles.guidelineText}>Keep videos under 60 seconds</Text>
                    </View>
                    <View style={styles.guidelineItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#10ca8c" />
                        <Text style={styles.guidelineText}>No inappropriate content</Text>
                    </View>
                    <View style={styles.guidelineItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#10ca8c" />
                        <Text style={styles.guidelineText}>Respect copyright laws</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    closeButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    postButton: {
        backgroundColor: '#10ca8c',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 60,
        alignItems: 'center',
    },
    postButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.5,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 30,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    userAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#fff',
    },
    userInfo: {
        marginLeft: 12,
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
    },
    videoSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    dropzone: {
        height: 200,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#10ca8c',
        borderStyle: 'dashed',
    },
    dropzoneIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    dropzoneText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    dropzoneSubtext: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    previewContainer: {
        marginBottom: 20,
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    previewTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    removeButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    removeText: {
        fontSize: 14,
        color: '#ff4444',
        marginLeft: 4,
        fontWeight: '500',
    },
    videoContainer: {
        height: 200,
        backgroundColor: '#000',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    previewVideo: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    playButton: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -25 }, { translateY: -25 }],
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captionSection: {
        marginBottom: 20,
    },
    captionInput: {
        height: 100,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 16,
        fontSize: 14,
        color: '#333',
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    charCount: {
        fontSize: 11,
        color: '#999',
        textAlign: 'right',
        marginTop: 4,
    },
    progressContainer: {
        marginBottom: 20,
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
    },
    progressLabel: {
        fontSize: 13,
        color: '#333',
        marginBottom: 8,
        fontWeight: '500',
    },
    progressBar: {
        height: 6,
        backgroundColor: '#e0e0e0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#10ca8c',
    },
    progressText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        marginTop: 8,
    },
    guidelinesContainer: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 16,
        marginTop: 10,
    },
    guidelinesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    guidelineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    guidelineText: {
        fontSize: 13,
        color: '#666',
        marginLeft: 8,
    },
    button: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 6,
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
    },
});