import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    SafeAreaView,
    ScrollView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';

const { width, height } = Dimensions.get('window');
const API = "https://auth.vizit.homes/api";

interface AccountBlockedProps {
    reason?: string;
    banDate?: string;
    banDuration?: string;
    appealDeadline?: string;
    nav?: string;
}

const AccountBlocked: React.FC<AccountBlockedProps> = ({
    reason = "Violation of community guidelines and terms of service",
    banDate,
    banDuration = "Indefinite",
    appealDeadline = "48 hours",
    nav = "inactive",
}) => {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [banInfo, setBanInfo] = useState<any>(null);

    // Animation values
    const glitchOffset = useSharedValue(0);
    const pulseScale = useSharedValue(1);
    const rotateValue = useSharedValue(0);

    useEffect(() => {
        if (nav === "active") {
            router.replace("/");
            return;
        }

        // Start animations
        glitchOffset.value = withRepeat(
            withSequence(
                withTiming(5, { duration: 100, easing: Easing.linear }),
                withTiming(-5, { duration: 100, easing: Easing.linear }),
                withTiming(3, { duration: 100, easing: Easing.linear }),
                withTiming(-3, { duration: 100, easing: Easing.linear }),
                withTiming(0, { duration: 100, easing: Easing.linear })
            ),
            -1,
            true
        );

        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
                withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );

        rotateValue.value = withRepeat(
            withTiming(360, {
                duration: 20000,
                easing: Easing.linear
            }),
            -1
        );
    }, [nav]);

    // Fetch user info
    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const token = await AsyncStorage.getItem("userToken");

                if (!token) {
                    setLoading(false);
                    return;
                }

                // Decode token to get user info
                const res = await axios.get(
                    "https://auth.vizit.homes/api/owner/decode/token/owner",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (res.status === 200 && res.data.res) {
                    const userData = res.data.res;
                    setUser(userData);

                    // Fetch KYC data to get ban reason
                    if (userData.email) {
                        try {
                            const kycRes = await axios.get(
                                `https://auth.vizit.homes/api/kyc/user/${userData.email}`
                            );

                            if (kycRes.data && kycRes.data.kyc) {
                                setBanInfo(kycRes.data.kyc);

                                // If there's a reason in KYC, use it
                                if (kycRes.data.kyc.reason) {
                                    // Use the reason from KYC
                                }
                            }
                        } catch (kycErr) {
                            console.error("Failed to fetch KYC:", kycErr);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch user:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserInfo();
    }, []);

    // Animated styles
    const glitchStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: glitchOffset.value }],
    }));

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    const rotateStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotateValue.value}deg` }],
    }));

    const handleContactSupport = async () => {
        try {
            // Open support website in browser
            await WebBrowser.openBrowserAsync('https://support.vizit.homes');
        } catch (error) {
            Alert.alert("Error", "Could not open browser. Please visit support.vizit.homes manually.");
        }
    };

    const handleLogout = async () => {
        await AsyncStorage.removeItem("userToken");
        await AsyncStorage.removeItem("role");
        router.replace("/Login");
    };

    // Format ban date
    const formattedBanDate = banDate || (banInfo?.updatedAt
        ? new Date(banInfo.updatedAt).toLocaleDateString()
        : new Date().toLocaleDateString());

    // Get ban reason from banInfo if available
    const banReason = banInfo?.reason || reason;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ff4d4d" />
                <Text style={styles.loadingText}>Loading account information...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />

            {/* Animated Background Pattern */}
            <View style={styles.backgroundPattern} />

            {/* Radial Gradient Overlay */}
            <LinearGradient
                colors={['rgba(26,26,26,0.8)', 'rgba(0,0,0,0.95)']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={[styles.rotatingIcon, rotateStyle]}>
                    <MaterialCommunityIcons name="alert-octagon" size={100} color="#ff4d4d" />
                </Animated.View>

                <Animated.Text style={[styles.glitchHeader, glitchStyle]}>
                    ACCOUNT SUSPENDED
                </Animated.Text>

                <Text style={styles.subHeader}>SECURITY PROTOCOL VIOLATION</Text>

                {/* User Info Card */}
                {user && (
                    <View style={styles.userInfoCard}>
                        <View style={styles.userInfoRow}>
                            <MaterialCommunityIcons name="account" size={20} color="#ff4d4d" />
                            <Text style={styles.userInfoLabel}>User:</Text>
                            <Text style={styles.userInfoValue}>{user.name || "Unknown"}</Text>
                        </View>
                        <View style={styles.userInfoRow}>
                            <MaterialCommunityIcons name="email" size={20} color="#ff4d4d" />
                            <Text style={styles.userInfoLabel}>Email:</Text>
                            <Text style={styles.userInfoValue}>{user.email || "unknown@email.com"}</Text>
                        </View>
                        {user.phone && (
                            <View style={styles.userInfoRow}>
                                <MaterialCommunityIcons name="phone" size={20} color="#ff4d4d" />
                                <Text style={styles.userInfoLabel}>Phone:</Text>
                                <Text style={styles.userInfoValue}>{user.phone}</Text>
                            </View>
                        )}
                        {user.location && (
                            <View style={styles.userInfoRow}>
                                <MaterialCommunityIcons name="map-marker" size={20} color="#ff4d4d" />
                                <Text style={styles.userInfoLabel}>Location:</Text>
                                <Text style={styles.userInfoValue}>{user.location}</Text>
                            </View>
                        )}
                        {banInfo?.accountstatus && (
                            <View style={styles.userInfoRow}>
                                <MaterialCommunityIcons name="alert-circle" size={20} color="#ff4d4d" />
                                <Text style={styles.userInfoLabel}>Status:</Text>
                                <Text style={[styles.userInfoValue, styles.bannedStatus]}>
                                    {banInfo.accountstatus.toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Reason Box */}
                <View style={styles.reasonBox}>
                    <View style={styles.reasonTitle}>
                        <MaterialCommunityIcons name="gavel" size={24} color="#ff4d4d" />
                        <Text style={styles.reasonTitleText}>Reason for Suspension:</Text>
                    </View>

                    <Text style={styles.reasonText}>{banReason}</Text>

                    <View style={styles.divider} />

                    <View style={styles.banDetails}>
                        <View style={styles.banDetailItem}>
                            <Text style={styles.banDetailLabel}>Ban Date:</Text>
                            <Text style={styles.banDetailValue}>{formattedBanDate}</Text>
                        </View>
                        <View style={styles.banDetailItem}>
                            <Text style={styles.banDetailLabel}>Duration:</Text>
                            <Text style={styles.banDetailValue}>{banDuration}</Text>
                        </View>
                        <View style={styles.banDetailItem}>
                            <Text style={styles.banDetailLabel}>Appeal Deadline:</Text>
                            <Text style={styles.banDetailValue}>{appealDeadline}</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.disclaimer}>
                    If you believe this is a mistake, you must submit a formal appeal within {appealDeadline} via our support portal.
                    Your data is currently encrypted and locked.
                </Text>

                <Animated.View style={[styles.buttonContainer, pulseStyle]}>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleContactSupport}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#ff4d4d', '#ff3333']}
                            style={styles.buttonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <MaterialCommunityIcons name="web" size={24} color="#fff" />
                            <Text style={styles.buttonText}>Visit Support Portal</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                <Text style={styles.footer}>
                    VIZIT HOMES SECURE CORE v2.0.4
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
    },
    loadingText: {
        color: '#fff',
        marginTop: 10,
        fontSize: 14,
    },
    backgroundPattern: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.05,
        backgroundColor: '#000',
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 40,
        minHeight: height,
    },
    rotatingIcon: {
        marginBottom: 20,
    },
    glitchHeader: {
        fontSize: Platform.select({ ios: 32, android: 30 }),
        fontWeight: '900',
        color: '#ff4d4d',
        textTransform: 'uppercase',
        letterSpacing: 2,
        textAlign: 'center',
        marginBottom: 10,
        textShadowColor: 'rgba(255, 77, 77, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    subHeader: {
        fontSize: 14,
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 30,
        textAlign: 'center',
    },
    userInfoCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        width: '100%',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 77, 77, 0.2)',
    },
    userInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    userInfoLabel: {
        color: '#888',
        fontSize: 14,
        marginLeft: 8,
        marginRight: 4,
        fontWeight: '600',
    },
    userInfoValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    bannedStatus: {
        color: '#ff4d4d',
        fontWeight: '700',
    },
    reasonBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 77, 77, 0.3)',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        marginBottom: 20,
    },
    reasonTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    reasonTitleText: {
        color: '#ff4d4d',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 8,
    },
    reasonText: {
        color: '#ccc',
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 15,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 77, 77, 0.2)',
        marginVertical: 15,
    },
    banDetails: {
        gap: 10,
    },
    banDetailItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    banDetailLabel: {
        color: '#888',
        fontSize: 14,
    },
    banDetailValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    disclaimer: {
        color: '#666',
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 18,
        paddingHorizontal: 20,
    },
    buttonContainer: {
        width: '100%',
        maxWidth: 400,
        marginBottom: 15,
    },
    button: {
        borderRadius: 30,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#ff4d4d',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 10,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    logoutButton: {
        marginBottom: 20,
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    logoutText: {
        color: '#666',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    footer: {
        color: '#333',
        fontSize: 11,
        letterSpacing: 1,
        textAlign: 'center',
    },
});

export default AccountBlocked;