import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Alert,
    StatusBar,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");
const BASE_URL = "https://auth.vizit.homes/api/kyc";
const CLOUD_NAME = "dgigs6v72";
const UPLOAD_PRESET = "vizit-image";

/* ================= TYPES ================= */

type User = {
    _id: string;
    email: string;
    name?: string;
};

type KYCData = {
    companyName: string;
    companyEmail: string;
    phone: string;
    location: string;
    idSnapshot: string;
    taxCardSnapshot: string;
    selfieWithId: string;
    status: "pending" | "approved" | "rejected";
};

/* ================= INPUT COMPONENT ================= */

interface InputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    keyboardType?: "default" | "email-address" | "phone-pad";
    editable?: boolean;
}

const Input = ({ label, value, onChangeText, placeholder, keyboardType = "default", editable = true }: InputProps) => (
    <View style={styles.inputWrapper}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
            style={[styles.input, !editable && styles.inputDisabled]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            keyboardType={keyboardType}
            editable={editable}
        />
    </View>
);

/* ================= UPLOAD CARD COMPONENT ================= */

interface UploadCardProps {
    label: string;
    imageUri: string | null;
    onPickImage: () => void;
    onRemoveImage: () => void;
}

const UploadCard = ({ label, imageUri, onPickImage, onRemoveImage }: UploadCardProps) => {
    return (
        <TouchableOpacity
            style={styles.uploadCard}
            onPress={onPickImage}
            activeOpacity={0.7}
        >
            {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: imageUri }} style={styles.previewImage} />
                    <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={onRemoveImage}
                    >
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.uploadPlaceholder}>
                    <Ionicons name="cloud-upload-outline" size={40} color="#10b981" />
                    <Text style={styles.uploadText}>{label}</Text>
                    <Text style={styles.uploadSubText}>Tap to upload</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

/* ================= PROGRESS BAR ================= */

interface ProgressProps {
    step: number;
}

const Progress = ({ step }: ProgressProps) => (
    <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: step === 1 ? "50%" : "100%" }]} />
    </View>
);

/* ================= DETAIL CARD ================= */

interface DetailProps {
    label: string;
    value: string;
}

const Detail = ({ label, value }: DetailProps) => (
    <View style={styles.detailCard}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
    </View>
);

/* ================= MAIN KYC FORM ================= */

export default function KYCForm() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<KYCData>({
        companyName: "",
        companyEmail: "",
        phone: "",
        location: "",
        idSnapshot: "",
        taxCardSnapshot: "",
        selfieWithId: "",
        status: "pending",
    });

    /* ================= DECODE TOKEN ================= */
    useEffect(() => {
        const decodeOwner = async () => {
            try {
                const token = await AsyncStorage.getItem("userToken");
                if (!token) return;

                const url = "https://auth.vizit.homes/api/owner/decode/token/owner";

                const res = await axios.get(url, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Cache-Control": "no-cache"
                    },
                });

                if (res.data && res.data.res) {
                    setCurrentUser(res.data.res);
                }
            } catch (err) {
                console.error("Failed to decode token:", err);
            }
        };
        decodeOwner();
    }, []);

    const userEmail = currentUser?.email;

    /* ================= LOAD EXISTING KYC ================= */
    useEffect(() => {
        if (!userEmail) return;

        const fetchKYC = async () => {
            try {
                const res = await axios.get(`${BASE_URL}/user/${userEmail}`);
                if (res.data.kyc) {
                    setFormData(res.data.kyc);
                    setIsSubmitted(true);
                }
            } catch (err) {
                console.error("Failed to fetch KYC:", err);
            }
        };

        fetchKYC();
    }, [userEmail]);

    /* ================= CLOUDINARY UPLOAD ================= */
    const uploadToCloudinary = async (uri: string) => {
        const formData = new FormData();
        formData.append("file", {
            uri,
            type: "image/jpeg",
            name: "upload.jpg",
        } as any);
        formData.append("upload_preset", UPLOAD_PRESET);

        try {
            setUploading(true);

            const res = await axios.post(
                `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            setUploading(false);
            return res.data.secure_url;
        } catch (err) {
            setUploading(false);
            Alert.alert("Error", "Image upload failed");
            return null;
        }
    };

    /* ================= IMAGE PICKER ================= */
    const pickImage = async (field: keyof KYCData) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const url = await uploadToCloudinary(result.assets[0].uri);
            if (url) {
                setFormData(prev => ({ ...prev, [field]: url }));
            }
        }
    };

    const removeImage = (field: keyof KYCData) => {
        setFormData(prev => ({ ...prev, [field]: "" }));
    };

    /* ================= SUBMIT FORM ================= */
    const handleSubmit = async () => {
        if (!userEmail) {
            Alert.alert("Error", "User email not found");
            return;
        }

        // Validation
        if (!formData.companyName || !formData.companyEmail || !formData.phone || !formData.location) {
            Alert.alert("Validation Error", "Please fill in all fields");
            return;
        }

        if (!formData.idSnapshot || !formData.taxCardSnapshot || !formData.selfieWithId) {
            Alert.alert("Validation Error", "Please upload all required documents");
            return;
        }

        setLoading(true);

        try {
            const res = await axios.post(`${BASE_URL}/submit`, {
                ...formData,
                email: userEmail,
            });

            if (res.status === 200) {
                setFormData(res.data.kyc);
                setIsSubmitted(true);
                Alert.alert("Success", "KYC submitted successfully");
            }
        } catch (err: any) {
            Alert.alert(
                "Error",
                err.response?.data?.message || "Submission failed. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    /* ================= NAVIGATE ON APPROVAL ================= */
    useEffect(() => {
        if (formData?.status === "approved") {
            router.replace("/");
        }
    }, [formData?.status]);

    /* ================= RENDER ================= */
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#ecfdf5" />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <LinearGradient
                        colors={["#ecfdf5", "#d1fae5"]}
                        style={styles.gradient}
                    >
                        <View style={styles.card}>
                            <Text style={styles.title}>Business Verification (KYC)</Text>

                            {isSubmitted ? (
                                <View style={styles.reviewContainer}>
                                    {/* Status Card */}
                                    <View style={styles.statusCard}>
                                        <Text style={styles.statusTitle}>
                                            Status: {formData.status?.toUpperCase()}
                                        </Text>
                                        <Text style={styles.statusText}>
                                            {formData.status === "rejected"
                                                ? "Your submitted documents have been REJECTED. This may be due to incorrect or unclear documents."
                                                : "Please be patient while we review your documents we will send you and email when we are done with the verification."}
                                        </Text>
                                    </View>

                                    {/* Details Grid */}
                                    <View style={styles.detailsGrid}>
                                        <Detail label="Company" value={formData.companyName} />
                                        <Detail label="Email" value={formData.companyEmail} />
                                        <Detail label="Phone" value={formData.phone} />
                                        <Detail label="Location" value={formData.location} />
                                    </View>

                                    {/* Image Grid */}
                                    <Text style={styles.sectionTitle}>Uploaded Documents</Text>
                                    <View style={styles.imageGrid}>
                                        {formData.idSnapshot && (
                                            <Image source={{ uri: formData.idSnapshot }} style={styles.reviewImage} />
                                        )}
                                        {formData.taxCardSnapshot && (
                                            <Image source={{ uri: formData.taxCardSnapshot }} style={styles.reviewImage} />
                                        )}
                                        {formData.selfieWithId && (
                                            <Image source={{ uri: formData.selfieWithId }} style={styles.reviewImage} />
                                        )}
                                    </View>

                                    {formData.status !== "approved" && (
                                        <TouchableOpacity
                                            style={styles.editButton}
                                            onPress={() => setIsSubmitted(false)}
                                        >
                                            <Text style={styles.editButtonText}>Edit Submission</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ) : (
                                <>
                                    <Progress step={step} />

                                    {/* Step 1: Business Info */}
                                    {step === 1 && (
                                        <View style={styles.section}>
                                            <Input
                                                label="Company Name"
                                                value={formData.companyName}
                                                onChangeText={(text) => setFormData({ ...formData, companyName: text })}
                                                placeholder="Enter company name"
                                            />
                                            <Input
                                                label="Company Email"
                                                value={formData.companyEmail}
                                                onChangeText={(text) => setFormData({ ...formData, companyEmail: text })}
                                                placeholder="company@example.com"
                                                keyboardType="email-address"
                                            />
                                            <Input
                                                label="Phone"
                                                value={formData.phone}
                                                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                                                placeholder="+237 6XX XXX XXX"
                                                keyboardType="phone-pad"
                                            />
                                            <Input
                                                label="Location"
                                                value={formData.location}
                                                onChangeText={(text) => setFormData({ ...formData, location: text })}
                                                placeholder="City, Country"
                                            />

                                            <TouchableOpacity
                                                style={styles.primaryButton}
                                                onPress={() => setStep(2)}
                                            >
                                                <Text style={styles.buttonText}>Continue</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {/* Step 2: Document Upload */}
                                    {step === 2 && (
                                        <View style={styles.section}>
                                            <UploadCard
                                                label="Government ID"
                                                imageUri={formData.idSnapshot}
                                                onPickImage={() => pickImage("idSnapshot")}
                                                onRemoveImage={() => removeImage("idSnapshot")}
                                            />
                                            <UploadCard
                                                label="Tax Payer Card"
                                                imageUri={formData.taxCardSnapshot}
                                                onPickImage={() => pickImage("taxCardSnapshot")}
                                                onRemoveImage={() => removeImage("taxCardSnapshot")}
                                            />
                                            <UploadCard
                                                label="Selfie Holding ID"
                                                imageUri={formData.selfieWithId}
                                                onPickImage={() => pickImage("selfieWithId")}
                                                onRemoveImage={() => removeImage("selfieWithId")}
                                            />

                                            {uploading && (
                                                <View style={styles.uploadingContainer}>
                                                    <ActivityIndicator size="small" color="#059669" />
                                                    <Text style={styles.uploadingText}>Uploading image...</Text>
                                                </View>
                                            )}

                                            <View style={styles.buttonRow}>
                                                <TouchableOpacity
                                                    style={styles.secondaryButton}
                                                    onPress={() => setStep(1)}
                                                >
                                                    <Text style={styles.secondaryButtonText}>Back</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={styles.successButton}
                                                    onPress={handleSubmit}
                                                    disabled={loading}
                                                >
                                                    {loading ? (
                                                        <ActivityIndicator size="small" color="#fff" />
                                                    ) : (
                                                        <Text style={styles.buttonText}>Submit</Text>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                </>
                            )}
                        </View>
                    </LinearGradient>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#ecfdf5",
    },
    scrollContainer: {
        flexGrow: 1,
        paddingVertical: 20,
    },
    gradient: {
        flex: 1,
        minHeight: height,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: "#065f46",
        marginBottom: 20,
        textAlign: "center",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#065f46",
        marginBottom: 12,
    },
    progressContainer: {
        height: 6,
        backgroundColor: "#e5e7eb",
        borderRadius: 3,
        marginBottom: 30,
        overflow: "hidden",
    },
    progressBar: {
        height: "100%",
        backgroundColor: "#059669",
        borderRadius: 3,
    },
    section: {
        gap: 16,
    },
    inputWrapper: {
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#065f46",
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: "#d1fae5",
        borderRadius: 10,
        padding: 14,
        fontSize: 15,
        color: "#1f2937",
        backgroundColor: "#fff",
    },
    inputDisabled: {
        backgroundColor: "#f3f4f6",
        color: "#9ca3af",
    },
    uploadCard: {
        borderWidth: 2,
        borderColor: "#10b981",
        borderStyle: "dashed",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 12,
    },
    uploadPlaceholder: {
        padding: 30,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f0fdf4",
    },
    uploadText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#065f46",
        marginTop: 8,
    },
    uploadSubText: {
        fontSize: 12,
        color: "#6b7280",
        marginTop: 4,
    },
    imagePreviewContainer: {
        position: "relative",
        width: "100%",
    },
    previewImage: {
        width: "100%",
        height: 200,
        resizeMode: "cover",
    },
    removeImageButton: {
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 2,
    },
    uploadingContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 10,
        backgroundColor: "#f0fdf4",
        borderRadius: 8,
    },
    uploadingText: {
        color: "#059669",
        fontSize: 14,
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
        marginTop: 16,
    },
    primaryButton: {
        backgroundColor: "#059669",
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 8,
    },
    secondaryButton: {
        flex: 1,
        backgroundColor: "#9ca3af",
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
    },
    successButton: {
        flex: 1,
        backgroundColor: "#047857",
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    secondaryButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    // Review Section Styles
    reviewContainer: {
        gap: 20,
    },
    statusCard: {
        backgroundColor: "#ecfdf5",
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#a7f3d0",
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#065f46",
        marginBottom: 6,
    },
    statusText: {
        fontSize: 14,
        color: "#374151",
        lineHeight: 20,
    },
    detailsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 8,
    },
    detailCard: {
        flex: 1,
        minWidth: (width - 80) / 2,
        backgroundColor: "#f0fdf4",
        padding: 14,
        borderRadius: 12,
    },
    detailLabel: {
        fontSize: 12,
        color: "#6b7280",
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 15,
        fontWeight: "600",
        color: "#065f46",
    },
    imageGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 8,
    },
    reviewImage: {
        width: (width - 80) / 3,
        height: (width - 80) / 3,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    editButton: {
        backgroundColor: "#065f46",
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 8,
    },
    editButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});