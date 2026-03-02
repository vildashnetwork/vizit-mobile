


import React, { useState, useEffect, useCallback } from "react";
import {
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    RefreshControl,
    Alert,
    Dimensions,
    StatusBar,
    Modal,
    TextInput,
} from "react-native";
import { View, Text } from "@/components/Themed";
import axios from "axios";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");
const API_BASE = "https://vizit-backend-hubw.onrender.com/api";

type Property = {
    _id: string;
    title: string;
    type: string;
    rent: number;
    how?: string;
    image?: string;
    images?: string[];
    amenities?: string[];
    location?: {
        address?: string;
        city?: string;
    };
    owner: {
        id: string;
        name: string;
        email: string;
        verified?: boolean;
    };
    isAvalable?: boolean;
    views?: number;
    likes?: number;
    createdAt?: string;
    updatedAt?: string;
};

type Owner = {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    profile?: string;
    verified?: boolean;
    companyname?: string;
    totalBalance?: number;
    paymentprscribtion?: any[];
    status?: string;
    referredBy?: string;
    isReferralPaid?: boolean;
};

export default function MyHouses() {
    const [owner, setOwner] = useState<Owner | null>(null);
    const [properties, setProperties] = useState<Property[]>([]);
    const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");
    const [showme, setShowme] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        available: 0,
        booked: 0,
        totalViews: 0,
        listingsThisMonth: 0,
        appointmentsThisMonth: 0,
        unreadMessages: 0,
        totalBalance: 0,
    });
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [refreshBalance, setRefreshBalance] = useState(false);

    // Filter options
    const filters = [
        { key: "all", label: "All", icon: "apps" },
        { key: "available", label: "Available", icon: "check-circle" },
        { key: "booked", label: "Booked", icon: "lock" },
        { key: "popular", label: "Most Viewed", icon: "trending-up" },
    ];

    // Decode token and get owner info
    const decodeTokenAndGetOwner = async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            if (!token) {
                Alert.alert("Error", "No token found. Please login again.");
                router.push("/Login");
                return null;
            }

            const response = await axios.get(
                `${API_BASE}/owner/decode/token/owner`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.status === 200) {
                setOwner(response.data.res);
                return response.data.res;
            }
            return null;
        } catch (error) {
            console.error("Failed to decode token:", error);
            Alert.alert("Error", "Session expired. Please login again.");
            router.push("/owner/login");
            return null;
        }
    };

    // Fetch user balance and transactions
    const fetchUserBalance = async (email: string) => {
        try {
            const res = await axios.get(
                `${API_BASE}/user/me/${email}`
            );

            if (res.data?.user) {
                setStats(prev => ({
                    ...prev,
                    totalBalance: res.data.user.totalBalance || 0
                }));
            }
        } catch (error) {
            console.error("Failed to fetch balance:", error);
        }
    };

    // Fetch appointments
    const fetchAppointments = async (userId: string) => {
        try {
            const res = await axios.get(
                `${API_BASE}/apointment/owner/${userId}`
            );

            if (res.status === 200 && Array.isArray(res.data)) {
                setAppointments(res.data);

                // Count this month's appointments
                const now = new Date();
                const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

                const thisMonth = res.data.filter(
                    (item: any) => item.createdAt && new Date(item.createdAt) >= firstDayOfMonth
                );

                setStats(prev => ({
                    ...prev,
                    appointmentsThisMonth: thisMonth.length
                }));
            }
        } catch (error) {
            console.error("Failed to fetch appointments:", error);
        }
    };

    // Fetch messages
    const fetchMessages = async (userId: string) => {
        try {
            const res = await axios.get(
                `${API_BASE}/messages/user/${userId}`
            );

            const conversations = res.data.conversations || [];
            setMessages(conversations);

            const unreadCount = conversations.filter((c: any) => !c.read).length;
            setStats(prev => ({
                ...prev,
                unreadMessages: unreadCount
            }));
        } catch (error) {
            console.error("Failed to fetch messages:", error);
        }
    };

    // Refresh balance
    const handleRefreshBalance = async () => {
        if (refreshBalance || !owner?.email) return;

        setRefreshBalance(true);

        let attempts = 0;
        const maxAttempts = 20;
        const intervalTime = 1000;

        const interval = setInterval(async () => {
            attempts++;

            try {
                // Reconcile payments
                await axios.get(`${API_BASE}/reconcile-payments`);

                // Credit user
                await axios.post(`${API_BASE}/credit-user/${owner?.email}`);

                // Get updated user
                const updatedUser = await axios.get(
                    `${API_BASE}/user/me/${owner?.email}`
                );

                const payments = updatedUser.data?.user?.paymentprscribtion || [];
                const latest = payments.at(-1);

                if (!latest) return;

                if (latest.status === "success") {
                    clearInterval(interval);
                    setRefreshBalance(false);

                    // Update balance
                    setStats(prev => ({
                        ...prev,
                        totalBalance: updatedUser.data.user.totalBalance || 0
                    }));

                    Alert.alert("Success", "Balance updated successfully");
                }

                if (latest.status === "failed") {
                    clearInterval(interval);
                    setRefreshBalance(false);
                    Alert.alert("Error", "Payment verification failed");
                }

                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    setRefreshBalance(false);
                    Alert.alert("Timeout", "Please try again later");
                }
            } catch (err) {
                console.log("Polling error:", err);
            }
        }, intervalTime);
    };

    // Fetch properties for this owner
    const fetchOwnerProperties = async (ownerData: Owner) => {
        try {
            const response = await axios.get(`${API_BASE}/house/houses`);
            const allHouses = response.data.houses || [];

            // Filter properties by owner ID
            const ownerProperties = allHouses.filter(
                (house: Property) => house.owner?.id === ownerData._id
            );

            // Calculate stats
            const available = ownerProperties.filter((p: Property) => p.isAvalable === true).length;
            const totalViews = ownerProperties.reduce((acc: number, p: Property) => acc + (p.views || 0), 0);

            // Count listings this month
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const listingsThisMonth = ownerProperties.filter(
                (p: Property) => p.createdAt && new Date(p.createdAt) >= firstDayOfMonth
            ).length;

            setStats(prev => ({
                ...prev,
                total: ownerProperties.length,
                available,
                booked: ownerProperties.length - available,
                totalViews,
                listingsThisMonth,
            }));

            setProperties(ownerProperties);
            applyFilters(ownerProperties, "all", "");

            // Fetch additional data
            const userId = await AsyncStorage.getItem("userId");
            if (userId) {
                fetchAppointments(userId);
                fetchMessages(userId);
            }

            if (ownerData.email) {
                fetchUserBalance(ownerData.email);
            }
        } catch (error) {
            console.error("Failed to fetch properties:", error);
            Alert.alert("Error", "Failed to load your properties");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Apply filters and search
    const applyFilters = useCallback(
        (props: Property[], filter: string, query: string) => {
            let filtered = [...props];

            // Apply status filter
            if (filter === "available") {
                filtered = filtered.filter((p) => p.isAvalable === true);
            } else if (filter === "booked") {
                filtered = filtered.filter((p) => p.isAvalable === false);
            } else if (filter === "popular") {
                filtered = filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
            }

            // Apply search
            if (query.trim() !== "") {
                const searchLower = query.toLowerCase().trim();
                filtered = filtered.filter(
                    (item) =>
                        item.title?.toLowerCase().includes(searchLower) ||
                        item.type?.toLowerCase().includes(searchLower) ||
                        item.location?.address?.toLowerCase().includes(searchLower)
                );
            }

            setFilteredProperties(filtered);
        },
        []
    );

    // Handle search
    const handleSearch = (text: string) => {
        setSearchQuery(text);
        applyFilters(properties, activeFilter, text);
    };

    // Handle filter change
    const handleFilterChange = (filterKey: string) => {
        setActiveFilter(filterKey);
        applyFilters(properties, filterKey, searchQuery);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    // Refresh data
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        const ownerData = await decodeTokenAndGetOwner();
        if (ownerData) {
            await fetchOwnerProperties(ownerData);
        }
    }, []);

    // Delete property
    const deleteProperty = async (propertyId: string) => {
        Alert.alert(
            "Delete Property",
            "Are you sure you want to delete this property? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setDeletingId(propertyId);
                            const token = await AsyncStorage.getItem("userToken");

                            await axios.delete(`${API_BASE}/house/houses/${propertyId}`, {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                            });

                            // Remove from local state
                            const updatedProperties = properties.filter((p) => p._id !== propertyId);
                            setProperties(updatedProperties);
                            applyFilters(updatedProperties, activeFilter, searchQuery);

                            // Update stats
                            setStats({
                                ...stats,
                                total: updatedProperties.length,
                                available: updatedProperties.filter((p) => p.isAvalable === true).length,
                                booked: updatedProperties.filter((p) => p.isAvalable === false).length,
                                totalViews: updatedProperties.reduce((acc, p) => acc + (p.views || 0), 0),
                            });

                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Alert.alert("Success", "Property deleted successfully");
                        } catch (error) {
                            console.error("Delete failed:", error);
                            Alert.alert("Error", "Failed to delete property");
                        } finally {
                            setDeletingId(null);
                            setShowOptionsModal(false);
                        }
                    },
                },
            ]
        );
    };

    // Toggle availability
    const toggleAvailability = async (property: Property) => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            const updatedStatus = !property.isAvalable;

            await axios.patch(
                `${API_BASE}/house/houses/${property._id}`,
                { isAvalable: updatedStatus },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            // Update local state
            const updatedProperties = properties.map((p) =>
                p._id === property._id ? { ...p, isAvalable: updatedStatus } : p
            );

            setProperties(updatedProperties);
            applyFilters(updatedProperties, activeFilter, searchQuery);

            // Update stats
            setStats({
                ...stats,
                available: updatedProperties.filter((p) => p.isAvalable === true).length,
                booked: updatedProperties.filter((p) => p.isAvalable === false).length,
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                "Success",
                `Property marked as ${updatedStatus ? "Available" : "Booked"}`
            );
        } catch (error) {
            console.error("Update failed:", error);
            Alert.alert("Error", "Failed to update property status");
        }
    };

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const ownerData = await decodeTokenAndGetOwner();
            if (ownerData) {
                await fetchOwnerProperties(ownerData);
            }
        };
        loadData();
    }, []);

    // Refocus effect
    useFocusEffect(
        useCallback(() => {
            onRefresh();
        }, [])
    );

    // Format date
    const formatDate = (dateString?: string) => {
        if (!dateString) return "Recently";
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
        if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <LinearGradient
                    colors={["#c2c2c2", "#bdbdbd"]}
                    style={styles.loadingGradient}
                >
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.loadingText}>Loading your properties...</Text>
                </LinearGradient>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header with Gradient */}
            <LinearGradient colors={["#10ca8c", "#00976a"]} style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Properties</Text>
                    <TouchableOpacity
                        onPress={() => router.push("./(tabs)/two")}
                        style={styles.addButton}
                    >
                        <Ionicons name="add" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Welcome Section */}
                {/* <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeTitle}>Welcome, {owner?.name || "Owner"}</Text>
                    <Text style={styles.welcomeSubtitle}>
                        What's going on with your properties today?
                    </Text>
                </View> */}

                {/* Stats Cards */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.statsScroll}
                    contentContainerStyle={styles.statsContent}
                >
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.total}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.available}</Text>
                        <Text style={styles.statLabel}>Available</Text>
                    </View>


                    <TouchableOpacity
                        style={styles.statCard}
                        onPress={handleRefreshBalance}
                        disabled={refreshBalance}
                    >
                        <View style={styles.balanceContainer}>
                            <Text style={styles.statNumber}>
                                {showme ? `${stats.totalBalance.toLocaleString()} FCFA` : "****"}
                            </Text>
                            <TouchableOpacity onPress={() => setShowme(!showme)}>
                                <Ionicons
                                    name={showme ? "eye-outline" : "eye-off-outline"}
                                    size={16}
                                    color="#fff"
                                />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.statLabel}>
                            {refreshBalance ? "Refreshing..." : "Balance"}
                        </Text>
                    </TouchableOpacity>
                    {/* <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.totalViews}</Text>
                        <Text style={styles.statLabel}>Views</Text>
                    </View> */}
                </ScrollView>

                {/* Second Row Stats */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={[styles.statsScroll, { marginTop: 10 }]}
                    contentContainerStyle={styles.statsContent}
                >
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>+{stats.listingsThisMonth}</Text>
                        <Text style={styles.statLabel}>Listings/Month</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.appointmentsThisMonth}</Text>
                        <Text style={styles.statLabel}>Appointments</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.booked}</Text>
                        <Text style={styles.statLabel}>Booked</Text>
                    </View>

                    {/* <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.unreadMessages}</Text>
                        <Text style={styles.statLabel}>Unread Msgs</Text>
                    </View> */}

                </ScrollView>
            </LinearGradient>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchWrapper}>
                    <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search your properties..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch("")} style={styles.clearButton}>
                            <Ionicons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filter Chips */}
            {/* <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filtersContainer}
                contentContainerStyle={styles.filtersContent}
            >
                {filters.map((filter) => (
                    <TouchableOpacity
                        key={filter.key}
                        style={[
                            styles.filterChip,
                            activeFilter === filter.key && styles.activeFilterChip
                        ]}
                        onPress={() => handleFilterChange(filter.key)}
                    >
                        <MaterialCommunityIcons
                            name={filter.icon}
                            size={16}
                            color={activeFilter === filter.key ? "#fff" : "#666"}
                        />
                        <Text
                            style={[
                                styles.filterChipText,
                                activeFilter === filter.key && styles.activeFilterChipText
                            ]}
                        >
                            {filter.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView> */}

            {/* Properties List */}
            <FlatList
                data={filteredProperties}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#10ca8c"]} />
                }
                renderItem={({ item }) => (
                    <View style={styles.propertyCard}>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => router.push(`/owner/property/${item._id}`)}
                        >
                            <View style={styles.cardImageContainer}>
                                <Image
                                    source={{ uri: item.image || "https://via.placeholder.com/300" }}
                                    style={styles.cardImage}
                                />
                                <View
                                    style={[
                                        styles.statusBadge,
                                        item.isAvalable ? styles.availableBadge : styles.bookedBadge,
                                    ]}
                                >
                                    <Text style={styles.statusText}>
                                        {item.isAvalable ? "Available" : "Booked"}
                                    </Text>
                                </View>
                                {deletingId === item._id && (
                                    <View style={styles.deletingOverlay}>
                                        <ActivityIndicator color="#fff" />
                                    </View>
                                )}
                            </View>

                            <View style={styles.cardContent}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.propertyTitle} numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <View style={styles.priceTag}>
                                        <Text style={styles.priceText}>{item.rent.toLocaleString()} FCFA</Text>
                                        <Text style={styles.pricePeriod}>/{item.how || "month"}</Text>
                                    </View>
                                </View>

                                <View style={styles.propertyMeta}>
                                    <View style={styles.metaItem}>
                                        <Ionicons name="location-outline" size={14} color="#666" />
                                        <Text style={styles.metaText} numberOfLines={1}>
                                            {item.location?.address?.split(",")[0] || "Location not set"}
                                        </Text>
                                    </View>
                                    <View style={styles.metaItem}>
                                        <Ionicons name="time-outline" size={14} color="#666" />
                                        <Text style={styles.metaText}>{formatDate(item.updatedAt)}</Text>
                                    </View>
                                </View>

                                <View style={styles.amenitiesRow}>
                                    {item.amenities?.slice(0, 3).map((amenity, index) => (
                                        <View key={index} style={styles.amenityChip}>
                                            <Text style={styles.amenityText}>{amenity}</Text>
                                        </View>
                                    ))}
                                    {item.amenities && item.amenities.length > 3 && (
                                        <Text style={styles.moreAmenities}>+{item.amenities.length - 3}</Text>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>

                        {/* Three Action Buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.viewButton]}
                                onPress={() => router.push(`/owner/property/${item._id}`)}
                            >
                                <Ionicons name="eye-outline" size={20} color="#fff" />
                                <Text style={styles.actionButtonText}>View</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, styles.editButton]}
                                onPress={() => router.push({
                                    pathname: "./EditHouse",
                                    params: { id: item._id }
                                })}
                            >
                                <Ionicons name="create-outline" size={20} color="#fff" />
                                <Text style={styles.actionButtonText}>Edit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, styles.deleteButton]}
                                onPress={() => deleteProperty(item._id)}
                                disabled={deletingId === item._id}
                            >
                                {deletingId === item._id ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="trash-outline" size={20} color="#fff" />
                                        <Text style={styles.actionButtonText}>Delete</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="home-off" size={80} color="#ddd" />
                        <Text style={styles.emptyTitle}>No properties yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Start by creating your first property listing
                        </Text>
                        <TouchableOpacity
                            style={styles.createButton}
                            onPress={() => router.push("/owner/create-property")}
                        >
                            <LinearGradient
                                colors={["#10ca8c", "#00976a"]}
                                style={styles.createButtonGradient}
                            >
                                <Ionicons name="add" size={20} color="#fff" />
                                <Text style={styles.createButtonText}>Create Property</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                }
            />

            {/* Options Modal */}
            <Modal
                visible={showOptionsModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowOptionsModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowOptionsModal(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />

                        <Text style={styles.modalTitle}>Property Options</Text>

                        {selectedProperty && (
                            <>
                                <TouchableOpacity
                                    style={styles.modalOption}
                                    onPress={() => {
                                        setShowOptionsModal(false);
                                        router.push(`/owner/edit-property/${selectedProperty._id}`);
                                    }}
                                >
                                    <View style={[styles.optionIcon, { backgroundColor: "#e3f2fd" }]}>
                                        <Ionicons name="create-outline" size={24} color="#2196f3" />
                                    </View>
                                    <View style={styles.optionText}>
                                        <Text style={styles.optionTitle}>Edit Property</Text>
                                        <Text style={styles.optionDescription}>Update property details</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.modalOption}
                                    onPress={() => {
                                        setShowOptionsModal(false);
                                        toggleAvailability(selectedProperty);
                                    }}
                                >
                                    <View
                                        style={[
                                            styles.optionIcon,
                                            { backgroundColor: selectedProperty.isAvalable ? "#fff3e0" : "#e8f5e9" },
                                        ]}
                                    >
                                        <Ionicons
                                            name={selectedProperty.isAvalable ? "lock-open-outline" : "checkmark-circle-outline"}
                                            size={24}
                                            color={selectedProperty.isAvalable ? "#ff9800" : "#4caf50"}
                                        />
                                    </View>
                                    <View style={styles.optionText}>
                                        <Text style={styles.optionTitle}>
                                            Mark as {selectedProperty.isAvalable ? "Booked" : "Available"}
                                        </Text>
                                        <Text style={styles.optionDescription}>
                                            {selectedProperty.isAvalable
                                                ? "Property will be shown as booked"
                                                : "Property will be shown as available"}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalOption, styles.deleteOption]}
                                    onPress={() => {
                                        setShowOptionsModal(false);
                                        deleteProperty(selectedProperty._id);
                                    }}
                                >
                                    <View style={[styles.optionIcon, { backgroundColor: "#ffebee" }]}>
                                        <Ionicons name="trash-outline" size={24} color="#f44336" />
                                    </View>
                                    <View style={styles.optionText}>
                                        <Text style={[styles.optionTitle, { color: "#f44336" }]}>
                                            Delete Property
                                        </Text>
                                        <Text style={styles.optionDescription}>
                                            Permanently remove this listing
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </>
                        )}

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setShowOptionsModal(false)}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    loadingContainer: {
        flex: 1,
    },
    loadingGradient: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: "#fff",
        fontWeight: "600",
    },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        marginBottom: 15,
        backgroundColor: "transparent",
        marginTop: -15,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#fff",
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    welcomeSection: {
        paddingHorizontal: 20,
        marginBottom: 15,
        backgroundColor: "transparent",
    },
    welcomeTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#fff",
        marginBottom: 4,
    },
    welcomeSubtitle: {
        fontSize: 13,
        color: "rgba(255,255,255,0.9)",
    },
    statsScroll: {
        backgroundColor: "transparent",
    },
    statsContent: {
        paddingHorizontal: 15,
        gap: 12,
    },
    statCard: {
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.15)",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        minWidth: 90,
    },
    statNumber: {
        fontSize: 18,
        fontWeight: "800",
        color: "#fff",
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        color: "rgba(255,255,255,0.9)",
        fontWeight: "500",
    },
    balanceContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "transparent",
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: "#fff",
    },
    searchWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 45,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: "#333",
    },
    clearButton: {
        padding: 4,
    },
    filtersContainer: {
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    filtersContent: {
        paddingHorizontal: 15,
        paddingVertical: 12,
        gap: 8,
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: "#f5f5f5",
        marginRight: 8,
        gap: 6,
    },
    activeFilterChip: {
        backgroundColor: "#10ca8c",
    },
    filterChipText: {
        fontSize: 13,
        color: "#666",
        fontWeight: "500",
    },
    activeFilterChipText: {
        color: "#fff",
    },
    listContent: {
        padding: 15,
        paddingBottom: 30,
    },
    propertyCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        marginBottom: 15,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    cardImageContainer: {
        position: "relative",
        height: 180,
    },
    cardImage: {
        width: "100%",
        height: "100%",
    },
    statusBadge: {
        position: "absolute",
        top: 12,
        right: 12,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    availableBadge: {
        backgroundColor: "#4caf50",
    },
    bookedBadge: {
        backgroundColor: "#f44336",
    },
    statusText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    deletingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    cardContent: {
        padding: 15,
        backgroundColor: "#fff",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
        backgroundColor: "#fff",
    },
    propertyTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#333",
        flex: 1,
        marginRight: 10,
    },
    priceTag: {
        flexDirection: "row",
        alignItems: "baseline",
        backgroundColor: "#fff",
    },
    priceText: {
        fontSize: 16,
        fontWeight: "800",
        color: "#10ca8c",
    },
    pricePeriod: {
        fontSize: 11,
        color: "#999",
        marginLeft: 2,
    },
    propertyMeta: {
        flexDirection: "row",
        marginBottom: 10,
        backgroundColor: "#fff",
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 15,
        backgroundColor: "#fff",
    },
    metaText: {
        fontSize: 12,
        color: "#666",
        marginLeft: 4,
        maxWidth: 150,
    },
    amenitiesRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        backgroundColor: "#fff",
    },
    amenityChip: {
        backgroundColor: "#f5f5f5",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 6,
    },
    amenityText: {
        fontSize: 11,
        color: "#666",
    },
    moreAmenities: {
        fontSize: 11,
        color: "#999",
        marginLeft: 4,
    },
    actionButtons: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
        backgroundColor: "#fff",
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        gap: 6,
    },
    viewButton: {
        backgroundColor: "#10ca8c",
    },
    editButton: {
        backgroundColor: "#2196f3",
    },
    deleteButton: {
        backgroundColor: "#f44336",
    },
    actionButtonText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "600",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333",
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: "#999",
        textAlign: "center",
        marginBottom: 24,
    },
    createButton: {
        borderRadius: 12,
        overflow: "hidden",
    },
    createButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 14,
        gap: 8,
    },
    createButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 30,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: "#ddd",
        borderRadius: 2,
        alignSelf: "center",
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333",
        marginBottom: 20,
        textAlign: "center",
    },
    modalOption: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    optionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
    },
    optionText: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: "#333",
        marginBottom: 2,
    },
    optionDescription: {
        fontSize: 12,
        color: "#999",
    },
    deleteOption: {
        borderBottomWidth: 0,
    },
    cancelButton: {
        marginTop: 16,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#f5f5f5",
        alignItems: "center",
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#666",
    },
});