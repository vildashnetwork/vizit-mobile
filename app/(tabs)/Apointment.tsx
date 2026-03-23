// AppointmentScreen.tsx
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
    Platform,
    Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";

const API_BASE = "https://auth.vizit.homes/api";

// Helper functions
const formatDate = (dateString: string) => {
    if (!dateString) return "Date not set";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Invalid date";
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
};

const formatTime = (timeString: string) => {
    if (!timeString) return "Time not set";
    try {
        if (timeString.includes(':')) {
            const [hours, minutes] = timeString.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minutes} ${ampm}`;
        }
        return timeString;
    } catch (error) {
        return timeString;
    }
};

const formatDateTime = (dateString: string) => {
    if (!dateString) return "Date not set";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
};

const determineStatus = (status: string, date: string, time: string) => {
    if (status === 'cancelled') return 'cancelled';
    if (status === 'confirmed') {
        const appointmentDateTime = new Date(`${date}T${time}`);
        if (appointmentDateTime < new Date()) {
            return 'past';
        }
        return 'confirmed';
    }
    if (status === 'void') return 'pending';
    return status;
};

// Main Component
function AppointmentScreen() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [activeFilter, setActiveFilter] = useState("All Requests");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

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

            // Format dates for each appointment
            const formattedAppointments = appRes.data.map((apt: any) => ({
                ...apt,
                formattedDate: formatDate(apt.date),
                formattedTime: formatTime(apt.time),
                status: determineStatus(apt.status, apt.date, apt.time)
            }));

            setAppointments(formattedAppointments);
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

    const filteredAppointments = useMemo(() => {
        return appointments.filter((apt) => {
            const matchesSearch =
                apt.property?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                apt.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                apt.formattedDate?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesFilter =
                activeFilter === "All Requests" ||
                (activeFilter === "Pending" && apt.status === "pending") ||
                (activeFilter === "Upcoming" && (apt.status === "confirmed" && new Date(`${apt.date}T${apt.time}`) > new Date())) ||
                (activeFilter === "Past" && (apt.status === "past" || (apt.status === "confirmed" && new Date(`${apt.date}T${apt.time}`) < new Date())));

            return matchesSearch && matchesFilter;
        });
    }, [appointments, searchQuery, activeFilter]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        initData();
    }, []);

    const handleViewDetails = (appointment: any) => {
        setSelectedAppointment(appointment);
        setShowDetailsModal(true);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#014631" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerCont}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        placeholder="Search property or status..."
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#1b1a1a"
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
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#014631"]} />}
                contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {filteredAppointments.length > 0 ? (
                    filteredAppointments.map((item) => (
                        <AppointmentCard
                            key={item._id}
                            appointment={item}
                            refresh={initData}
                            currentUser={user}
                            onViewDetails={() => handleViewDetails(item)}
                            onViewProperty={() => {
                                router.push({
                                    pathname: "../Property",
                                    params: {
                                        propertyId: item.propertyId,
                                        currentUser: user?._id,
                                        ownerId: user?._id
                                    }
                                });
                            }}
                        />
                    ))
                ) : (
                    <View style={styles.emptyCont}>
                        <MaterialCommunityIcons name="calendar-search" size={60} color="#ccc" />
                        <Text style={styles.emptyText}>No matching appointments found</Text>
                        <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
                    </View>
                )}
            </ScrollView>

            {selectedAppointment && (
                <AppointmentDetailsModal
                    visible={showDetailsModal}
                    onClose={() => setShowDetailsModal(false)}
                    appointment={selectedAppointment}
                    onViewProperty={() => {
                        setShowDetailsModal(false);
                        router.push({
                            pathname: "../Property",
                            params: {
                                propertyId: selectedAppointment.propertyId,
                                currentUser: user?._id,
                                ownerId: user?._id
                            }
                        });
                    }}
                />
            )}
        </View>
    );
}

// Appointment Card Component
function AppointmentCard({ appointment, refresh, onViewDetails, onViewProperty }: any) {
    const router = useRouter();
    const [reviewer, setReviewer] = useState<any>(null);
    const [showReschedule, setShowReschedule] = useState(false);
    const [newDate, setNewDate] = useState<Date>(new Date(appointment.date));
    const [newTime, setNewTime] = useState<Date>(() => {
        const [hours, minutes] = (appointment.time || "12:00").split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes), 0);
        return date;
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [isPastAppointment, setIsPastAppointment] = useState(false);

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

        const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
        setIsPastAppointment(appointmentDateTime < new Date());
    }, [appointment.userID, appointment.date, appointment.time]);

    const updateStatus = async (status: string) => {
        setProcessing(true);
        try {
            await axios.put(`${API_BASE}/apointment/${appointment._id}`, { status });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", `Appointment ${status === 'confirmed' ? 'confirmed' : status}`);
            refresh();
        } catch (e) {
            Alert.alert("Error", "Update failed");
        } finally {
            setProcessing(false);
        }
    };

    const cancelAppointment = async () => {
        Alert.alert(
            "Cancel Appointment",
            "Are you sure you want to cancel this appointment?",
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes, Cancel",
                    style: "destructive",
                    onPress: async () => {
                        setProcessing(true);
                        try {
                            await axios.put(`${API_BASE}/apointment/${appointment._id}`, { status: 'cancelled' });
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Alert.alert("Success", "Appointment cancelled successfully");
                            refresh();
                        } catch (e) {
                            Alert.alert("Error", "Failed to cancel appointment");
                        } finally {
                            setProcessing(false);
                        }
                    }
                }
            ]
        );
    };

    const saveReschedule = async () => {
        setProcessing(true);
        try {
            const formattedDate = newDate.toISOString().split('T')[0];
            const formattedTime = newTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            await axios.put(`${API_BASE}/apointment/${appointment._id}`, {
                date: formattedDate,
                time: formattedTime,
                status: 'void'
            });
            setShowReschedule(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", "Appointment rescheduled successfully");
            refresh();
        } catch (e) {
            Alert.alert("Error", "Reschedule failed");
        } finally {
            setProcessing(false);
        }
    };

    const navigateToChat = () => {
        if (!reviewer?._id) {
            Alert.alert("Error", "Unable to start chat");
            return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push({
            pathname: "/MainChat",
            params: {
                chatid: reviewer._id,
                type: "direct",
                name: reviewer.name,
                email: reviewer.email
            }
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return { bg: '#E8F5E9', text: '#2E7D32' };
            case 'pending':
                return { bg: '#FFF3E0', text: '#EF6C00' };
            case 'cancelled':
                return { bg: '#FFEBEE', text: '#C62828' };
            case 'past':
                return { bg: '#F5F5F5', text: '#9E9E9E' };
            default:
                return { bg: '#EEE', text: '#333' };
        }
    };

    const getStatusText = (status: string) => {
        if (status === 'pending') return 'Pending';
        if (status === 'past') return 'Past';
        if (status === 'cancelled') return 'Cancelled';
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    const statusColors = getStatusColor(appointment.status);
    const isPending = appointment.status === 'pending';
    const isConfirmed = appointment.status === 'confirmed';
    const isCancelled = appointment.status === 'cancelled';

    return (
        <View style={styles.card}>
            <View style={styles.cardRow}>
                <Image
                    source={{ uri: reviewer?.profile || "https://via.placeholder.com/100" }}
                    style={styles.avatar}
                    defaultSource={require('../../assets/images/vizitlogo.jpg')}
                />
                <View style={styles.info}>
                    <TouchableOpacity onPress={onViewProperty}>
                        <Text style={styles.propertyTitle} numberOfLines={1}>{appointment.property}</Text>
                    </TouchableOpacity>
                    <Text style={styles.seekerName}>
                        <Ionicons name="person-outline" size={12} color="#666" /> {reviewer?.name || "Loading..."}
                    </Text>
                    <View style={styles.dateTimeContainer}>
                        <Ionicons name="calendar-outline" size={12} color="#014631" />
                        <Text style={styles.dateTime}>{appointment.formattedDate || formatDate(appointment.date)}</Text>
                        <View style={styles.timeSeparator} />
                        <Ionicons name="time-outline" size={12} color="#014631" />
                        <Text style={styles.dateTime}>{appointment.formattedTime || formatTime(appointment.time)}</Text>
                    </View>
                </View>
                <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
                    <Text style={[styles.badgeText, { color: statusColors.text }]}>{getStatusText(appointment.status)}</Text>
                </View>
            </View>

            <View style={styles.actionRow}>
                {isPending && !isPastAppointment && !isCancelled ? (
                    <>
                        <TouchableOpacity
                            style={styles.confirmBtn}
                            onPress={() => updateStatus("confirmed")}
                            disabled={processing}
                        >
                            <Text style={styles.btnText}>{processing ? "..." : "Confirm"}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.reschedBtn}
                            onPress={() => setShowReschedule(true)}
                            disabled={processing}
                        >
                            <Text style={styles.btnTextDark}>Reschedule</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={cancelAppointment}
                            disabled={processing}
                        >
                            <Text style={styles.btnTextDark}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.chatBtn}
                            onPress={navigateToChat}
                            disabled={processing}
                        >
                            <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                            <Text style={styles.btnText}>Chat</Text>
                        </TouchableOpacity>
                    </>
                ) : isConfirmed && !isPastAppointment ? (
                    <>
                        <TouchableOpacity style={styles.detailsBtn} onPress={onViewDetails}>
                            <Text style={styles.btnText}>View Details</Text>
                            <Ionicons name="chevron-forward" size={16} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.reschedBtn}
                            onPress={() => setShowReschedule(true)}
                            disabled={processing}
                        >
                            <Text style={styles.btnTextDark}>Reschedule</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={cancelAppointment}
                            disabled={processing}
                        >
                            <Text style={styles.btnTextDark}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.chatBtn}
                            onPress={navigateToChat}
                            disabled={processing}
                        >
                            <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                            <Text style={styles.btnText}>Chat</Text>
                        </TouchableOpacity>
                    </>
                ) : isPastAppointment ? (
                    <View style={styles.completedContainer}>
                        <Text style={styles.completedText}>Appointment completed</Text>
                        {/* <TouchableOpacity style={styles.viewPropertyBtn} onPress={onViewProperty}>
                            <Text style={styles.viewPropertyText}>View Property</Text>
                            <Ionicons name="chevron-forward" size={14} color="#014631" />
                        </TouchableOpacity> */}
                    </View>
                ) : isCancelled ? (
                    <View style={styles.completedContainer}>
                        <Text style={styles.completedText}>Appointment cancelled</Text>
                        {/* <TouchableOpacity style={styles.viewPropertyBtn} onPress={onViewProperty}>
                            <Text style={styles.viewPropertyText}>View Property</Text>
                            <Ionicons name="chevron-forward" size={14} color="#014631" />
                        </TouchableOpacity> */}
                    </View>
                ) : null}
            </View>

            {/* Reschedule Modal */}
            <Modal visible={showReschedule} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Reschedule Appointment</Text>

                        <Text style={styles.label}>New Date</Text>
                        <TouchableOpacity
                            style={styles.datePickerButton}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={20} color="#014631" />
                            <Text style={styles.datePickerText}>
                                {newDate.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.label}>New Time</Text>
                        <TouchableOpacity
                            style={styles.datePickerButton}
                            onPress={() => setShowTimePicker(true)}
                        >
                            <Ionicons name="time-outline" size={20} color="#014631" />
                            <Text style={styles.datePickerText}>
                                {newTime.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                value={newDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, selectedDate) => {
                                    setShowDatePicker(false);
                                    if (selectedDate) {
                                        setNewDate(selectedDate);
                                    }
                                }}
                                minimumDate={new Date()}
                            />
                        )}

                        {showTimePicker && (
                            <DateTimePicker
                                value={newTime}
                                mode="time"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, selectedTime) => {
                                    setShowTimePicker(false);
                                    if (selectedTime) {
                                        setNewTime(selectedTime);
                                    }
                                }}
                            />
                        )}

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setShowReschedule(false)}>
                                <Text style={styles.cancelLink}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={saveReschedule}
                                disabled={processing}
                            >
                                <Text style={styles.btnText}>{processing ? "Saving..." : "Save Changes"}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// Appointment Details Modal Component
function AppointmentDetailsModal({ visible, onClose, appointment, onViewProperty }: any) {
    const router = useRouter();
    const [seekerDetails, setSeekerDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible && appointment) {
            fetchSeekerDetails();
        }
    }, [visible, appointment]);

    const fetchSeekerDetails = async () => {
        try {
            const userRes = await axios.get(`${API_BASE}/user/onlyme/${appointment.userID}`);
            const email = userRes.data.getuser.email;
            const profileRes = await axios.get(`${API_BASE}/user/me/${email}`);
            setSeekerDetails(profileRes.data.user);
        } catch (e) {
            console.log("Seeker fetch error");
        } finally {
            setLoading(false);
        }
    };

    const handleChat = () => {
        if (!seekerDetails?._id) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push({
            pathname: "/MainChat",
            params: {
                chatid: seekerDetails._id,
                type: "direct",
                name: seekerDetails.name,
                email: seekerDetails.email
            }
        });
        onClose();
    };

    const handleCall = () => {
        if (seekerDetails?.phone) {
            Linking.openURL(`tel:${seekerDetails.phone}`);
        } else {
            Alert.alert("No phone number", "Phone number not available");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return '#2E7D32';
            case 'pending': return '#EF6C00';
            case 'cancelled': return '#C62828';
            case 'past': return '#9E9E9E';
            default: return '#333';
        }
    };

    const getStatusText = (status: string) => {
        if (status === 'pending') return 'Pending';
        if (status === 'past') return 'Past';
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.detailsModalOverlay}>
                <View style={styles.detailsModalContent}>
                    <View style={styles.detailsModalHeader}>
                        <Text style={styles.detailsModalTitle}>Appointment Details</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {loading ? (
                            <ActivityIndicator size="large" color="#014631" style={styles.detailsLoader} />
                        ) : (
                            <>
                                {/* Property Info */}
                                <View style={styles.detailsSection}>
                                    {/* <Text style={styles.detailsSectionTitle}>Property Information</Text>
                                    <TouchableOpacity onPress={onViewProperty} style={styles.propertyLink}>
                                        <Ionicons name="home-outline" size={20} color="#014631" />
                                        <Text style={styles.detailText}>{appointment.property}</Text>
                                        <Ionicons name="chevron-forward" size={16} color="#014631" />
                                    </TouchableOpacity> */}
                                    {appointment.propertyAddress && (
                                        <View style={styles.detailRow}>
                                            <Ionicons name="location-outline" size={20} color="#014631" />
                                            <Text style={styles.detailText}>{appointment.propertyAddress}</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Appointment Schedule */}
                                <View style={styles.detailsSection}>
                                    <Text style={styles.detailsSectionTitle}>Schedule</Text>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="calendar-outline" size={20} color="#014631" />
                                        <Text style={styles.detailText}>{formatDateTime(appointment.date)}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="time-outline" size={20} color="#014631" />
                                        <Text style={styles.detailText}>{formatTime(appointment.time)}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
                                            <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
                                                {getStatusText(appointment.status)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Seeker Information */}
                                {seekerDetails && (
                                    <View style={styles.detailsSection}>
                                        <Text style={styles.detailsSectionTitle}>Seeker Information</Text>
                                        <View style={styles.seekerInfoRow}>
                                            <Image
                                                source={{ uri: seekerDetails.profile || "https://via.placeholder.com/60" }}
                                                style={styles.seekerAvatar}
                                            />
                                            <View style={styles.seekerInfo}>
                                                <Text style={styles.seekerName}>{seekerDetails.name}</Text>
                                                <Text style={styles.seekerEmail}>{seekerDetails.email}</Text>
                                                {seekerDetails.phone && (
                                                    <Text style={styles.seekerPhone}>{seekerDetails.phone}</Text>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {/* Message/Notes */}
                                {appointment.message && (
                                    <View style={styles.detailsSection}>
                                        <Text style={styles.detailsSectionTitle}>Message</Text>
                                        <Text style={styles.messageText}>{appointment.message}</Text>
                                    </View>
                                )}

                                {/* Action Buttons */}
                                <View style={styles.detailsActions}>
                                    {appointment.status !== 'cancelled' && appointment.status !== 'past' && (
                                        <>
                                            <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
                                                <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                                                <Text style={styles.actionButtonText}>Chat</Text>
                                            </TouchableOpacity>
                                            {/* <TouchableOpacity style={styles.callButton} onPress={handleCall}>
                                                <Ionicons name="call-outline" size={20} color="#fff" />
                                                <Text style={styles.actionButtonText}>Call</Text>
                                            </TouchableOpacity> */}
                                        </>
                                    )}
                                    {/* <TouchableOpacity style={styles.propertyButton} onPress={onViewProperty}>
                                        <Ionicons name="home-outline" size={20} color="#fff" />
                                        <Text style={styles.actionButtonText}>View Property</Text>
                                    </TouchableOpacity> */}
                                </View>
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

// Styles
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
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: "#000000" },
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
    dateTimeContainer: { flexDirection: "row", alignItems: "center", marginTop: 2, flexWrap: "wrap" },
    dateTime: { fontSize: 12, color: "#014631", fontWeight: "500" },
    timeSeparator: { width: 4 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: "bold", textTransform: "uppercase" },
    actionRow: { flexDirection: "column", marginTop: 12, borderTopWidth: 1, borderColor: "#F1F3F5", paddingTop: 10, gap: 8 },
    confirmBtn: { flex: 1, backgroundColor: "#014631", padding: 10, borderRadius: 8, alignItems: "center" },
    reschedBtn: { flex: 1, backgroundColor: "#F1F3F5", padding: 10, borderRadius: 8, alignItems: "center" },
    cancelBtn: { flex: 1, backgroundColor: "#FFEBEE", padding: 10, borderRadius: 8, alignItems: "center" },
    chatBtn: { flex: 1, backgroundColor: "#10ca8c", padding: 10, borderRadius: 8, alignItems: "center", flexDirection: 'row', justifyContent: 'center', gap: 6 },
    detailsBtn: { flex: 1, backgroundColor: "#014631", padding: 10, borderRadius: 8, alignItems: "center", flexDirection: 'row', justifyContent: 'center', gap: 8 },
    btnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
    btnTextDark: { color: "#333", fontWeight: "bold", fontSize: 14 },
    completedContainer: { flex: 1, alignItems: "center", padding: 10 },
    completedText: { color: "#999", fontSize: 13, fontStyle: "italic" },
    viewPropertyBtn: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
    viewPropertyText: { color: "#014631", fontSize: 12, fontWeight: "500" },
    chatLink: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 6 },
    chatLinkText: { color: "#014631", fontSize: 12, fontWeight: "500" },
    emptyCont: { alignItems: "center", marginTop: 60 },
    emptyText: { color: "#999", marginTop: 12, fontSize: 15, fontWeight: "500" },
    emptySubtext: { color: "#ccc", marginTop: 4, fontSize: 13 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 25 },
    modalContent: { backgroundColor: "#fff", borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 20, color: "#333" },
    label: { fontSize: 12, color: "#999", marginBottom: 5, fontWeight: '600' },
    datePickerButton: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#EEE",
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
        backgroundColor: '#F9F9F9',
        gap: 10
    },
    datePickerText: { fontSize: 14, color: "#333", flex: 1 },
    modalActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 10 },
    saveBtn: { backgroundColor: "#014631", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginLeft: 20 },
    cancelLink: { color: "#E64016", fontWeight: '600' },
    // Details Modal Styles
    detailsModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    detailsModalContent: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%", minHeight: "70%" },
    detailsModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#EEE" },
    detailsModalTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
    detailsLoader: { marginTop: 40 },
    detailsSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
    detailsSectionTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 12 },
    detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 10 },
    detailText: { fontSize: 14, color: "#666", flex: 1 },
    propertyLink: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 10 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: "flex-start" },
    statusText: { fontSize: 12, fontWeight: "600" },
    seekerInfoRow: { flexDirection: "row", alignItems: "center", gap: 15 },
    seekerAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#F0F0F0" },
    seekerInfo: { flex: 1 },
    seekerName: { fontSize: 16, fontWeight: "600", color: "#333" },
    seekerEmail: { fontSize: 13, color: "#666", marginTop: 2 },
    seekerPhone: { fontSize: 13, color: "#014631", marginTop: 2 },
    messageText: { fontSize: 14, color: "#666", lineHeight: 20, backgroundColor: "#F8F9FA", padding: 12, borderRadius: 8 },
    detailsActions: { flexDirection: "row", padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: "#EEE" },
    chatButton: { flex: 1, backgroundColor: "#014631", flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 10, gap: 8 },
    callButton: { flex: 1, backgroundColor: "#10ca8c", flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 10, gap: 8 },
    propertyButton: { flex: 1, backgroundColor: "#014631", flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 10, gap: 8 },
    actionButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});

// Single export default at the end
export default AppointmentScreen;