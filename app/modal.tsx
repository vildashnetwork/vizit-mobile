import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Switch,
  SafeAreaView,
  Dimensions,
  Modal,
  StatusBar,
} from "react-native";
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");
const STORAGE_KEY = "vizit_user_profile";
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dgigs6v72/image/upload";
const CLOUDINARY_PRESET = "vizit-image";

/* ================= VERIFY MODAL ================= */
interface VerifyModalProps {
  visible: boolean;
  onClose: () => void;
  email: string;
  refreshUser?: () => void;
}

const VerifyModal = ({ visible, onClose, email, refreshUser }: VerifyModalProps) => {
  const [step, setStep] = useState(1);
  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const verificationFee = 5000;
  const pricePerMonth = 400;
  const monthlyTotal = months * pricePerMonth;
  const grandTotal = verificationFee + monthlyTotal;

  const increase = () => setMonths(prev => prev + 1);
  const decrease = () => months > 1 && setMonths(prev => prev - 1);

  const handleActivateVerification = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.post(
        `https://auth.vizit.homes/api/activate-verification/${email}`,
        {
          months,
          verificationFee,
          monthlyTotal,
          totalAmount: grandTotal
        }
      );

      if (res.status === 200) {
        Alert.alert("Success", "Verification activated successfully ✅");
        if (refreshUser) await refreshUser();
        onClose();
      }
    } catch (err: any) {
      console.error("Verification error:", err.response?.data || err.message);
      setError(
        err.response?.data?.message ||
        "Verification failed. Please check your balance."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={verifyStyles.overlay}>
        <View style={verifyStyles.modal}>
          <TouchableOpacity style={verifyStyles.closeButton} onPress={onClose}>
            <Entypo name="home" size={24} color="black" />
          </TouchableOpacity>

          {/* Step Indicator */}
          <View style={verifyStyles.stepIndicator}>
            <View style={[verifyStyles.step, step === 1 && verifyStyles.activeStep]}>
              <Text style={verifyStyles.stepText}>1</Text>
            </View>
            <View style={verifyStyles.line} />
            <View style={[verifyStyles.step, step === 2 && verifyStyles.activeStep]}>
              <Text style={verifyStyles.stepText}>2</Text>
            </View>
          </View>

          {error ? <Text style={verifyStyles.errorText}>{error}</Text> : null}

          {/* Step 1 */}
          {step === 1 && (
            <>
              <Text style={verifyStyles.title}>Verification Fee</Text>
              <Text style={verifyStyles.description}>
                A one-time activation fee of <Text style={{ fontWeight: "bold" }}>5000 FCFA</Text>
                will be deducted from your wallet.
              </Text>

              <View style={verifyStyles.totalBox}>
                <Text>Verification Fee:</Text>
                <Text style={{ fontWeight: "bold" }}>{verificationFee} FCFA</Text>
              </View>

              <TouchableOpacity
                style={verifyStyles.primaryButton}
                onPress={() => setStep(2)}
              >
                <Text style={verifyStyles.primaryButtonText}>Continue</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <>
              <Text style={verifyStyles.title}>Choose Duration</Text>

              <View style={verifyStyles.counterContainer}>
                <TouchableOpacity onPress={decrease} style={verifyStyles.counterButton}>
                  <Text style={verifyStyles.counterButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={verifyStyles.counterValue}>
                  {months} Month{months > 1 ? "s" : ""}
                </Text>
                <TouchableOpacity onPress={increase} style={verifyStyles.counterButton}>
                  <Text style={verifyStyles.counterButtonText}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={verifyStyles.summaryBox}>
                <View style={verifyStyles.summaryRow}>
                  <Text>Verification Fee:</Text>
                  <Text>{verificationFee} FCFA</Text>
                </View>
                <View style={verifyStyles.summaryRow}>
                  <Text>Monthly Total:</Text>
                  <Text>{monthlyTotal} FCFA</Text>
                </View>
                <View style={verifyStyles.divider} />
                <View style={verifyStyles.summaryRow}>
                  <Text style={{ fontWeight: "bold" }}>Grand Total:</Text>
                  <Text style={{ fontWeight: "bold" }}>{grandTotal} FCFA</Text>
                </View>
              </View>

              <TouchableOpacity
                style={verifyStyles.payButton}
                onPress={handleActivateVerification}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={verifyStyles.payButtonText}>
                    Pay {grandTotal} FCFA
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal >
  );
};

const verifyStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    padding: 25,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  step: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  activeStep: {
    backgroundColor: "#10ca8c",
  },
  stepText: {
    color: "#fff",
    fontWeight: "bold",
  },
  line: {
    width: 40,
    height: 2,
    backgroundColor: "#ccc",
    marginHorizontal: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 10,
    color: "#111",
  },
  description: {
    textAlign: "center",
    fontSize: 14,
    marginBottom: 20,
    color: "#555",
  },
  totalBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  primaryButton: {
    backgroundColor: "#10ca8c",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  counterContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    marginBottom: 20,
  },
  counterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  counterButtonText: {
    fontSize: 20,
    fontWeight: "600",
  },
  counterValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  summaryBox: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#ddd",
    marginVertical: 8,
  },
  errorText: {
    color: "#b91c1c",
    backgroundColor: "#fee2e2",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    textAlign: "center",
  },
  payButton: {
    backgroundColor: "#198754",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  payButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});

/* ================= PAYMENT MODAL ================= */
interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  userEmail: string;
  userId: string;
  userRole: string;
  onPaymentSuccess: () => void;
}

const PaymentModal = ({ visible, onClose, userEmail, userId, userRole, onPaymentSuccess }: PaymentModalProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState(50);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  const increment = () => setAmount(prev => prev + 500);
  const decrement = () => setAmount(prev => (prev > 500 ? prev - 500 : 500));

  const handlePayment = async () => {
    setError("");

    if (!userId || !userRole) {
      setError("User session expired. Please login again.");
      return;
    }

    if (!/^2376\d{8}$/.test(phoneNumber)) {
      setError("Enter a valid Cameroon number (2376XXXXXXXX)");
      return;
    }

    if (!amount || amount < 50) {
      setError("Minimum payment is 50 FCFA");
      return;
    }

    if (paying) return;

    try {
      setPaying(true);

      const res = await axios.post(
        "https://auth.vizit.homes/api/pay",
        {
          phoneNumber: phoneNumber.trim(),
          amount: Number(amount),
          description: "Add tokens to my Vizit site",
          id: userId,
          role: userRole
        }
      );

      if (res.status !== 201) {
        setError("Payment could not be processed.");
        setPaying(false);
        return;
      }

      Alert.alert(
        "Payment Initiated",
        "Waiting for confirmation. This might take one minute. Do not close the app..."
      );

      // Start polling
      let attempts = 0;
      const maxAttempts = 15;

      const interval = setInterval(async () => {
        attempts++;

        try {
          // Reconcile with NKWA
          await axios.get(
            "https://auth.vizit.homes/api/reconcile-payments"
          );

          // Credit user
          await axios.post(
            `https://auth.vizit.homes/api/credit-user/${userEmail}`
          );

          // Fetch updated user
          const updatedUser = await axios.get(
            `https://auth.vizit.homes/api/user/me/${userEmail}`
          );

          const latestPayments = updatedUser.data?.user?.paymentprscribtion || [];
          const latestTransaction = latestPayments.at(-1);

          if (!latestTransaction) return;

          if (latestTransaction.status === "success") {
            clearInterval(interval);
            Alert.alert("Success", "Payment successful ✅ Balance updated.");
            onPaymentSuccess();
            onClose();
          }

          if (latestTransaction.status === "failed") {
            clearInterval(interval);
            Alert.alert("Error", "Payment failed ❌");
          }

          if (attempts >= maxAttempts) {
            clearInterval(interval);
            Alert.alert("Timeout", "Payment confirmation timeout. Please refresh.");
          }
        } catch (pollError) {
          console.log("Polling error:", pollError);
        }
      }, 4000);

    } catch (err: any) {
      console.error("Payment error:", err.response?.data || err.message);
      setError(
        err.response?.data?.message ||
        "Payment failed. Please try again."
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={paymentStyles.overlay}>
        <View style={paymentStyles.modal}>
          <View style={paymentStyles.header}>
            <Text style={paymentStyles.title}>Top Up Account</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <Text style={paymentStyles.infoText}>
            Dial <Text style={{ color: "#10ca8c", fontWeight: "bold" }}>*126#</Text> to confirm the payment
            if you don't receive the popup. This process will take one minute.
          </Text>

          {error ? <Text style={paymentStyles.errorText}>{error}</Text> : null}

          <View style={paymentStyles.field}>
            <Text style={paymentStyles.label}>Mobile Number</Text>
            <TextInput
              style={paymentStyles.input}
              placeholder="2376XXXXXXXX"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          <View style={paymentStyles.field}>
            <Text style={paymentStyles.label}>Amount (FCFA)</Text>
            <View style={paymentStyles.counterContainer}>
              <TouchableOpacity onPress={decrement} style={paymentStyles.counterButton}>
                <Text style={paymentStyles.counterButtonText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={paymentStyles.amountInput}
                value={String(amount)}
                onChangeText={(text) => setAmount(Number(text))}
                keyboardType="numeric"
              />
              <TouchableOpacity onPress={increment} style={paymentStyles.counterButton}>
                <Text style={paymentStyles.counterButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={paymentStyles.helperText}>
              Step: 500 FCFA · Minimum: 100 FCFA
            </Text>
          </View>

          <TouchableOpacity
            style={paymentStyles.payButton}
            onPress={handlePayment}
            disabled={paying}
          >
            {paying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={paymentStyles.payButtonText}>
                Pay {amount.toLocaleString()} FCFA
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const paymentStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },
  infoText: {
    backgroundColor: "#e8f5e9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    color: "#2e7d32",
    fontSize: 13,
    textAlign: "center",
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  counterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  counterButtonText: {
    fontSize: 20,
    fontWeight: "600",
  },
  amountInput: {
    flex: 1,
    textAlign: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: "600",
  },
  helperText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    color: "#6b7280",
  },
  errorText: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    textAlign: "center",
  },
  payButton: {
    backgroundColor: "#10ca8c",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  payButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

/* ================= MAIN PROFILE PAGE ================= */
export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [mybalance, setMyBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    location: "",
    companyname: "",
    bio: "",
    phone: "",
    IDno: "",
    paymentmethod: "",
  });
  const [notifications, setNotifications] = useState(true);
  const [privacy, setPrivacy] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<any>(null);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          setLoading(false);
          router.push("/Login");
          return;
        }

        const res = await axios.get(
          `https://auth.vizit.homes/api/owner/decode/token/owner`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.status === 200) {
          setUser(res.data.res);
          setProfile(res.data.res);
          setForm({
            name: res.data.res.name || "",
            email: res.data.res.email || "",
            location: res.data.res.location || "",
            companyname: res.data.res.companyname || "",
            bio: res.data.res.bio || "",
            phone: res.data.res.phone || "",
            IDno: res.data.res.IDno || "",
            paymentmethod: res.data.res.paymentmethod || "",
          });
          setNotifications(res.data.res.Notifications ?? true);
          setPrivacy(res.data.res.enabletwofactor ?? false);
        }
      } catch (err) {
        console.error("Failed to decode token:", err);
        Alert.alert("Error", "Session expired. Please login again.");
        router.push("/Login");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Fetch balance
  useEffect(() => {
    if (!user?.email) return;

    const fetchBalance = async () => {
      try {
        const res = await axios.get(
          `https://auth.vizit.homes/api/user/me/${user.email}`
        );
        setMyBalance(res.data.user);
      } catch (err) {
        console.error("Error fetching balance:", err);
      }
    };
    fetchBalance();
  }, [user?.email]);

  const startEdit = () => {
    if (profile) {
      setForm({
        name: profile.name || "",
        email: profile.email || "",
        location: profile.location || "",
        companyname: profile.companyname || "",
        bio: profile.bio || "",
        phone: profile.phone || "",
        IDno: profile.IDno || "",
        paymentmethod: profile.paymentmethod || "",
      });
    }
    setEditing(true);
  };

  const cancelEdit = () => {
    if (profile) {
      setForm({
        name: profile.name || "",
        email: profile.email || "",
        location: profile.location || "",
        companyname: profile.companyname || "",
        bio: profile.bio || "",
        phone: profile.phone || "",
        IDno: profile.IDno || "",
        paymentmethod: profile.paymentmethod || "",
      });
    }
    setImageFile(null);
    setEditing(false);
  };

  const toggleNotifications = () => setNotifications(prev => !prev);
  const togglePrivacy = () => setPrivacy(prev => !prev);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) setImageFile(result.assets[0]);
  };

  const uploadImageToCloudinary = async () => {
    if (!imageFile) return profile?.profile;

    const formData = new FormData();
    formData.append("file", {
      uri: imageFile.uri,
      type: "image/jpeg",
      name: "profile.jpg",
    } as any);
    formData.append("upload_preset", CLOUDINARY_PRESET);

    const res = await axios.post(CLOUDINARY_URL, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.secure_url;
  };

  const handleSubmit = async () => {
    if (!user?._id) return;

    setSaving(true);
    try {
      const imageUrl = await uploadImageToCloudinary();

      const payload = {
        ...form,
        Notifications: notifications,
        enabletwofactor: privacy,
        profile: imageUrl || profile?.profile,
      };

      await axios.put(
        `https://auth.vizit.homes/api/owner/edit/${user._id}`,
        payload
      );

      const updatedProfile = { ...profile, ...payload };
      setProfile(updatedProfile);
      setUser(updatedProfile);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfile));

      setEditing(false);
      setImageFile(null);
      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("userToken");
    await AsyncStorage.removeItem(STORAGE_KEY);
    router.push("/Login");
  };

  const handlePaymentSuccess = async () => {
    // Refresh balance
    if (user?.email) {
      const res = await axios.get(
        `https://auth.vizit.homes/api/user/me/${user.email}`
      );
      setMyBalance(res.data.user);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10ca8c" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const upgradeLabel = mybalance?.totalBalance > 0 ? "Pro" : "Free";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header with Back Button */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Entypo name="home" size={24} color="green" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            {/* <View style={styles.headerRight} /> */}
            <TouchableOpacity
              // style={[styles.actionButton, styles.editButton]}
              onPress={startEdit}
            >
              <AntDesign name="edit" size={24} color="green" />

            </TouchableOpacity>

          </View>

          {/* Avatar */}
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={pickImage}
            disabled={!editing}
          >
            <Image
              source={{
                uri: imageFile?.uri ||
                  profile?.profile ||
                  "https://res.cloudinary.com/dgigs6v72/image/upload/v1700000000/avatar-placeholder.png"
              }}
              style={styles.avatar}
            />
            {editing && (
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Name and Verification */}
          <View style={styles.nameContainer}>
            <Text style={styles.userName}>{profile?.name}</Text>
            {!profile?.verified ? (
              <TouchableOpacity
                style={styles.verifyButton}
                onPress={() => setShowVerify(true)}
              >
                <Text style={styles.verifyButtonText}>Get Verified</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-decagram" size={20} color="#10ca8c" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>

          <Text style={styles.userEmail}>{profile?.email}</Text>

          {/* Plan and Top Up */}
          <View style={styles.planContainer}>
            <View style={[styles.planBadge, mybalance?.totalBalance > 0 ? styles.proBadge : styles.freeBadge]}>
              <Text style={styles.planText}>{upgradeLabel}</Text>
            </View>
            <TouchableOpacity
              style={styles.topUpButton}
              onPress={() => setShowUpgrade(true)}
            >
              <Text style={styles.topUpButtonText}>Top Up Account</Text>
            </TouchableOpacity>
          </View>

          {/* Edit/Save Actions */}
          <View style={styles.actionButtons}>
            {editing ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={handleSubmit}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={cancelEdit}
                >
                  <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={startEdit}
                >
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.logoutButton]}
                  onPress={handleLogout}
                >
                  <Text style={styles.actionButtonText}>Logout</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                editable={editing}
                placeholder="Your full name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={form.email}
                onChangeText={(v) => setForm({ ...form, email: v })}
                editable={editing}
                keyboardType="email-address"
                placeholder="Your email"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ID Card Number</Text>
              <TextInput
                style={styles.input}
                value={form.IDno}
                onChangeText={(v) => setForm({ ...form, IDno: v })}
                editable={editing}
                placeholder="Your ID number"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Company Name</Text>
              <TextInput
                style={styles.input}
                value={form.companyname}
                onChangeText={(v) => setForm({ ...form, companyname: v })}
                editable={editing}
                placeholder="Your company name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={form.phone}
                onChangeText={(v) => setForm({ ...form, phone: v })}
                editable={editing}
                keyboardType="phone-pad"
                placeholder="Your phone number"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={form.location}
                onChangeText={(v) => setForm({ ...form, location: v })}
                editable={editing}
                placeholder="Your location"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Company Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.bio}
                onChangeText={(v) => setForm({ ...form, bio: v })}
                editable={editing}
                multiline
                numberOfLines={4}
                placeholder="Tell us about your company"
                placeholderTextColor="#999"
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={[styles.pickerOption, form.paymentmethod === "mtnmomo" && styles.pickerSelected]}
                  onPress={() => editing && setForm({ ...form, paymentmethod: "mtnmomo" })}
                  disabled={!editing}
                >
                  <Text style={[styles.pickerText, form.paymentmethod === "mtnmomo" && styles.pickerTextSelected]}>
                    MTN MoMo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pickerOption, form.paymentmethod === "orange" && styles.pickerSelected]}
                  onPress={() => editing && setForm({ ...form, paymentmethod: "orange" })}
                  disabled={!editing}
                >
                  <Text style={[styles.pickerText, form.paymentmethod === "orange" && styles.pickerTextSelected]}>
                    Orange Money
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Settings */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsTitle}>Settings</Text>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Notifications</Text>
                  <Text style={styles.settingDesc}>Receive booking updates and offers</Text>
                </View>
                <Switch
                  value={notifications}
                  onValueChange={toggleNotifications}
                  trackColor={{ false: "#ccc", true: "#10ca8c" }}
                  thumbColor="#fff"
                  disabled={!editing}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Two Factor Authentication</Text>
                  <Text style={styles.settingDesc}>Receive OTP through email or SMS on login</Text>
                </View>
                <Switch
                  value={privacy}
                  onValueChange={togglePrivacy}
                  trackColor={{ false: "#ccc", true: "#10ca8c" }}
                  thumbColor="#fff"
                  disabled={!editing}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <PaymentModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        userEmail={user?.email}
        userId={user?._id}
        userRole={user?.role}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Verify Modal */}
      <VerifyModal
        visible={showVerify}
        onClose={() => setShowVerify(false)}
        email={user?.email}
        refreshUser={handlePaymentSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  headerRight: {
    width: 40,
  },
  avatarWrapper: {
    alignSelf: "center",
    marginBottom: 16,
    position: "relative",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#10ca8c",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#10ca8c",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
  },
  verifyButton: {
    backgroundColor: "#10ca8c",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedText: {
    color: "#10ca8c",
    fontSize: 13,
    fontWeight: "600",
  },
  userEmail: {
    textAlign: "center",
    color: "#666",
    fontSize: 15,
    marginBottom: 20,
  },
  planContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
  },
  planBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 25,
  },
  proBadge: {
    backgroundColor: "#FFD700",
  },
  freeBadge: {
    backgroundColor: "#f44336",
  },
  planText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    textTransform: "uppercase",
  },
  topUpButton: {
    backgroundColor: "#10ca8c",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 25,
  },
  topUpButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 110,
    alignItems: "center",
  },
  editButton: {
    backgroundColor: "#10ca8c",
  },
  logoutButton: {
    backgroundColor: "#f44336",
  },
  saveButton: {
    backgroundColor: "#10ca8c",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  cancelButtonText: {
    color: "#666",
  },
  formContainer: {
    marginTop: 10,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    backgroundColor: "#f9f9f9",
    color: "#333",
  },
  textArea: {
    minHeight: 100,
  },
  pickerContainer: {
    flexDirection: "row",
    gap: 12,
  },
  pickerOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  pickerSelected: {
    borderColor: "#10ca8c",
    backgroundColor: "#e8f5e9",
  },
  pickerText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  pickerTextSelected: {
    color: "#10ca8c",
    fontWeight: "600",
  },
  settingsSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 13,
    color: "#999",
  },
});