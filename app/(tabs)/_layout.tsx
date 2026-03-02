import React, { useEffect, useRef, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, FontAwesome5, AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
const SCREEN_WIDTH = Dimensions.get("window").width;
const SIDEBAR_WIDTH = 240;
import Entypo from '@expo/vector-icons/Entypo';
import Foundation from '@expo/vector-icons/Foundation';

export default function TabLayout() {
  const router = useRouter();

  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const [open, setOpen] = useState(false);

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

  /* ---------------- SIDEBAR ---------------- */

  const Sidebar = () => (
    <Animated.View
      style={[styles.sidebar, { transform: [{ translateX }] }]}
      pointerEvents={open ? "auto" : "none"}
    >
      <SafeAreaView>
        <Text style={styles.sidebarTitle}>Menu</Text>

        <Pressable style={styles.item} onPress={() => navigate("/")}>
          <MaterialCommunityIcons name="home" size={22} color="#000000ff" />
          <Text style={styles.itemText}>Home</Text>
        </Pressable>

        <Pressable style={styles.item} onPress={() => navigate("../Login")}>
          <Entypo name="login" size={24} color="black" />
          <Text style={styles.itemText}>Login</Text>
        </Pressable>


        <Pressable style={styles.item}
          onPress={() => navigate("../reels")}
        >
          <Foundation name="play-video" size={24} color="black" />
          <Text style={styles.itemText}>Reels</Text>
        </Pressable>


        <Pressable style={styles.item}
          onPress={() => navigate("./reviews")}
        >
          <MaterialIcons name="reviews" size={24} color="black" />
          <Text style={styles.itemText}>Reviews</Text>
        </Pressable>



        <Pressable style={styles.item}
          onPress={() => navigate("./Apointment")}
        >
          <AntDesign name="schedule" size={24} color="black" />
          <Text style={styles.itemText}>Appointments</Text>
        </Pressable>

      </SafeAreaView>
    </Animated.View>
  );

  /* ---------------- HEADER ---------------- */

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchUser = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");

        if (!token) {
          console.warn("No token found");
          setLoading(false);
          return;
        }

        const res = await axios.get(
          "https://auth.vizit.homes/api/owner/decode/token/owner",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.status === 200) {
          setUser(res.data.res);
        }
      } catch (err) {
        console.error("Failed to decode token:", err);
      } finally {
        setLoading(false);
      }
    };

    // Run immediately on mount
    fetchUser();

    // Run every 19 seconds
    intervalId = setInterval(fetchUser, 19000);

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, []);



  const Header = () => (
    <SafeAreaView edges={["top"]} style={styles.headerSafe}>
      <View style={styles.header}>
        <Pressable onPress={openSidebar}>
          <MaterialCommunityIcons name="menu" size={26} color="#000000ff" />
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {/* <MaterialCommunityIcons name="home" size={26} color="#000000ff" /> */}
          <FontAwesome5 name="home" size={24} color="black" />
          <Text style={styles.headerTitle}>VIZIT.HOMES</Text>
        </View>
        {/* <View style={{ width: 26 }} /> */}
        {
          !user ?
            <Pressable onPress={() => router.push("/modal")}>
              {/* <MaterialCommunityIcons name="information" size={26} color="#000000ff" /> */}
              <MaterialCommunityIcons name="account-circle" size={30} color="#000000ff" />
            </Pressable> :
            <TouchableOpacity style={styles.avatarWrapper} onPress={() => router.push("/modal")}>
              <Image
                source={{ uri: user?.profile }}
                style={styles.avatar}
              />
            </TouchableOpacity>
        }
      </View>
    </SafeAreaView>
  );

  return (
    <View style={{ flex: 1 }}>
      <Sidebar />

      {open && <Pressable style={styles.overlay} onPress={closeSidebar} />}

      <Tabs
        screenOptions={{
          header: Header,
          tabBarActiveTintColor: "#13854cff",
          tabBarInactiveTintColor: "#000000ff",
          tabBarStyle: {
            backgroundColor: "#e0feffff",
            borderTopColor: "rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                name="home-city"
                size={26}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="reviews"
          options={{
            title: "reviews",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="reviews" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="MainChat"
          options={{
            title: "",
            tabBarIcon: ({ focused, color }) => (
              <View style={{
                top: -7, // Lifts the circle up
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: '#13854c', // Your theme green
                justifyContent: 'center',
                alignItems: 'center',
                // Shadow for iOS
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 4.65,
                // Shadow for Android
                elevation: 8,
                // The "Border" makes it look clean against the bar
                borderWidth: 4,
                borderColor: '#e0feff', // Match your tabBarStyle backgroundColor
              }}>
                <MaterialCommunityIcons
                  name="message-text"
                  size={28}
                  color="white"
                />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="Apointment"
          options={{
            title: "apointment",
            tabBarIcon: ({ color }) => (
              <AntDesign name="schedule" size={24} color="black" color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="two"
          options={{
            title: "property",
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="folder-plus" size={26} color={color} />
            ),
          }}
        />






      </Tabs>
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  avatarWrapper: { marginBottom: 0 },
  avatar: { width: 40, height: 40, borderRadius: 45, backgroundColor: "#ddd" },
  headerSafe: {
    backgroundColor: "#e0feffff",
  },
  header: {
    height: 51,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
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
  },

  sidebarTitle: {
    color: "#000000ff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
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
});
