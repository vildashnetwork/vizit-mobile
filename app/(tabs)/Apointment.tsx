import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const API_BASE = "https://vizit-backend-hubw.onrender.com/api";

export default function AppointmentScreen() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [activeFilter, setActiveFilter] = useState("All Requests");
    const [searchQuery, setSearchQuery] = useState("");

    const initData = async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            if (!token) return;

            const authRes = await axios.get(`${API_BASE}/owner/decode/token/owner`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const owner = authRes.data.res;
            setUser(owner);

            const appRes = await axios.get(`${API_BASE}/apointment/owner/${owner._id}`);
            setAppointments(appRes.data);
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        initData();
    }, []);

    // Optimized Filter & Search Logic
    const filteredAppointments = useMemo(() => {
        return appointments.filter((apt) => {
            const matchesSearch =
                apt.property?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                apt.status?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesFilter =
                activeFilter === "All Requests" ||
                (activeFilter === "Pending" && apt.status === "void") ||
                (activeFilter === "Upcoming" && apt.status === "confirmed") ||
                (activeFilter === "Past" && apt.status === "past");

            return matchesSearch && matchesFilter;
        });
    }, [appointments, searchQuery, activeFilter]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#014631" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header Section with Search and Filters */}
            <View style={styles.headerCont}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        placeholder="Search property or status..."
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <Ionicons name="close-circle" size={18} color="#ccc" />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.filterRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {["All Requests", "Upcoming", "Pending", "Past"].map((f) => (
                            <TouchableOpacity
                                key={f}
                                onPress={() => setActiveFilter(f)}
                                style={[styles.filterBtn, activeFilter === f && styles.filterBtnActive]}
                            >
                                <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>

            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={initData} color="#014631" />}
                contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
            >
                {filteredAppointments.length > 0 ? (
                    filteredAppointments.map((item) => (
                        <AppointmentCard
                            key={item._id}
                            appointment={item}
                            refresh={initData}
                            currentUser={user}
                            onViewDetails={() => router.push({
                                pathname: "../[propertyId]",
                                params: {
                                    propertyId: item.propertyId, // Ensure your API returns this field
                                    currentUser: user?._id,
                                    ownerId: user?._id
                                },
                            })}
                        />
                    ))
                ) : (
                    <View style={styles.emptyCont}>
                        <MaterialCommunityIcons name="calendar-search" size={60} color="#ccc" />
                        <Text style={styles.emptyText}>No matching appointments found</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

function AppointmentCard({ appointment, refresh, currentUser, onViewDetails }: any) {
    const [reviewer, setReviewer] = useState<any>(null);
    const [showReschedule, setShowReschedule] = useState(false);
    const [newDate, setNewDate] = useState(appointment.date);
    const [newTime, setNewTime] = useState(appointment.time);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const fetchSeeker = async () => {
            try {
                const userRes = await axios.get(`${API_BASE}/user/onlyme/${appointment.userID}`);
                const email = userRes.data.getuser.email;
                const profileRes = await axios.get(`${API_BASE}/user/me/${email}`);
                setReviewer(profileRes.data.user);
            } catch (e) {
                console.log("Seeker fetch error");
            }
        };
        fetchSeeker();
    }, [appointment.userID]);

    const updateStatus = async (status: string) => {
        setProcessing(true);
        try {
            await axios.put(`${API_BASE}/apointment/${appointment._id}`, { status });
            Alert.alert("Success", `Appointment ${status}`);
            refresh();
        } catch (e) {
            Alert.alert("Error", "Update failed");
        } finally {
            setProcessing(false);
        }
    };

    const saveReschedule = async () => {
        setProcessing(true);
        try {
            await axios.put(`${API_BASE}/apointment/${appointment._id}`, {
                date: newDate,
                time: newTime,
            });
            setShowReschedule(false);
            refresh();
        } catch (e) {
            Alert.alert("Error", "Reschedule failed");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <View style={styles.card}>
            <View style={styles.cardRow}>
                <Image
                    source={{ uri: reviewer?.profile || "https://via.placeholder.com/100" }}
                    style={styles.avatar}
                />
                <View style={styles.info}>
                    <Text style={styles.propertyTitle} numberOfLines={1}>{appointment.property}</Text>
                    <Text style={styles.seekerName}><Ionicons name="person" size={12} /> {reviewer?.name || "..."}</Text>
                    <Text style={styles.dateTime}><Ionicons name="calendar" size={12} /> {appointment.date} | {appointment.time}</Text>
                </View>
                <StatusBadge status={appointment.status} />
            </View>

            <View style={styles.actionRow}>
                {appointment.status === "void" ? (
                    <>
                        <TouchableOpacity
                            style={styles.confirmBtn}
                            onPress={() => updateStatus("confirmed")}
                            disabled={processing}
                        >
                            <Text style={styles.btnText}>{processing ? "..." : "Confirm"}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.reschedBtn} onPress={() => setShowReschedule(true)}>
                            <Text style={styles.btnTextDark}>Reschedule</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity style={styles.detailsBtn} onPress={onViewDetails}>
                        <Text style={styles.btnText}>View Details</Text>
                        <Ionicons name="chevron-forward" size={16} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>

            <Modal visible={showReschedule} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Reschedule Request</Text>
                        <Text style={styles.label}>New Date</Text>
                        <TextInput style={styles.input} value={newDate} onChangeText={setNewDate} placeholder="YYYY-MM-DD" />
                        <Text style={styles.label}>New Time</Text>
                        <TextInput style={styles.input} value={newTime} onChangeText={setNewTime} placeholder="12:00 PM" />

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setShowReschedule(false)}>
                                <Text style={styles.cancelLink}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={saveReschedule}>
                                <Text style={styles.btnText}>Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: any = { confirmed: "#E8F5E9", void: "#FFF3E0", cancelled: "#FFEBEE" };
    const text: any = { confirmed: "#2E7D32", void: "#EF6C00", cancelled: "#C62828" };
    return (
        <View style={[styles.badge, { backgroundColor: colors[status] || "#EEE" }]}>
            <Text style={[styles.badgeText, { color: text[status] || "#333" }]}>{status === 'void' ? 'Pending' : status}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8F9FA" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    headerCont: { backgroundColor: "#fff", padding: 15, borderBottomWidth: 1, borderColor: "#EEE" },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F1F3F5",
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 45
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: "#333" },
    filterRow: { marginTop: 15 },
    filterBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: "#F1F3F5" },
    filterBtnActive: { backgroundColor: "#014631" },
    filterText: { color: "#666", fontWeight: "600", fontSize: 13 },
    filterTextActive: { color: "#fff" },
    card: { backgroundColor: "#fff", borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    cardRow: { flexDirection: "row", alignItems: "center" },
    avatar: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: "#EEE" },
    info: { flex: 1, marginLeft: 12 },
    propertyTitle: { fontSize: 15, fontWeight: "bold", color: "#333" },
    seekerName: { fontSize: 13, color: "#666", marginTop: 2 },
    dateTime: { fontSize: 12, color: "#014631", fontWeight: "500", marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: "bold", textTransform: "uppercase" },
    actionRow: { flexDirection: "row", marginTop: 12, borderTopWidth: 1, borderColor: "#F1F3F5", paddingTop: 10 },
    confirmBtn: { flex: 1, backgroundColor: "#014631", padding: 10, borderRadius: 8, alignItems: "center", marginRight: 10 },
    reschedBtn: { flex: 1, backgroundColor: "#F1F3F5", padding: 10, borderRadius: 8, alignItems: "center" },
    detailsBtn: { flex: 1, backgroundColor: "#014631", padding: 10, borderRadius: 8, alignItems: "center", flexDirection: 'row', justifyContent: 'center' },
    btnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
    btnTextDark: { color: "#333", fontWeight: "bold", fontSize: 14 },
    emptyCont: { alignItems: "center", marginTop: 60 },
    emptyText: { color: "#999", marginTop: 12, fontSize: 15 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 25 },
    modalContent: { backgroundColor: "#fff", borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 20, color: "#333" },
    label: { fontSize: 12, color: "#999", marginBottom: 5, fontWeight: '600' },
    input: { borderWidth: 1, borderColor: "#EEE", padding: 12, borderRadius: 8, marginBottom: 15, backgroundColor: '#F9F9F9' },
    modalActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 10 },
    saveBtn: { backgroundColor: "#014631", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginLeft: 20 },
    cancelLink: { color: "#E64016", fontWeight: '600' }
});