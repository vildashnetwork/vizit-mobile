// import React, { useState, useEffect } from "react";
// import {
//     View,
//     Text,
//     TextInput,
//     TouchableOpacity,
//     StyleSheet,
//     Alert,
//     ActivityIndicator,
//     ScrollView,
//     KeyboardAvoidingView,
//     Platform
// } from "react-native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { useRouter } from "expo-router";
// import axios from "axios";
// import * as WebBrowser from 'expo-web-browser';
// import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
// import * as Google from 'expo-auth-session/providers/google';

// // Ensure the auth session can complete
// WebBrowser.maybeCompleteAuthSession();

// const BASE_URL = "https://auth.vizit.homes";

// export default function OwnerAuthScreen() {
//     const router = useRouter();
//     const [isLogin, setIsLogin] = useState(true);
//     const [loading, setLoading] = useState(false);
//     const [showPassword, setShowPassword] = useState(false);

//     // Form States
//     const [email, setEmail] = useState("");
//     const [password, setPassword] = useState("");
//     const [fullName, setFullName] = useState("");
//     const [phone, setPhone] = useState("");

//     // --- 1. GOOGLE NATIVE CONFIG ---
//     const [request, response, promptAsync] = Google.useAuthRequest({
//         androidClientId: "1096730552036-sldkiao2llt88ls2t19e3dlqdv2nuecs.apps.googleusercontent.com",
//         webClientId: "1096730552036-ik4gtql6ruli1ql6gk5sq27vr5p830a3.apps.googleusercontent.com",
//     });

//     useEffect(() => {
//         if (response?.type === 'success' && response.authentication?.accessToken) {
//             handleGoogleBackendSync(response.authentication.accessToken);
//         }
//     }, [response]);

//     const handleGoogleBackendSync = async (googleToken: string) => {
//         setLoading(true);
//         try {
//             const res = await axios.post(`${BASE_URL}/api/auth/google-mobile`, {
//                 token: googleToken,
//                 role: "owner"
//             });
//             await saveAndNavigate(res.data.token);
//         } catch (error: any) {
//             Alert.alert("Google Auth Failed", error.response?.data?.message || "Verify your account exists.");
//         } finally {
//             setLoading(false);
//         }
//     };

//     // --- 2. EMAIL/PASSWORD HANDLERS ---
//     const handleEmailAuth = async () => {
//         if (!email || !password || (!isLogin && (!fullName || !phone))) {
//             Alert.alert("Error", "Please fill in all required fields");
//             return;
//         }

//         setLoading(true);
//         try {
//             const endpoint = isLogin ? "/api/owner/login" : "/api/owner/register";
//             const payload = isLogin
//                 ? { identifier: email, password }
//                 : { name: fullName, email, number: phone, password, role: "owner" };

//             const res = await axios.post(`${BASE_URL}${endpoint}`, payload);

//             if (res.data.token) {
//                 await saveAndNavigate(res.data.token);
//             }
//         } catch (error: any) {
//             Alert.alert("Auth Error", error.response?.data?.message || "Something went wrong");
//         } finally {
//             setLoading(false);
//         }
//     };

//     const saveAndNavigate = async (token: string) => {
//         await AsyncStorage.setItem("userToken", token);
//         await AsyncStorage.setItem("role", "owner");
//         router.replace("/(tabs)");
//     };

//     return (
//         <KeyboardAvoidingView
//             behavior={Platform.OS === "ios" ? "padding" : "height"}
//             style={styles.container}
//         >
//             <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

//                 <View style={styles.header}>
//                     <View style={styles.logoCircle}>
//                         <MaterialCommunityIcons name="home-city" size={40} color="#13854c" />
//                     </View>
//                     <Text style={styles.title}>{isLogin ? "Welcome Back" : "Create Owner Account"}</Text>
//                     <Text style={styles.subtitle}>Manage your properties on Vizit.Homes</Text>
//                 </View>

//                 <View style={styles.form}>
//                     {!isLogin && (
//                         <>
//                             <View style={styles.inputContainer}>
//                                 <Ionicons name="person-outline" size={20} color="#666" style={styles.icon} />
//                                 <TextInput
//                                     style={styles.input}
//                                     placeholder="Full Name"
//                                     value={fullName}
//                                     onChangeText={setFullName}
//                                 />
//                             </View>
//                             <View style={styles.inputContainer}>
//                                 <Ionicons name="call-outline" size={20} color="#666" style={styles.icon} />
//                                 <TextInput
//                                     style={styles.input}
//                                     placeholder="Phone Number"
//                                     keyboardType="phone-pad"
//                                     value={phone}
//                                     onChangeText={setPhone}
//                                 />
//                             </View>
//                         </>
//                     )}

//                     <View style={styles.inputContainer}>
//                         <Ionicons name="mail-outline" size={20} color="#666" style={styles.icon} />
//                         <TextInput
//                             style={styles.input}
//                             placeholder="Email Address"
//                             autoCapitalize="none"
//                             keyboardType="email-address"
//                             value={email}
//                             onChangeText={setEmail}
//                         />
//                     </View>

//                     <View style={styles.inputContainer}>
//                         <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
//                         <TextInput
//                             style={[styles.input, { flex: 1 }]}
//                             placeholder="Password"
//                             secureTextEntry={!showPassword}
//                             value={password}
//                             onChangeText={setPassword}
//                         />
//                         <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
//                             <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
//                         </TouchableOpacity>
//                     </View>

//                     <TouchableOpacity
//                         style={[styles.primaryBtn, loading && styles.disabledBtn]}
//                         onPress={handleEmailAuth}
//                         disabled={loading}
//                     >
//                         {loading ? <ActivityIndicator color="#fff" /> : (
//                             <Text style={styles.btnText}>{isLogin ? "Login" : "Sign Up"}</Text>
//                         )}
//                     </TouchableOpacity>

//                     <View style={styles.divider}>
//                         <View style={styles.line} />
//                         <Text style={styles.orText}>OR</Text>
//                         <View style={styles.line} />
//                     </View>

//                     <TouchableOpacity
//                         style={styles.googleBtn}
//                         onPress={() => promptAsync()}
//                         disabled={!request || loading}
//                     >
//                         <MaterialCommunityIcons name="google" size={22} color="#DB4437" />
//                         <Text style={styles.googleBtnText}>Continue with Google</Text>
//                     </TouchableOpacity>

//                     <TouchableOpacity
//                         style={styles.switchMode}
//                         onPress={() => setIsLogin(!isLogin)}
//                     >
//                         <Text style={styles.switchText}>
//                             {isLogin ? "Don't have an account? " : "Already have an account? "}
//                             <Text style={styles.switchAction}>{isLogin ? "Sign Up" : "Login"}</Text>
//                         </Text>
//                     </TouchableOpacity>
//                 </View>
//             </ScrollView>
//         </KeyboardAvoidingView>
//     );
// }

// const styles = StyleSheet.create({
//     container: { flex: 1, backgroundColor: '#f0fdf4' },
//     scrollContent: { flexGrow: 1, padding: 25, justifyContent: 'center' },
//     header: { alignItems: 'center', marginBottom: 40 },
//     logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, marginBottom: 15 },
//     title: { fontSize: 26, fontWeight: 'bold', color: '#1a1a1a' },
//     subtitle: { fontSize: 14, color: '#666', marginTop: 5 },
//     form: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05 },
//     inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 12, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
//     icon: { marginRight: 10 },
//     input: { height: 50, color: '#333', fontSize: 15 },
//     primaryBtn: { backgroundColor: '#13854c', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
//     disabledBtn: { opacity: 0.7 },
//     btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
//     divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 25 },
//     line: { flex: 1, height: 1, backgroundColor: '#eee' },
//     orText: { marginHorizontal: 15, color: '#999', fontSize: 12, fontWeight: 'bold' },
//     googleBtn: { flexDirection: 'row', backgroundColor: '#fff', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
//     googleBtnText: { marginLeft: 10, fontWeight: '600', color: '#444' },
//     switchMode: { marginTop: 25, alignItems: 'center' },
//     switchText: { color: '#666', fontSize: 14 },
//     switchAction: { color: '#13854c', fontWeight: 'bold' }
// });






















import React, { useState, useEffect, useRef } from "react";
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
    Platform,
    Modal,
    Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import axios from "axios";
import * as WebBrowser from 'expo-web-browser';
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as Google from 'expo-auth-session/providers/google';

// Ensure the auth session can complete
WebBrowser.maybeCompleteAuthSession();

const BASE_URL = "https://auth.vizit.homes";

// Interest options
const interestOptions = [
    { value: "owner", label: "Rent A House" },
    { value: "client", label: "Real Estate" },
    { value: "agent", label: "Hotels" },
    { value: "unique", label: "Guest Houses" },
    { value: "motels", label: "Motels" },
];

export default function OwnerAuthScreen() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showInterestModal, setShowInterestModal] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    // Login fields
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Register fields
    const [fullName, setFullName] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [bio, setBio] = useState("");
    const [phone, setPhone] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [location, setLocation] = useState("");
    const [interest, setInterest] = useState("");
    const [idNumber, setIdNumber] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const firstInputRef = useRef<TextInput>(null);

    // Focus first input when mode changes
    useEffect(() => {
        setTimeout(() => {
            firstInputRef.current?.focus();
        }, 100);
        setMessage({ type: "", text: "" });
    }, [isLogin]);

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

    // Email validation
    const isValidEmail = (email: string) => {
        return /\S+@\S+\.\S+/.test(email);
    };

    // --- 2. LOGIN HANDLER ---
    const handleLogin = async () => {
        setMessage({ type: "", text: "" });

        if (!email) {
            setMessage({ type: "error", text: "Enter your email." });
            return;
        }
        if (!password) {
            setMessage({ type: "error", text: "Enter your password." });
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${BASE_URL}/api/owner/login`, {
                identifier: email,
                password
            });

            if (res.status === 200 && res.data.token) {
                setMessage({ type: "success", text: "Login successful!" });
                await saveAndNavigate(res.data.token);
            }
        } catch (error: any) {
            console.error("Login error:", error);
            setMessage({
                type: "error",
                text: error.response?.data?.message || "Login failed. Please try again."
            });
        } finally {
            setLoading(false);
        }
    };

    // --- 3. REGISTER HANDLER ---
    const handleRegister = async () => {
        setMessage({ type: "", text: "" });

        // Validation
        if (!fullName) {
            setMessage({ type: "error", text: "Please enter your full name." });
            return;
        }
        if (!regEmail) {
            setMessage({ type: "error", text: "Please enter your email." });
            return;
        }
        if (!isValidEmail(regEmail)) {
            setMessage({ type: "error", text: "Enter a valid email address." });
            return;
        }
        if (!interest) {
            setMessage({ type: "error", text: "Please select your interest." });
            return;
        }
        if (!regPassword) {
            setMessage({ type: "error", text: "Please enter a password." });
            return;
        }
        if (regPassword.length < 6) {
            setMessage({ type: "error", text: "Password must be at least 6 characters." });
            return;
        }
        if (regPassword !== confirmPassword) {
            setMessage({ type: "error", text: "Passwords do not match." });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: fullName,
                companyName: companyName || "",
                email: regEmail,
                location: location || "Not Provided",
                password: regPassword,
                interest: interest || "owner",
                IDno: idNumber || "0000",
                bio: bio || "",
                phone: phone || "",
            };

            const res = await axios.post(`${BASE_URL}/api/owner/register`, payload);

            if (res.status === 201 || res.status === 200) {
                if (res.data.token) {
                    setMessage({ type: "success", text: "Account created successfully!" });
                    await saveAndNavigate(res.data.token);
                } else {
                    Alert.alert("Success", "Account created. Please login.");
                    setIsLogin(true);
                }
            }
        } catch (error: any) {
            console.error("Register error:", error);
            setMessage({
                type: "error",
                text: error.response?.data?.message || "Registration failed. Please try again."
            });
        } finally {
            setLoading(false);
        }
    };

    const saveAndNavigate = async (token: string) => {
        await AsyncStorage.setItem("userToken", token);
        await AsyncStorage.setItem("role", "owner");
        router.replace("/(tabs)");
    };

    const handleResetPassword = () => {
        router.push("/Reset")
    };

    // Interest Picker Modal
    const InterestPickerModal = () => (
        <Modal
            visible={showInterestModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowInterestModal(false)}
        >
            <Pressable style={styles.modalOverlay} onPress={() => setShowInterestModal(false)}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Your Interest</Text>
                        <TouchableOpacity onPress={() => setShowInterestModal(false)}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {interestOptions.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={[
                                styles.interestOption,
                                interest === option.value && styles.selectedInterest
                            ]}
                            onPress={() => {
                                setInterest(option.value);
                                setShowInterestModal(false);
                            }}
                        >
                            <Text style={[
                                styles.interestText,
                                interest === option.value && styles.selectedInterestText
                            ]}>
                                {option.label}
                            </Text>
                            {interest === option.value && (
                                <Ionicons name="checkmark-circle" size={24} color="#10ca8c" />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </Pressable>
        </Modal>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <View style={styles.logoCircle}>
                        <MaterialCommunityIcons name="home-city" size={40} color="#13854c" />
                    </View>
                    <Text style={styles.title}>Vizit.Homes</Text>
                    <Text style={styles.subtitle}>List, manage and rent your properties across Cameroon</Text>
                </View>

                {/* Toggle Buttons */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, isLogin && styles.activeToggle]}
                        onPress={() => setIsLogin(true)}
                    >
                        <Text style={[styles.toggleText, isLogin && styles.activeToggleText]}>Login</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, !isLogin && styles.activeToggle]}
                        onPress={() => setIsLogin(false)}
                    >
                        <Text style={[styles.toggleText, !isLogin && styles.activeToggleText]}>Register</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.form}>
                    {/* LOGIN FORM */}
                    {isLogin ? (
                        <>
                            <View style={styles.inputContainer}>
                                <Ionicons name="mail-outline" size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    ref={firstInputRef}
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

                            <TouchableOpacity onPress={handleResetPassword} style={styles.forgotPassword}>
                                <Text style={styles.forgotPasswordText}>Reset Password</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        /* REGISTER FORM */
                        <>
                            <Text style={styles.sectionTitle}>Personal Information</Text>

                            <View style={styles.inputContainer}>
                                <Ionicons name="person-outline" size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    ref={firstInputRef}
                                    style={styles.input}
                                    placeholder="Full Name *"
                                    value={fullName}
                                    onChangeText={setFullName}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="business-outline" size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Company Name (Optional)"
                                    value={companyName}
                                    onChangeText={setCompanyName}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="document-text-outline" size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Company Bio (Optional)"
                                    multiline
                                    numberOfLines={3}
                                    value={bio}
                                    onChangeText={setBio}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="call-outline" size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Phone Number (Optional)"
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={setPhone}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="mail-outline" size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email Address *"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    value={regEmail}
                                    onChangeText={setRegEmail}
                                />
                            </View>

                            <Text style={styles.sectionTitle}>Business Details</Text>

                            <TouchableOpacity
                                style={styles.pickerButton}
                                onPress={() => setShowInterestModal(true)}
                            >
                                <Ionicons name="apps-outline" size={20} color="#666" style={styles.icon} />
                                <Text style={[styles.pickerText, !interest && styles.placeholderText]}>
                                    {interest ? interestOptions.find(opt => opt.value === interest)?.label : "Select Your Interest *"}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color="#666" />
                            </TouchableOpacity>

                            <View style={styles.inputContainer}>
                                <Ionicons name="location-outline" size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Company Location (Optional)"
                                    value={location}
                                    onChangeText={setLocation}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="card-outline" size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="ID Card Number (Optional)"
                                    value={idNumber}
                                    onChangeText={setIdNumber}
                                />
                            </View>

                            <Text style={styles.sectionTitle}>Security</Text>

                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="Password *"
                                    secureTextEntry={!showPassword}
                                    value={regPassword}
                                    onChangeText={setRegPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="Confirm Password *"
                                    secureTextEntry={!showConfirmPassword}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {/* Message Display */}
                    {message.text ? (
                        <View style={[
                            styles.messageContainer,
                            message.type === "error" ? styles.errorMessage : styles.successMessage
                        ]}>
                            <Text style={[
                                styles.messageText,
                                message.type === "error" ? styles.errorMessageText : styles.successMessageText
                            ]}>
                                {message.text}
                            </Text>
                        </View>
                    ) : null}

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.primaryBtn, loading && styles.disabledBtn]}
                        onPress={isLogin ? handleLogin : handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.btnText}>
                                {isLogin ? "Login as Property Owner" : "Create Owner Account"}
                            </Text>
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

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Vizit.Homes Cameroon</Text>
                    </View>
                </View>
            </ScrollView>

            <InterestPickerModal />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0fdf4'
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
        paddingTop: 40,
        paddingBottom: 30,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        marginBottom: 15
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#1a1a1a'
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
        textAlign: 'center',
        paddingHorizontal: 20
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 20,
        padding: 4,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeToggle: {
        backgroundColor: '#13854c',
    },
    toggleText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    activeToggleText: {
        color: '#fff',
    },
    form: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#13854c',
        marginBottom: 10,
        marginTop: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        paddingHorizontal: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#eee',
        minHeight: 50,
    },
    icon: {
        marginRight: 10
    },
    input: {
        flex: 1,
        height: 50,
        color: '#333',
        fontSize: 15,
        paddingVertical: 8,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        paddingHorizontal: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#eee',
        height: 50,
    },
    pickerText: {
        flex: 1,
        fontSize: 15,
        color: '#333',
    },
    placeholderText: {
        color: '#999',
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 15,
    },
    forgotPasswordText: {
        color: '#13854c',
        fontSize: 13,
        fontWeight: '500',
    },
    primaryBtn: {
        backgroundColor: '#13854c',
        height: 55,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10
    },
    disabledBtn: {
        opacity: 0.7
    },
    btnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 25
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#eee'
    },
    orText: {
        marginHorizontal: 15,
        color: '#999',
        fontSize: 12,
        fontWeight: 'bold'
    },
    googleBtn: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        height: 55,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd'
    },
    googleBtnText: {
        marginLeft: 10,
        fontWeight: '600',
        color: '#444'
    },
    footer: {
        marginTop: 25,
        alignItems: 'center'
    },
    footerText: {
        color: '#666',
        fontSize: 14
    },
    messageContainer: {
        padding: 12,
        borderRadius: 8,
        marginVertical: 10,
    },
    errorMessage: {
        backgroundColor: '#fee2e2',
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    successMessage: {
        backgroundColor: '#dcfce7',
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    messageText: {
        fontSize: 14,
        textAlign: 'center',
    },
    errorMessageText: {
        color: '#b91c1c',
    },
    successMessageText: {
        color: '#166534',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    interestOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    selectedInterest: {
        backgroundColor: '#f0fdf4',
    },
    interestText: {
        fontSize: 16,
        color: '#333',
    },
    selectedInterestText: {
        color: '#13854c',
        fontWeight: '600',
    },
});