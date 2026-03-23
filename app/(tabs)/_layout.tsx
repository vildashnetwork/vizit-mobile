







import React, { useEffect, useRef, useState } from "react";
import { Tabs, useRouter, useSegments } from "expo-router";
import Feather from '@expo/vector-icons/Feather';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Image,
  Alert,
  AppState,
  AppStateStatus,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, FontAwesome5, AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import Fontisto from '@expo/vector-icons/Fontisto';

const SCREEN_WIDTH = Dimensions.get("window").width;
const SIDEBAR_WIDTH = 240;
import Entypo from '@expo/vector-icons/Entypo';
import * as WebBrowser from 'expo-web-browser';
import Foundation from '@expo/vector-icons/Foundation';

const BAS_URL = "https://auth.vizit.homes"
// Types
type User = {
  _id: string;
  name: string;
  email: string;
  profile: string;
  role?: string;
  verified?: boolean;
  accountstatus?: string;
  status?: string;
};

type ConnectionStatus = 'online' | 'offline' | 'checking';

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();

  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const [open, setOpen] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  // Connection state management
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const lastValidTokenRef = useRef<string | null>(null);
  const lastValidUserRef = useRef<User | null>(null);

  /* ================= NETWORK CONNECTION MONITOR ================= */
  useEffect(() => {
    let isMounted = true;

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      if (!isMounted) return;

      const isConnected = state.isConnected === true && state.isInternetReachable === true;

      console.log('Network state changed:', {
        isConnected,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
      });

      if (isConnected) {
        // Online - resume normal operations
        setConnectionStatus('online');
        setShowOfflineBanner(false);
        setIsOfflineMode(false);

        // Check if we need to sync or refresh data
        if (lastValidTokenRef.current && !user) {
          // We were offline and now back online, try to restore session
          restoreSession();
        }
      } else {
        // Offline - enter offline mode
        setConnectionStatus('offline');
        setShowOfflineBanner(true);
        setIsOfflineMode(true);

        // Store current user/token for when we come back online
        storeCurrentState();
      }
    });

    // Check initial connection
    checkInitialConnection();

    // App state listener (for background/foreground)
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      isMounted = false;
      unsubscribe();
      subscription.remove();
    };
  }, []);

  const checkInitialConnection = async () => {
    try {
      const state = await NetInfo.fetch();
      const isConnected = state.isConnected === true && state.isInternetReachable === true;

      setConnectionStatus(isConnected ? 'online' : 'offline');
      setShowOfflineBanner(!isConnected);
      setIsOfflineMode(!isConnected);
    } catch (error) {
      console.error("Error checking initial connection:", error);
      setConnectionStatus('offline');
      setShowOfflineBanner(true);
      setIsOfflineMode(true);
    }
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground - check connection
      NetInfo.fetch().then(state => {
        const isConnected = state.isConnected === true && state.isInternetReachable === true;
        setConnectionStatus(isConnected ? 'online' : 'offline');
        setShowOfflineBanner(!isConnected);
        setIsOfflineMode(!isConnected);

        if (isConnected && !user && lastValidTokenRef.current) {
          restoreSession();
        }
      }).catch(error => {
        console.error("Error fetching network state:", error);
      });
    }
    appState.current = nextAppState;
    setAppStateVisible(nextAppState);
  };

  const storeCurrentState = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (token) {
        lastValidTokenRef.current = token;
      }
      if (user) {
        lastValidUserRef.current = user;
      }
    } catch (error) {
      console.error("Error storing current state:", error);
    }
  };

  const restoreSession = async () => {
    try {
      if (lastValidTokenRef.current) {
        // Attempt to validate token with server
        const res = await axios.get(
          "https://auth.vizit.homes/api/owner/decode/token/owner",
          {
            headers: {
              Authorization: `Bearer ${lastValidTokenRef.current}`,
            },
            timeout: 10000, // 10 second timeout
          }
        ).catch(error => {
          // Handle network errors gracefully
          if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
            return null;
          }
          throw error;
        });

        if (res && res.status === 200 && res.data?.res) {
          setUser(res.data.res);
          await AsyncStorage.setItem("userToken", lastValidTokenRef.current);
        }
      } else if (lastValidUserRef.current) {
        // Use cached user data
        setUser(lastValidUserRef.current);
      }
    } catch (error) {
      console.error("Failed to restore session:", error);
      // If token is invalid, clear it but keep cached user for offline display
      if (lastValidUserRef.current) {
        setUser(lastValidUserRef.current);
      }
    }
  };
  const handleContactSupportdocs = async () => {
    try {
      // Open support website in browser
      await WebBrowser.openBrowserAsync('https://docs.vizit.homes/');
    } catch (error) {
      Alert.alert("Error", "Could not open browser. Please visit support.vizit.homes manually.");
    }
  };


  const handleContactSupport = async () => {
    try {
      // Open support website in browser
      await WebBrowser.openBrowserAsync('https://support.vizit.homes');
    } catch (error) {
      Alert.alert("Error", "Could not open browser. Please visit support.vizit.homes manually.");
    }
  };


  /* ================= FETCH USER AND STATUSES (WITH OFFLINE SUPPORT) ================= */
  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const fetchUser = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");

        if (!token) {
          // Check for cached user when offline
          if (isOfflineMode && lastValidUserRef.current) {
            if (isMounted) {
              setUser(lastValidUserRef.current);
              setLoading(false);
              setIsChecking(false);
            }
          } else {
            if (isMounted) {
              setLoading(false);
              setIsChecking(false);
            }
          }
          return;
        }

        // Store token for offline use
        lastValidTokenRef.current = token;

        // If offline, use cached user data
        if (isOfflineMode) {
          console.log("Offline mode - using cached user data");
          if (lastValidUserRef.current && isMounted) {
            setUser(lastValidUserRef.current);

            // Use cached statuses
            if (lastValidUserRef.current.accountstatus) {
              setAccountStatus(lastValidUserRef.current.accountstatus);
            }
            if (lastValidUserRef.current.status) {
              setUserStatus(lastValidUserRef.current.status);
            }
          }
          if (isMounted) {
            setLoading(false);
            setIsChecking(false);
          }
          return;
        }

        console.log("Online - fetching user data...");

        // Decode token to get user info
        const res = await axios.get(
          "https://auth.vizit.homes/api/owner/decode/token/owner",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 10000,
          }
        );

        console.log("Decode token response received");

        if (res.status === 200 && res.data?.res && isMounted) {
          const userData = res.data.res;
          setUser(userData);
          lastValidUserRef.current = userData; // Cache for offline use

          // Set statuses
          if (userData.accountstatus) {
            setAccountStatus(userData.accountstatus);
          }
          if (userData.status) {
            setUserStatus(userData.status);
          }

          // Check if user is banned (only when online)
          const bannedStatuses = ["suspended", "deactivated", "blocked", "ban"];
          const isBanned = userData.accountstatus && bannedStatuses.includes(userData.accountstatus);

          if (isBanned && isMounted) {
            console.log(`User account is ${userData.accountstatus}, redirecting to banned screen`);
            const currentRoute = segments[segments.length - 1];
            if (currentRoute !== "banned") {
              setTimeout(() => {
                if (isMounted) router.replace("/banned");
              }, 100);
            }
            return;
          }

          // Fetch KYC status (only when online)
          if (userData.email && isMounted) {
            try {
              const kycRes = await axios.get(
                `https://auth.vizit.homes/api/kyc/user/${userData.email}`,
                { timeout: 10000 }
              );

              if (kycRes.data && kycRes.data.kyc && isMounted) {
                setKycStatus(kycRes.data.kyc.status);
              } else if (isMounted) {
                setKycStatus(null);
              }
            } catch (kycErr) {
              console.error("Failed to fetch KYC:", kycErr);
              if (isMounted) setKycStatus(null);
            }
          }
        }
      } catch (err: any) {
        console.error("Failed to decode token:", err.message);

        // Check if error is due to network (offline)
        if (err.message === 'Network Error' || err.code === 'ECONNABORTED') {
          console.log("Network error - entering offline mode");
          if (isMounted) {
            setConnectionStatus('offline');
            setShowOfflineBanner(true);
            setIsOfflineMode(true);
          }

          // Use cached user data if available
          if (lastValidUserRef.current && isMounted) {
            setUser(lastValidUserRef.current);
          }
        } else {
          // Token is invalid - clear it
          await AsyncStorage.removeItem("userToken");
          lastValidTokenRef.current = null;

          // Only redirect if online and mounted
          if (!isOfflineMode && isMounted) {
            router.replace("/Login");
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsChecking(false);
        }
      }
    };

    // Run immediately on mount
    fetchUser();

    // Only run interval when online
    if (!isOfflineMode) {
      intervalId = setInterval(fetchUser, 19000);
    }

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isOfflineMode, segments]); // Re-run when online/offline status changes

  /* ================= ACCOUNT STATUS PROTECTION (WITH OFFLINE SUPPORT) ================= */
  useEffect(() => {
    // Don't redirect while still checking
    if (isChecking || loading) return;

    // Get current route
    const currentRoute = segments[segments.length - 1];

    // Routes that don't require checks (public routes)
    const publicRoutes = ["index", "Login", "reels", "KYC", "banned"];

    // Check if user account is banned
    const bannedStatuses = ["suspended", "deactivated", "blocked", "ban"];
    const isBanned = accountStatus && bannedStatuses.includes(accountStatus);

    console.log("Protection check:", {
      hasUser: !!user,
      accountStatus,
      isBanned,
      currentRoute,
      isOfflineMode,
    });

    // If offline, bypass all redirects except banned
    if (isOfflineMode) {
      // Only handle banned status in offline mode
      if (user && accountStatus && isBanned) {
        if (currentRoute !== "banned") {
          router.replace("/banned");
        }
      }
      return;
    }

    // BANNED USERS - Redirect to banned screen
    if (user && accountStatus && isBanned) {
      if (currentRoute !== "banned") {
        console.log(`Account ${accountStatus}, redirecting to banned screen`);
        router.replace("/banned");
      }
      return;
    }

    // KYC protection (only for non-banned users and when online)
    if (user && !isBanned) {
      if (kycStatus !== "approved" && !publicRoutes.includes(currentRoute) && currentRoute !== "banned") {
        console.log("KYC not approved, redirecting to KYC form");
        router.replace("/KYC");
        return;
      }

      if (currentRoute === "KYC" && kycStatus === "approved") {
        console.log("KYC already approved, redirecting to home");
        router.replace("/");
        return;
      }
    }

    // If user is not logged in, allow access to public routes only
    if (!user && !publicRoutes.includes(currentRoute) && currentRoute !== "banned") {
      console.log("User not logged in, redirecting to login");
      router.replace("/Login");
    }
  }, [user, accountStatus, userStatus, kycStatus, isChecking, loading, segments, isOfflineMode, router]);

  /* ================= SIDEBAR ================= */
  const Sidebar = () => {
    const bannedStatuses = ["suspended", "deactivated", "blocked", "ban"];
    const isBanned = accountStatus && bannedStatuses.includes(accountStatus);

    // Don't show sidebar to banned users
    if (isBanned) return null;

    return (
      <Animated.View
        style={[styles.sidebar, { transform: [{ translateX }] }]}
        pointerEvents={open ? "auto" : "none"}
      >
        <SafeAreaView>
          <Text style={styles.sidebarTitle}>Menu</Text>

          {/* Offline indicator in sidebar when offline */}
          {isOfflineMode && (
            <View style={styles.sidebarOfflineIndicator}>
              <MaterialIcons name="wifi-off" size={16} color="#f59e0b" />
              <Text style={styles.sidebarOfflineText}>Offline Mode</Text>
            </View>
          )}

          <Pressable style={styles.item} onPress={() => navigate("/")}>
            <MaterialCommunityIcons name="home" size={22} color="#000000ff" />
            <Text style={styles.itemText}>Home</Text>
          </Pressable>


          <Pressable style={styles.item} onPress={() => navigate("/Life")}>
            <Fontisto name="livestream" size={22} color="black" />
            <Text style={styles.itemText}>Go Live</Text>
          </Pressable>

          {!user && (
            <Pressable style={styles.item} onPress={() => navigate("/Login")}>
              <Entypo name="login" size={24} color="black" />
              <Text style={styles.itemText}>Login</Text>
            </Pressable>
          )}

          <Pressable style={styles.item} onPress={() => navigate("/reels")}>
            <Foundation name="play-video" size={24} color="black" />
            <Text style={styles.itemText}>Reels</Text>
          </Pressable>

          <Pressable style={styles.item} onPress={() => navigate("/reviews")}>
            <MaterialIcons name="reviews" size={24} color="black" />
            <Text style={styles.itemText}>Reviews</Text>
          </Pressable>

          <Pressable style={styles.item} onPress={() => navigate("/Apointment")}>
            <AntDesign name="schedule" size={24} color="black" />
            <Text style={styles.itemText}>Appointments</Text>
          </Pressable>

          <Pressable style={styles.item} onPress={() => navigate("/stats")}>
            <MaterialIcons name="inventory" size={24} color="black" />
            <Text style={styles.itemText}>My Transactions</Text>
          </Pressable>


          <Pressable style={styles.item} onPress={() => handleContactSupport()}>
            <Feather name="help-circle" size={24} color="#DB4437" />

            <Text style={styles.itemText}>Contact Support</Text>
          </Pressable>

          <Pressable style={styles.item} onPress={() => handleContactSupportdocs()}>
            <Entypo name="documents" size={24} color="#DB4437" />

            <Text style={styles.itemText}>Read Our Docs</Text>
          </Pressable>



          {/* Show KYC link only if user is logged in, not banned, and not approved */}
          {user && !bannedStatuses.includes(accountStatus || "") && kycStatus !== "approved" && (
            <Pressable style={styles.item} onPress={() => navigate("/KYC")}>
              <MaterialIcons name="verified" size={24} color="black" />
              <Text style={styles.itemText}>Complete KYC</Text>
            </Pressable>
          )}
        </SafeAreaView>
      </Animated.View>
    );
  };

  const openSidebar = () => {
    setOpen(true);
    Animated.timing(translateX, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(translateX, {
      toValue: -SIDEBAR_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setOpen(false));
  };

  const navigate = (path: string) => {
    closeSidebar();
    setTimeout(() => router.push(path), 120);
  };

  /* ================= HEADER ================= */
  const Header = () => {
    const bannedStatuses = ["suspended", "deactivated", "blocked", "ban"];
    const isBanned = accountStatus && bannedStatuses.includes(accountStatus);

    return (
      <SafeAreaView edges={["top"]} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable onPress={openSidebar} disabled={isBanned || isOfflineMode}>
            <MaterialCommunityIcons
              name="menu"
              size={26}
              color={isBanned || isOfflineMode ? "#666" : "#000000ff"}
            />
          </Pressable>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <FontAwesome5 name="home" size={24} color={isBanned || isOfflineMode ? "#666" : "black"} />
            <Text style={[styles.headerTitle, (isBanned || isOfflineMode) && { color: "#666" }]}>
              VIZIT.HOMES
            </Text>
          </View>

          {!user ? (
            <Pressable onPress={() => !isOfflineMode && router.push("/modal")}>
              <MaterialCommunityIcons
                name="account-circle"
                size={30}
                color={isOfflineMode ? "#666" : "#000000ff"}
              />
            </Pressable>
          ) : (
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={() => !isBanned && !isOfflineMode && router.push("/modal")}
              disabled={isBanned || isOfflineMode}
            >
              <Image
                source={{ uri: user?.profile || "https://via.placeholder.com/40" }}
                style={[styles.avatar, (isBanned || isOfflineMode) && styles.avatarDisabled]}
              />
              {/* Connection Status Indicator */}
              {isOfflineMode && (
                <View style={styles.offlineBadge}>
                  <MaterialIcons name="wifi-off" size={12} color="#f59e0b" />
                </View>
              )}
              {/* Account Status Indicator */}
              {isBanned && (
                <View style={styles.bannedBadge}>
                  <MaterialIcons name="block" size={14} color="#ff4444" />
                </View>
              )}
              {/* KYC Status Indicator (only if not banned and online) */}
              {!isBanned && !isOfflineMode && (
                <>
                  {kycStatus === "approved" && (
                    <View style={styles.verifiedBadge}>
                      <MaterialIcons name="check-circle" size={14} color="#10ca8c" />
                    </View>
                  )}
                  {kycStatus === "pending" && (
                    <View style={styles.pendingBadge}>
                      <MaterialIcons name="hourglass-empty" size={12} color="#f59e0b" />
                    </View>
                  )}
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Offline Banner */}
        {showOfflineBanner && (
          <View style={styles.offlineBanner}>
            <MaterialIcons name="wifi-off" size={16} color="#fff" />
            <Text style={styles.offlineBannerText}>
              You are offline. Some features may be unavailable.
            </Text>
          </View>
        )}
      </SafeAreaView>
    );
  };

  // Show loading indicator while checking
  if (isChecking || loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const bannedStatuses = ["suspended", "deactivated", "blocked", "ban"];
  const isBanned = accountStatus && bannedStatuses.includes(accountStatus);

  return (
    <View style={{ flex: 1 }}>
      <Sidebar />

      {open && !isBanned && <Pressable style={styles.overlay} onPress={closeSidebar} />}

      <Tabs
        screenOptions={{
          header: Header,
          tabBarActiveTintColor: "#13854cff",
          tabBarInactiveTintColor: "#000000ff",
          tabBarStyle: {
            backgroundColor: "#e0feffff",
            borderTopColor: "rgba(0, 0, 0, 0.1)",
            display: isBanned ? "none" : (user && kycStatus !== "approved" && !isOfflineMode) ? "none" : "flex",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            href: isBanned ? null : undefined,
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                name="home-city"
                size={26}
                color={isOfflineMode ? "#ccc" : color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="reviews"
          options={{
            title: "Reviews",
            href: isBanned ? null : undefined,
            tabBarIcon: ({ color }) => (
              <MaterialIcons
                name="reviews"
                size={24}
                color={isOfflineMode ? "#ccc" : color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="MainChat"
          options={{
            title: "",
            href: isBanned ? null : undefined,
            tabBarIcon: ({ focused, color }) => (
              <View style={[styles.chatIconContainer, isOfflineMode && styles.chatIconDisabled]}>
                <MaterialCommunityIcons
                  name="message-text"
                  size={28}
                  color={isOfflineMode ? "#ccc" : "white"}
                />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="Apointment"
          options={{
            title: "Appointments",
            href: isBanned ? null : undefined,
            tabBarIcon: ({ color }) => (
              <AntDesign
                name="schedule"
                size={24}
                color={isOfflineMode ? "#ccc" : color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="two"
          options={{
            title: "Property",
            href: isBanned ? null : undefined,
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                name="folder-plus"
                size={26}
                color={isOfflineMode ? "#ccc" : color}
              />
            ),
          }}
        />

        {/* Hidden routes that are accessible but not in tab bar */}
        <Tabs.Screen name="KYC" options={{ href: null }} />
        <Tabs.Screen name="Login" options={{ href: null }} />
        <Tabs.Screen name="modal" options={{ href: null }} />
        <Tabs.Screen name="banned" options={{ href: null }} />
        <Tabs.Screen name="reels" options={{ href: null }} />
        <Tabs.Screen name="stats" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  avatarWrapper: {
    marginBottom: 0,
    position: "relative",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ddd",
    borderWidth: 2,
    borderColor: "#13854c",
  },
  avatarDisabled: {
    borderColor: "#666",
    opacity: 0.7,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 2,
  },
  pendingBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 2,
  },
  bannedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 2,
  },
  offlineBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 2,
  },
  headerSafe: {
    backgroundColor: "#e0feffff",
  },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  headerTitle: {
    color: "#000000ff",
    fontSize: 18,
    fontWeight: "700",
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    width: SIDEBAR_WIDTH,
    height: "100%",
    backgroundColor: "#e0feffff",
    zIndex: 100,
    paddingHorizontal: 16,
    paddingTop: 50,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sidebarTitle: {
    color: "#000000ff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 24,
  },
  sidebarOfflineIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3cd",
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  sidebarOfflineText: {
    color: "#856404",
    fontSize: 12,
    marginLeft: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  itemText: {
    color: "#000000ff",
    fontSize: 15,
    marginLeft: 12,
  },
  overlay: {
    position: "absolute",
    left: 0,
    top: 0,
    width: SCREEN_WIDTH,
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 90,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e0feffff",
  },
  loadingText: {
    fontSize: 16,
    color: "#13854c",
  },
  offlineBanner: {
    backgroundColor: "#f59e0b",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineBannerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 8,
  },
  chatIconContainer: {
    top: -7,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#13854c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#e0feff',
  },
  chatIconDisabled: {
    backgroundColor: '#666',
    opacity: 0.7,
  },
});
































