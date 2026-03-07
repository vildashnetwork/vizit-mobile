import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import { useRouter } from "expo-router";
import axios, { AxiosError } from "axios";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

const BASE_URL = "https://auth.vizit.homes";

interface ErrorResponse {
    message: string;
}

interface UserResponse {
    role: 'owner' | 'user';
    [key: string]: any;
}

export default function ResetPassword() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    // Refs for inputs
    const emailInputRef = useRef<TextInput>(null);
    const otpInputRef = useRef<TextInput>(null);
    const passwordInputRef = useRef<TextInput>(null);
    const confirmPasswordInputRef = useRef<TextInput>(null);

    // Focus first input when step changes
    useEffect(() => {
        setTimeout(() => {
            if (step === 1 && emailInputRef.current) {
                emailInputRef.current.focus();
            } else if (step === 2 && otpInputRef.current) {
                otpInputRef.current.focus();
            } else if (step === 3 && passwordInputRef.current) {
                passwordInputRef.current.focus();
            }
        }, 100);
        setMessage({ type: "", text: "" });
    }, [step]);

    const handleRequestOtp = async () => {
        setMessage({ type: "", text: "" });

        if (!email) {
            setMessage({ type: "error", text: "Please enter your email address" });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setMessage({ type: "error", text: "Please enter a valid email address" });
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${BASE_URL}/api/resetpass/request-reset`, { email });
            setMessage({ type: "success", text: "OTP sent to your email!" });
            setStep(2);
        } catch (err) {
            const error = err as AxiosError<ErrorResponse>;
            setMessage({
                type: "error",
                text: error.response?.data?.message || "Failed to send OTP"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = () => {
        setMessage({ type: "", text: "" });

        if (!otp || otp.length < 6) {
            setMessage({ type: "error", text: "Please enter a valid 6-digit code" });
            return;
        }
        setStep(3);
    };

    const handleResetPassword = async () => {
        setMessage({ type: "", text: "" });

        if (newPassword !== confirmPassword) {
            setMessage({ type: "error", text: "Passwords do not match" });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: "error", text: "Password must be at least 6 characters" });
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${BASE_URL}/api/resetpass/verify-reset`, {
                email,
                otpCode: otp,
                newPassword,
            });

            if (res.status === 200) {
                setMessage({ type: "success", text: "Password updated successfully!" });

                // Check user type to redirect
                const userRes = await axios.get<UserResponse>(
                    `${BASE_URL}/api/user/me/${email}`
                );

                setTimeout(() => {
                    if (userRes.data.role === "owner") {
                        router.replace("/");
                    } else {
                        router.replace("/Login");
                    }
                }, 1500);
            }
        } catch (err) {
            const error = err as AxiosError<ErrorResponse>;
            setMessage({
                type: "error",
                text: error.response?.data?.message || "Invalid code or error"
            });
        } finally {
            setLoading(false);
        }
    };

    // Render step indicator
    const renderStepIndicator = () => {
        const steps = ["Email", "Verify", "Password"];
        return (
            <View style={styles.stepIndicatorContainer}>
                {steps.map((s, index) => {
                    const stepNumber = index + 1;
                    return (
                        <View key={index} style={styles.stepItem}>
                            <View
                                style={[
                                    styles.stepDot,
                                    step > stepNumber && styles.stepDotCompleted,
                                    step === stepNumber && styles.stepDotActive,
                                ]}
                            >
                                {step > stepNumber ? (
                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                ) : (
                                    <Text style={[
                                        styles.stepNumber,
                                        step === stepNumber && styles.stepNumberActive
                                    ]}>
                                        {stepNumber}
                                    </Text>
                                )}
                            </View>
                            <Text style={[
                                styles.stepText,
                                step === stepNumber && styles.stepTextActive
                            ]}>
                                {s}
                            </Text>
                        </View>
                    );
                })}
            </View>
        );
    };

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
                        <Ionicons name="key" size={40} color="#13854c" />
                    </View>
                    <Text style={styles.title}>Reset Password</Text>
                    <Text style={styles.subtitle}>
                        {step === 1 && "Enter your email to receive a reset code"}
                        {step === 2 && "Check your email for the verification code"}
                        {step === 3 && "Create a new strong password"}
                    </Text>
                </View>

                {/* Step Indicator */}
                {renderStepIndicator()}

                <View style={styles.form}>
                    {/* STEP 1: Email */}
                    {step === 1 && (
                        <>
                            <View style={styles.inputContainer}>
                                <Ionicons name="mail-outline" size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    ref={emailInputRef}
                                    style={styles.input}
                                    placeholder="Email Address"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    value={email}
                                    onChangeText={setEmail}
                                    editable={!loading}
                                />
                            </View>
                        </>
                    )}

                    {/* STEP 2: OTP */}
                    {step === 2 && (
                        <>
                            <View style={styles.infoBox}>
                                <Ionicons name="information-circle-outline" size={20} color="#13854c" />
                                <Text style={styles.infoText}>
                                    A 6-digit code has been sent to: {"\n"}
                                    <Text style={styles.emailHighlight}>{email}</Text>
                                </Text>
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="keypad-outline" size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    ref={otpInputRef}
                                    style={styles.input}
                                    placeholder="6-Digit Code"
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    value={otp}
                                    onChangeText={setOtp}
                                    editable={!loading}
                                />
                            </View>

                            <TouchableOpacity
                                onPress={() => setStep(1)}
                                style={styles.linkButton}
                            >
                                <Text style={styles.linkText}>Change Email</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* STEP 3: Password */}
                    {step === 3 && (
                        <>
                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    ref={passwordInputRef}
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="New Password"
                                    secureTextEntry={!showPassword}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    editable={!loading}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color="#666"
                                    />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
                                <TextInput
                                    ref={confirmPasswordInputRef}
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="Confirm Password"
                                    secureTextEntry={!showConfirmPassword}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    editable={!loading}
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    <Ionicons
                                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color="#666"
                                    />
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

                    {/* Action Button */}
                    <TouchableOpacity
                        style={[styles.primaryBtn, loading && styles.disabledBtn]}
                        onPress={() => {
                            if (step === 1) handleRequestOtp();
                            else if (step === 2) handleVerifyOtp();
                            else handleResetPassword();
                        }}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.btnText}>
                                {step === 1 && "Send Reset Code"}
                                {step === 2 && "Verify Code"}
                                {step === 3 && "Update Password"}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Resend OTP for step 2 */}
                    {step === 2 && !loading && (
                        <TouchableOpacity
                            onPress={handleRequestOtp}
                            style={styles.resendButton}
                        >
                            <Text style={styles.resendText}>Resend Code</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.divider}>
                        <View style={styles.line} />
                        <Text style={styles.orText}>OR</Text>
                        <View style={styles.line} />
                    </View>

                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back-outline" size={20} color="#13854c" />
                        <Text style={styles.backButtonText}>Back to Login</Text>
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Vizit.Homes Cameroon</Text>
                    </View>
                </View>
            </ScrollView>
            <Toast />
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
        color: '#1a1a1a',
        marginBottom: 5
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        paddingHorizontal: 20
    },
    // Step Indicator Styles
    stepIndicatorContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
        paddingHorizontal: 10,
    },
    stepItem: {
        alignItems: 'center',
    },
    stepDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        borderWidth: 2,
        borderColor: '#ddd',
    },
    stepDotActive: {
        backgroundColor: '#13854c',
        borderColor: '#13854c',
    },
    stepDotCompleted: {
        backgroundColor: '#13854c',
        borderColor: '#13854c',
    },
    stepNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: '#999',
    },
    stepNumberActive: {
        color: '#fff',
    },
    stepText: {
        fontSize: 12,
        color: '#999',
        fontWeight: '500',
    },
    stepTextActive: {
        color: '#13854c',
        fontWeight: '600',
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
    inputContainer: {
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
    icon: {
        marginRight: 10
    },
    input: {
        flex: 1,
        height: 50,
        color: '#333',
        fontSize: 15,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#e8f5e9',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#c8e6c9',
    },
    infoText: {
        flex: 1,
        marginLeft: 10,
        color: '#2e7d32',
        fontSize: 14,
        lineHeight: 20,
    },
    emailHighlight: {
        fontWeight: 'bold',
        color: '#13854c',
    },
    linkButton: {
        alignSelf: 'center',
        marginVertical: 10,
    },
    linkText: {
        color: '#13854c',
        fontSize: 14,
        fontWeight: '500',
    },
    resendButton: {
        alignSelf: 'center',
        marginTop: 10,
    },
    resendText: {
        color: '#13854c',
        fontSize: 14,
        fontWeight: '600',
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
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20
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
    backButton: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        height: 55,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#13854c'
    },
    backButtonText: {
        marginLeft: 8,
        fontWeight: '600',
        color: '#13854c',
        fontSize: 16
    },
    footer: {
        marginTop: 20,
        alignItems: 'center'
    },
    footerText: {
        color: '#666',
        fontSize: 14
    },
});