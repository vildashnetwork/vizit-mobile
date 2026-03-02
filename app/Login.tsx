import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import axios from "axios";
import * as WebBrowser from 'expo-web-browser';
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as Google from 'expo-auth-session/providers/google';

// Ensure the auth session can complete
WebBrowser.maybeCompleteAuthSession();

const BASE_URL = "https://vizit-backend-hubw.onrender.com";

export default function OwnerAuthScreen() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Form States
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");

    // --- 1. GOOGLE NATIVE CONFIG ---
    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: "1096730552036-sldkiao2llt88ls2t19e3dlqdv2nuecs.apps.googleusercontent.com",
        webClientId: "1096730552036-ik4gtql6ruli1ql6gk5sq27vr5p830a3.apps.googleusercontent.com",
    });

    useEffect(() => {
        if (response?.type === 'success' && response.authentication?.accessToken) {
            handleGoogleBackendSync(response.authentication.accessToken);
        }
    }, [response]);

    const handleGoogleBackendSync = async (googleToken: string) => {
        setLoading(true);
        try {
            const res = await axios.post(`${BASE_URL}/api/auth/google-mobile`, {
                token: googleToken,
                role: "owner"
            });
            await saveAndNavigate(res.data.token);
        } catch (error: any) {
            Alert.alert("Google Auth Failed", error.response?.data?.message || "Verify your account exists.");
        } finally {
            setLoading(false);
        }
    };

    // --- 2. EMAIL/PASSWORD HANDLERS ---
    const handleEmailAuth = async () => {
        if (!email || !password || (!isLogin && (!fullName || !phone))) {
            Alert.alert("Error", "Please fill in all required fields");
            return;
        }

        setLoading(true);
        try {
            const endpoint = isLogin ? "/api/owner/login" : "/api/owner/register";
            const payload = isLogin
                ? { identifier: email, password }
                : { name: fullName, email, number: phone, password, role: "owner" };

            const res = await axios.post(`${BASE_URL}${endpoint}`, payload);

            if (res.data.token) {
                await saveAndNavigate(res.data.token);
            }
        } catch (error: any) {
            Alert.alert("Auth Error", error.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const saveAndNavigate = async (token: string) => {
        await AsyncStorage.setItem("userToken", token);
        await AsyncStorage.setItem("role", "owner");
        router.replace("/(tabs)");
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                <View style={styles.header}>
                    <View style={styles.logoCircle}>
                        <MaterialCommunityIcons name="home-city" size={40} color="#13854c" />
                    </View>
                    <Text style={styles.title}>{isLogin ? "Welcome Back" : "Create Owner Account"}</Text>
                    <Text style={styles.subtitle}>Manage your properties on Vizit.Homes</Text>
                </View>

                <View style={styles.form}>
                    {!isLogin && (
                        <>
                            <View style={styles.inputContainer}>
                                <Ionicons name="person-outline" size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Full Name"
                                    value={fullName}
                                    onChangeText={setFullName}
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <Ionicons name="call-outline" size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Phone Number"
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={setPhone}
                                />
                            </View>
                        </>
                    )}

                    <View style={styles.inputContainer}>
                        <Ionicons name="mail-outline" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            value={email}
                            onChangeText={setEmail}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="Password"
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={setPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryBtn, loading && styles.disabledBtn]}
                        onPress={handleEmailAuth}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : (
                            <Text style={styles.btnText}>{isLogin ? "Login" : "Sign Up"}</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <View style={styles.line} />
                        <Text style={styles.orText}>OR</Text>
                        <View style={styles.line} />
                    </View>

                    <TouchableOpacity
                        style={styles.googleBtn}
                        onPress={() => promptAsync()}
                        disabled={!request || loading}
                    >
                        <MaterialCommunityIcons name="google" size={22} color="#DB4437" />
                        <Text style={styles.googleBtnText}>Continue with Google</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.switchMode}
                        onPress={() => setIsLogin(!isLogin)}
                    >
                        <Text style={styles.switchText}>
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <Text style={styles.switchAction}>{isLogin ? "Sign Up" : "Login"}</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0fdf4' },
    scrollContent: { flexGrow: 1, padding: 25, justifyContent: 'center' },
    header: { alignItems: 'center', marginBottom: 40 },
    logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, marginBottom: 15 },
    title: { fontSize: 26, fontWeight: 'bold', color: '#1a1a1a' },
    subtitle: { fontSize: 14, color: '#666', marginTop: 5 },
    form: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 12, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
    icon: { marginRight: 10 },
    input: { height: 50, color: '#333', fontSize: 15 },
    primaryBtn: { backgroundColor: '#13854c', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    disabledBtn: { opacity: 0.7 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 25 },
    line: { flex: 1, height: 1, backgroundColor: '#eee' },
    orText: { marginHorizontal: 15, color: '#999', fontSize: 12, fontWeight: 'bold' },
    googleBtn: { flexDirection: 'row', backgroundColor: '#fff', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
    googleBtnText: { marginLeft: 10, fontWeight: '600', color: '#444' },
    switchMode: { marginTop: 25, alignItems: 'center' },
    switchText: { color: '#666', fontSize: 14 },
    switchAction: { color: '#13854c', fontWeight: 'bold' }
});