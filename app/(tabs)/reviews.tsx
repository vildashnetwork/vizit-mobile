// import React, { useEffect, useState, useCallback, useMemo } from "react";
// import {
//     View,
//     Text,
//     StyleSheet,
//     ScrollView,
//     TouchableOpacity,
//     TextInput,
//     ActivityIndicator,
//     Alert,
//     Dimensions,
//     RefreshControl,
//     Image,
// } from "react-native";
// import { router } from "expo-router";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import axios from "axios";
// import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
// import { useNavigation } from "@react-navigation/native";

// const { width } = Dimensions.get("window");

// const API_BASE = "https://auth.vizit.homes/api/house/houses";
// const DECODE_OWNER = "https://auth.vizit.homes/api/owner/decode/token/owner";

// export default function ReviewsScreen() {
//     const navigation = useNavigation<any>();
//     const [currentUser, setCurrentUser] = useState<any>(null);
//     const [loading, setLoading] = useState(true);
//     const [refreshing, setRefreshing] = useState(false);
//     const [reviews, setReviews] = useState<any[]>([]);

//     const [searchQuery, setSearchQuery] = useState("");
//     const [activeFilter, setActiveFilter] = useState("All");

//     const [stats, setStats] = useState({
//         total: 0,
//         mean: 0,
//         stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as any,
//     });

//     // 1. Load Owner
//     useEffect(() => {
//         const init = async () => {
//             try {
//                 const token = await AsyncStorage.getItem("userToken");
//                 if (!token) return;
//                 const res = await axios.get(DECODE_OWNER, {
//                     headers: { Authorization: `Bearer ${token}` },
//                 });
//                 if (res.data?.res) setCurrentUser(res.data.res);
//             } catch (err) {
//                 console.error("Auth error", err);
//             } finally {
//                 setLoading(false);
//             }
//         };
//         init();
//     }, []);

//     // 2. Fetch Data
//     const loadOwnerReviews = useCallback(async () => {
//         if (!currentUser?._id) return;
//         setRefreshing(true);
//         try {
//             const res = await axios.get(API_BASE);
//             const houses = res.data?.houses || [];
//             const ownedHouses = houses.filter((h: any) => h.owner?.id === currentUser._id);

//             const flattened = ownedHouses.flatMap((house: any) =>
//                 (house.reviews?.entries || []).map((entry: any) => ({
//                     ...entry,
//                     propertyId: house._id,
//                     propertyTitle: house.title,
//                 }))
//             );

//             setReviews(flattened);
//             computeStats(flattened);
//         } catch (err) {
//             console.error(err);
//             Alert.alert("Error", "Failed to fetch reviews");
//         } finally {
//             setRefreshing(false);
//         }
//     }, [currentUser]);

//     useEffect(() => {
//         loadOwnerReviews();
//     }, [currentUser, loadOwnerReviews]);

//     const computeStats = (arr: any[]) => {
//         const stars = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
//         let sum = 0;
//         arr.forEach((r) => {
//             const val = Math.round(Number(r.rating)) || 0;
//             if (val >= 1 && val <= 5) (stars as any)[val] += 1;
//             sum += val;
//         });
//         setStats({
//             total: arr.length,
//             mean: arr.length ? parseFloat((sum / arr.length).toFixed(1)) : 0,
//             stars,
//         });
//     };

//     const filteredReviews = useMemo(() => {
//         let result = [...reviews];
//         if (searchQuery) {
//             result = result.filter(r =>
//                 r.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
//                 r.comment.toLowerCase().includes(searchQuery.toLowerCase())
//             );
//         }
//         if (activeFilter === "Unread") {
//             result = result.filter(r => !r.replies || r.replies.length === 0);
//         } else if (activeFilter === "Newest") {
//             result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
//         }
//         return result;
//     }, [reviews, searchQuery, activeFilter]);

//     const handleReply = async (reviewId: string, propertyId: string, text: string) => {
//         if (!text.trim()) return;
//         try {
//             const token = await AsyncStorage.getItem("userToken");
//             const payload = {
//                 reviewId,
//                 userId: currentUser?._id,
//                 isAdmin: true,
//                 text: text.trim(),
//                 name: currentUser?.name,
//                 email: currentUser?.email,
//                 profileImg: currentUser?.profile,
//             };
//             await axios.post(`${API_BASE}/review/reply/${propertyId}`, payload, {
//                 headers: { Authorization: `Bearer ${token}` },
//             });
//             Alert.alert("Success", "Reply posted successfully!");
//             loadOwnerReviews();
//         } catch (err) {
//             Alert.alert("Error", "Could not post reply");
//         }
//     };

//     if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#13854c" /></View>;

//     return (
//         <View style={styles.mainContainer}>
//             <View style={styles.headerCont}>
//                 <View style={styles.searchBar}>
//                     <Ionicons name="search" size={20} color="#999" />
//                     <TextInput
//                         placeholder="Search property or keywords..."
//                         style={styles.searchInput}
//                         value={searchQuery}
//                         onChangeText={setSearchQuery}
//                     />
//                 </View>
//                 <View style={styles.filterRow}>
//                     {["All", "Unread", "Newest"].map((type) => (
//                         <TouchableOpacity
//                             key={type}
//                             onPress={() => setActiveFilter(type)}
//                             style={[styles.filterBtn, activeFilter === type && styles.filterBtnActive]}
//                         >
//                             <Text style={[styles.filterText, activeFilter === type && styles.filterTextActive]}>{type}</Text>
//                         </TouchableOpacity>
//                     ))}
//                 </View>
//             </View>

//             <ScrollView
//                 style={styles.container}
//                 showsVerticalScrollIndicator={false}
//                 contentContainerStyle={{ paddingBottom: 40 }}
//                 refreshControl={
//                     <RefreshControl refreshing={refreshing} onRefresh={loadOwnerReviews} colors={["#13854c"]} tintColor="#13854c" />
//                 }
//             >
//                 <View style={styles.analyticsCard}>
//                     <View style={styles.ratingOverview}>
//                         <Text style={styles.bigRatingText}>{stats.mean}</Text>
//                         <View style={styles.starRow}>
//                             {[1, 2, 3, 4, 5].map(s => (
//                                 <Ionicons key={s} name="star" size={14} color={s <= stats.mean ? "#FFD700" : "#E0E0E0"} />
//                             ))}
//                         </View>
//                         <Text style={styles.totalReviewsText}>{stats.total} Reviews</Text>
//                     </View>
//                     <View style={styles.dividerVertical} />
//                     <View style={styles.barSection}>
//                         {[5, 4, 3, 2, 1].map((n) => {
//                             const pct = stats.total > 0 ? Math.round((stats.stars[n] / stats.total) * 100) : 0;
//                             return (
//                                 <View key={n} style={styles.barRow}>
//                                     <Text style={styles.barLabel}>{n}</Text>
//                                     <View style={styles.barBase}>
//                                         <View style={[styles.barFill, { width: `${pct}%` }]} />
//                                     </View>
//                                     <Text style={styles.barPct}>{pct}%</Text>
//                                 </View>
//                             );
//                         })}
//                     </View>
//                 </View>

//                 {filteredReviews.length === 0 && !refreshing ? (
//                     <View style={styles.emptyCont}>
//                         <MaterialCommunityIcons name="comment-off-outline" size={50} color="#ccc" />
//                         <Text style={styles.emptyText}>No reviews found</Text>
//                     </View>
//                 ) : (
//                     filteredReviews.map((item) => (
//                         <ReviewItem
//                             key={item._id || item.id}
//                             item={item}
//                             onReply={handleReply}
//                             onViewDetails={() => router.push({
//                                 pathname: "../[propertyId]",
//                                 params: {
//                                     propertyId: item.propertyId,
//                                     currentUser: currentUser?._id,
//                                     ownerId: item.ownerId
//                                 },
//                             })}
//                         />
//                     ))
//                 )}
//             </ScrollView>
//         </View>
//     );
// }

// function ReviewItem({ item, onReply, onViewDetails }: { item: any, onReply: any, onViewDetails: any }) {
//     const [replyText, setReplyText] = useState("");
//     const [isReplying, setIsReplying] = useState(false);
//     const [userName, setUserName] = useState("");
//     const [userProfile, setUserProfile] = useState("");
//     const [loadingUser, setLoadingUser] = useState(true);

//     const hasReply = item.replies && item.replies.length > 0;

//     // Fetch user details exactly like the web file
//     useEffect(() => {
//         if (!item?.id) return;
//         let isMounted = true;

//         const fetchReviewer = async () => {
//             try {
//                 // Step 1: Get user email via r.id
//                 const getuser = await axios.get(
//                     `https://auth.vizit.homes/api/user/onlyme/${item.id}`
//                 );
//                 if (!getuser?.data?.getuser?.email) return;

//                 // Step 2: Get full profile via email
//                 const res = await axios.get(
//                     `https://auth.vizit.homes/api/user/me/${getuser?.data?.getuser?.email}`
//                 );

//                 if (isMounted) {
//                     setUserName(res.data?.user?.name || "");
//                     setUserProfile(res.data?.user?.profile || "");
//                 }
//             } catch (error) {
//                 console.error("Error fetching reviewer:", error);
//             } finally {
//                 if (isMounted) setLoadingUser(false);
//             }
//         };

//         fetchReviewer();
//         return () => { isMounted = false; };
//     }, [item?.id]);

//     return (
//         <View style={styles.reviewCard}>
//             {/* NEW: Property Title and "View Details" Link */}
//             <View style={styles.propertyHeader}>
//                 <Text style={styles.propLabel} numberOfLines={1}>
//                     Review for: <Text style={styles.propTitle}>{item.propertyTitle}</Text>
//                 </Text>
//                 <TouchableOpacity style={styles.viewBtn} onPress={onViewDetails}>
//                     <Text style={styles.viewBtnText}>View</Text>
//                     <Ionicons name="chevron-forward" size={14} color="#13854c" />
//                 </TouchableOpacity>
//             </View>

//             <View style={styles.reviewHeader}>
//                 <View style={styles.userIconCont}>
//                     {userProfile ? (
//                         <Image source={{ uri: userProfile }} style={styles.avatar} />
//                     ) : (
//                         <Text style={styles.userInitials}>
//                             {loadingUser ? "..." : (userName || item.propertyTitle).charAt(0).toUpperCase()}
//                         </Text>
//                     )}
//                 </View>
//                 <View style={{ flex: 1, marginLeft: 12 }}>
//                     <Text style={styles.reviewerName} numberOfLines={1}>
//                         {loadingUser ? "Loading..." : (userName || "Anonymous Guest")}
//                     </Text>
//                     <Text style={styles.reviewDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
//                 </View>
//                 <View style={styles.pillRating}>
//                     <Ionicons name="star" size={12} color="#13854c" />
//                     <Text style={styles.pillText}>{item.rating}</Text>
//                 </View>
//             </View>

//             <Text style={styles.reviewComment}>{item.comment}</Text>

//             {hasReply ? (
//                 <View style={styles.ownerReplyBox}>
//                     <View style={styles.replyHeaderRow}>
//                         <MaterialCommunityIcons name="subdirectory-arrow-right" size={16} color="#13854c" />
//                         <Text style={styles.replyOwnerName}>Your Response</Text>
//                     </View>
//                     <Text style={styles.replyText}>{item.replies[0].text}</Text>
//                 </View>
//             ) : (
//                 <View style={styles.actionArea}>
//                     {!isReplying ? (
//                         <TouchableOpacity style={styles.replyTrigger} onPress={() => setIsReplying(true)}>
//                             <Ionicons name="chatbubble-outline" size={18} color="#13854c" />
//                             <Text style={styles.replyTriggerText}>Write a reply</Text>
//                         </TouchableOpacity>
//                     ) : (
//                         <View style={styles.replyInputWrapper}>
//                             <TextInput
//                                 style={styles.replyInput}
//                                 placeholder="Type your response..."
//                                 value={replyText}
//                                 onChangeText={setReplyText}
//                                 multiline
//                             />
//                             <View style={styles.replyActions}>
//                                 <TouchableOpacity onPress={() => setIsReplying(false)}>
//                                     <Text style={styles.cancelText}>Cancel</Text>
//                                 </TouchableOpacity>
//                                 <TouchableOpacity
//                                     style={styles.sendBtn}
//                                     onPress={() => {
//                                         onReply(item._id || item.id, item.propertyId, replyText);
//                                         setIsReplying(false);
//                                     }}
//                                 >
//                                     <Ionicons name="send" size={18} color="#fff" />
//                                 </TouchableOpacity>
//                             </View>
//                         </View>
//                     )}
//                 </View>
//             )}
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     mainContainer: { flex: 1, backgroundColor: "#F8F9FA" },
//     center: { flex: 1, justifyContent: "center", alignItems: "center" },
//     headerCont: { backgroundColor: "#fff", padding: 15, borderBottomWidth: 1, borderColor: "#EEE" },
//     searchBar: {
//         flexDirection: "row",
//         alignItems: "center",
//         backgroundColor: "#F1F3F5",
//         borderRadius: 10,
//         paddingHorizontal: 12,
//         height: 45
//     },
//     searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
//     filterRow: { flexDirection: "row", marginTop: 15 },
//     filterBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, marginRight: 8, backgroundColor: "#F1F3F5" },
//     filterBtnActive: { backgroundColor: "#13854c" },
//     filterText: { fontSize: 13, color: "#666", fontWeight: "600" },
//     filterTextActive: { color: "#FFF" },
//     container: { flex: 1, padding: 15 },
//     analyticsCard: {
//         backgroundColor: "#fff",
//         borderRadius: 16,
//         padding: 20,
//         flexDirection: "row",
//         alignItems: "center",
//         elevation: 2,
//         shadowColor: "#000",
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.05,
//         marginBottom: 20
//     },
//     ratingOverview: { alignItems: "center", paddingRight: 20 },
//     bigRatingText: { fontSize: 42, fontWeight: "800", color: "#13854c" },
//     starRow: { flexDirection: "row", marginVertical: 4 },
//     totalReviewsText: { fontSize: 12, color: "#999" },
//     dividerVertical: { width: 1, height: "80%", backgroundColor: "#EEE" },
//     barSection: { flex: 1, paddingLeft: 20 },
//     barRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
//     barLabel: { width: 12, fontSize: 11, color: "#666" },
//     barBase: { flex: 1, height: 6, backgroundColor: "#F1F3F5", borderRadius: 3, marginHorizontal: 8, overflow: "hidden" },
//     barFill: { height: "100%", backgroundColor: "#13854c", borderRadius: 3 },
//     barPct: { width: 30, fontSize: 11, color: "#999", textAlign: "right" },
//     reviewCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 15, elevation: 1 },

//     // NEW Styles
//     propertyHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15, borderBottomWidth: 1, borderColor: "#F1F3F5", paddingBottom: 10 },
//     propLabel: { fontSize: 12, color: "#999", flex: 1 },
//     propTitle: { color: "#333", fontWeight: "bold" },
//     viewBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#E8F5E9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
//     viewBtnText: { color: "#13854c", fontSize: 12, fontWeight: "600", marginRight: 2 },

//     reviewHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
//     userIconCont: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: "#E8F5E9", justifyContent: "center", alignItems: "center", overflow: 'hidden' },
//     avatar: { width: '100%', height: '100%' },
//     userInitials: { color: "#13854c", fontWeight: "bold", fontSize: 18 },
//     reviewerName: { fontSize: 15, fontWeight: "bold", color: "#333" },
//     reviewDate: { fontSize: 12, color: "#999" },
//     pillRating: { flexDirection: "row", alignItems: "center", backgroundColor: "#E8F5E9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
//     pillText: { color: "#13854c", fontWeight: "bold", fontSize: 12, marginLeft: 4 },
//     reviewComment: { fontSize: 14, color: "#555", lineHeight: 20, marginBottom: 15 },
//     ownerReplyBox: { backgroundColor: "#F8F9FA", padding: 12, borderRadius: 12, borderLeftWidth: 3, borderColor: "#13854c" },
//     replyHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
//     replyOwnerName: { fontSize: 12, fontWeight: "bold", color: "#13854c", marginLeft: 6 },
//     replyText: { fontSize: 13, color: "#444" },
//     actionArea: { borderTopWidth: 1, borderColor: "#F1F3F5", paddingTop: 12 },
//     replyTrigger: { flexDirection: "row", alignItems: "center" },
//     replyTriggerText: { color: "#13854c", fontWeight: "600", fontSize: 13, marginLeft: 8 },
//     replyInputWrapper: { backgroundColor: "#F1F3F5", borderRadius: 12, padding: 8 },
//     replyInput: { fontSize: 14, minHeight: 60, textAlignVertical: "top", padding: 8 },
//     replyActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 8 },
//     cancelText: { color: "#999", marginRight: 15, fontSize: 13 },
//     sendBtn: { backgroundColor: "#13854c", padding: 8, borderRadius: 8 },
//     emptyCont: { alignItems: "center", marginTop: 40 },
//     emptyText: { color: "#999", marginTop: 10, fontSize: 16 }
// });

































import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Dimensions,
    RefreshControl,
    Image,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

const API_BASE = "https://auth.vizit.homes/api/house/houses";
const DECODE_OWNER = "https://auth.vizit.homes/api/owner/decode/token/owner";

export default function ReviewsScreen() {
    const navigation = useNavigation<any>();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [reviews, setReviews] = useState<any[]>([]);

    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("All");

    const [stats, setStats] = useState({
        total: 0,
        mean: 0,
        stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as any,
    });

    // 1. Load Owner
    useEffect(() => {
        const init = async () => {
            try {
                const token = await AsyncStorage.getItem("userToken");
                if (!token) return;
                const res = await axios.get(DECODE_OWNER, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.data?.res) setCurrentUser(res.data.res);
            } catch (err) {
                console.error("Auth error", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    // 2. Fetch Data
    const loadOwnerReviews = useCallback(async () => {
        if (!currentUser?._id) return;
        setRefreshing(true);
        try {
            const res = await axios.get(API_BASE);
            const houses = res.data?.houses || [];
            const ownedHouses = houses.filter((h: any) => h.owner?.id === currentUser._id);

            const flattened = ownedHouses.flatMap((house: any) =>
                (house.reviews?.entries || []).map((entry: any) => ({
                    ...entry,
                    propertyId: house._id,
                    propertyTitle: house.title,
                }))
            );

            setReviews(flattened);
            computeStats(flattened);
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to fetch reviews");
        } finally {
            setRefreshing(false);
        }
    }, [currentUser]);

    useEffect(() => {
        loadOwnerReviews();
    }, [currentUser, loadOwnerReviews]);

    const computeStats = (arr: any[]) => {
        const stars = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let sum = 0;
        arr.forEach((r) => {
            const val = Math.round(Number(r.rating)) || 0;
            if (val >= 1 && val <= 5) (stars as any)[val] += 1;
            sum += val;
        });
        setStats({
            total: arr.length,
            mean: arr.length ? parseFloat((sum / arr.length).toFixed(1)) : 0,
            stars,
        });
    };

    const filteredReviews = useMemo(() => {
        let result = [...reviews];
        if (searchQuery) {
            result = result.filter(r =>
                r.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.comment.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        if (activeFilter === "Unread") {
            result = result.filter(r => !r.replies || r.replies.length === 0);
        } else if (activeFilter === "Newest") {
            result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        return result;
    }, [reviews, searchQuery, activeFilter]);

    const handleReply = async (reviewId: string, propertyId: string, text: string) => {
        if (!text.trim()) return;
        try {
            const token = await AsyncStorage.getItem("userToken");
            const payload = {
                reviewId,
                userId: currentUser?._id,
                isAdmin: true,
                text: text.trim(),
                name: currentUser?.name,
                email: currentUser?.email,
                profileImg: currentUser?.profile,
            };
            await axios.post(`${API_BASE}/review/reply/${propertyId}`, payload, {
                headers: { Authorization: `Bearer ${token}` },
            });
            Alert.alert("Success", "Reply posted successfully!");
            loadOwnerReviews();
        } catch (err) {
            Alert.alert("Error", "Could not post reply");
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#13854c" /></View>;

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: "#F8F9FA" }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.mainContainer}>
                    <View style={styles.headerCont}>
                        <View style={styles.searchBar}>
                            <Ionicons name="search" size={20} color="#999" />
                            <TextInput
                                placeholder="Search property or keywords..."
                                style={styles.searchInput}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                returnKeyType="search"
                                onSubmitEditing={Keyboard.dismiss}
                            />
                        </View>
                        <View style={styles.filterRow}>
                            {["All", "Unread", "Newest"].map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    onPress={() => setActiveFilter(type)}
                                    style={[styles.filterBtn, activeFilter === type && styles.filterBtnActive]}
                                >
                                    <Text style={[styles.filterText, activeFilter === type && styles.filterTextActive]}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <ScrollView
                        style={styles.container}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        keyboardShouldPersistTaps="handled"
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={loadOwnerReviews} colors={["#13854c"]} tintColor="#13854c" />
                        }
                    >
                        <View style={styles.analyticsCard}>
                            <View style={styles.ratingOverview}>
                                <Text style={styles.bigRatingText}>{stats.mean}</Text>
                                <View style={styles.starRow}>
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Ionicons key={s} name="star" size={14} color={s <= stats.mean ? "#FFD700" : "#E0E0E0"} />
                                    ))}
                                </View>
                                <Text style={styles.totalReviewsText}>{stats.total} Reviews</Text>
                            </View>
                            <View style={styles.dividerVertical} />
                            <View style={styles.barSection}>
                                {[5, 4, 3, 2, 1].map((n) => {
                                    const pct = stats.total > 0 ? Math.round((stats.stars[n] / stats.total) * 100) : 0;
                                    return (
                                        <View key={n} style={styles.barRow}>
                                            <Text style={styles.barLabel}>{n}</Text>
                                            <View style={styles.barBase}>
                                                <View style={[styles.barFill, { width: `${pct}%` }]} />
                                            </View>
                                            <Text style={styles.barPct}>{pct}%</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {filteredReviews.length === 0 && !refreshing ? (
                            <View style={styles.emptyCont}>
                                <MaterialCommunityIcons name="comment-off-outline" size={50} color="#ccc" />
                                <Text style={styles.emptyText}>No reviews found</Text>
                            </View>
                        ) : (
                            filteredReviews.map((item) => (
                                <ReviewItem
                                    key={item._id || item.id}
                                    item={item}
                                    onReply={handleReply}
                                    onViewDetails={() => router.push({
                                        pathname: "../[propertyId]",
                                        params: {
                                            propertyId: item.propertyId,
                                            currentUser: currentUser?._id,
                                            ownerId: item.ownerId
                                        },
                                    })}
                                />
                            ))
                        )}
                    </ScrollView>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

function ReviewItem({ item, onReply, onViewDetails }: { item: any, onReply: any, onViewDetails: any }) {
    const [replyText, setReplyText] = useState("");
    const [isReplying, setIsReplying] = useState(false);
    const [userName, setUserName] = useState("");
    const [userProfile, setUserProfile] = useState("");
    const [loadingUser, setLoadingUser] = useState(true);
    const inputRef = useRef<TextInput>(null);

    const hasReply = item.replies && item.replies.length > 0;

    // Fetch user details exactly like the web file
    useEffect(() => {
        if (!item?.id) return;
        let isMounted = true;

        const fetchReviewer = async () => {
            try {
                // Step 1: Get user email via r.id
                const getuser = await axios.get(
                    `https://auth.vizit.homes/api/user/onlyme/${item.id}`
                );
                if (!getuser?.data?.getuser?.email) return;

                // Step 2: Get full profile via email
                const res = await axios.get(
                    `https://auth.vizit.homes/api/user/me/${getuser?.data?.getuser?.email}`
                );

                if (isMounted) {
                    setUserName(res.data?.user?.name || "");
                    setUserProfile(res.data?.user?.profile || "");
                }
            } catch (error) {
                console.error("Error fetching reviewer:", error);
            } finally {
                if (isMounted) setLoadingUser(false);
            }
        };

        fetchReviewer();
        return () => { isMounted = false; };
    }, [item?.id]);

    // Focus input when reply section opens
    useEffect(() => {
        if (isReplying) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isReplying]);

    return (
        <View style={styles.reviewCard}>
            {/* Property Title and "View Details" Link */}
            <View style={styles.propertyHeader}>
                <Text style={styles.propLabel} numberOfLines={1}>
                    Review for: <Text style={styles.propTitle}>{item.propertyTitle}</Text>
                </Text>
                <TouchableOpacity style={styles.viewBtn} onPress={onViewDetails}>
                    <Text style={styles.viewBtnText}>View</Text>
                    <Ionicons name="chevron-forward" size={14} color="#13854c" />
                </TouchableOpacity>
            </View>

            <View style={styles.reviewHeader}>
                <View style={styles.userIconCont}>
                    {userProfile ? (
                        <Image source={{ uri: userProfile }} style={styles.avatar} />
                    ) : (
                        <Text style={styles.userInitials}>
                            {loadingUser ? "..." : (userName || item.propertyTitle).charAt(0).toUpperCase()}
                        </Text>
                    )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.reviewerName} numberOfLines={1}>
                        {loadingUser ? "Loading..." : (userName || "Anonymous Guest")}
                    </Text>
                    <Text style={styles.reviewDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.pillRating}>
                    <Ionicons name="star" size={12} color="#13854c" />
                    <Text style={styles.pillText}>{item.rating}</Text>
                </View>
            </View>

            <Text style={styles.reviewComment}>{item.comment}</Text>

            {hasReply ? (
                <View style={styles.ownerReplyBox}>
                    <View style={styles.replyHeaderRow}>
                        <MaterialCommunityIcons name="subdirectory-arrow-right" size={16} color="#13854c" />
                        <Text style={styles.replyOwnerName}>Your Response</Text>
                    </View>
                    <Text style={styles.replyText}>{item.replies[0].text}</Text>
                </View>
            ) : (
                <View style={styles.actionArea}>
                    {!isReplying ? (
                        <TouchableOpacity style={styles.replyTrigger} onPress={() => setIsReplying(true)}>
                            <Ionicons name="chatbubble-outline" size={18} color="#13854c" />
                            <Text style={styles.replyTriggerText}>Write a reply</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.replyInputWrapper}>
                            <TextInput
                                ref={inputRef}
                                style={styles.replyInput}
                                placeholder="Type your response..."
                                value={replyText}
                                onChangeText={setReplyText}
                                multiline
                                blurOnSubmit={false}
                                returnKeyType="default"
                            />
                            <View style={styles.replyActions}>
                                <TouchableOpacity
                                    onPress={() => {
                                        setIsReplying(false);
                                        setReplyText("");
                                        Keyboard.dismiss();
                                    }}
                                >
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.sendBtn}
                                    onPress={() => {
                                        onReply(item._id || item.id, item.propertyId, replyText);
                                        setReplyText("");
                                        setIsReplying(false);
                                        Keyboard.dismiss();
                                    }}
                                >
                                    <Ionicons name="send" size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: "#F8F9FA" },
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
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
    filterRow: { flexDirection: "row", marginTop: 15 },
    filterBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, marginRight: 8, backgroundColor: "#F1F3F5" },
    filterBtnActive: { backgroundColor: "#13854c" },
    filterText: { fontSize: 13, color: "#666", fontWeight: "600" },
    filterTextActive: { color: "#FFF" },
    container: { flex: 1, padding: 15 },
    analyticsCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        flexDirection: "row",
        alignItems: "center",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        marginBottom: 20
    },
    ratingOverview: { alignItems: "center", paddingRight: 20 },
    bigRatingText: { fontSize: 42, fontWeight: "800", color: "#13854c" },
    starRow: { flexDirection: "row", marginVertical: 4 },
    totalReviewsText: { fontSize: 12, color: "#999" },
    dividerVertical: { width: 1, height: "80%", backgroundColor: "#EEE" },
    barSection: { flex: 1, paddingLeft: 20 },
    barRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    barLabel: { width: 12, fontSize: 11, color: "#666" },
    barBase: { flex: 1, height: 6, backgroundColor: "#F1F3F5", borderRadius: 3, marginHorizontal: 8, overflow: "hidden" },
    barFill: { height: "100%", backgroundColor: "#13854c", borderRadius: 3 },
    barPct: { width: 30, fontSize: 11, color: "#999", textAlign: "right" },
    reviewCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 15, elevation: 1 },
    propertyHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15, borderBottomWidth: 1, borderColor: "#F1F3F5", paddingBottom: 10 },
    propLabel: { fontSize: 12, color: "#999", flex: 1 },
    propTitle: { color: "#333", fontWeight: "bold" },
    viewBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#E8F5E9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    viewBtnText: { color: "#13854c", fontSize: 12, fontWeight: "600", marginRight: 2 },
    reviewHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    userIconCont: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: "#E8F5E9", justifyContent: "center", alignItems: "center", overflow: 'hidden' },
    avatar: { width: '100%', height: '100%' },
    userInitials: { color: "#13854c", fontWeight: "bold", fontSize: 18 },
    reviewerName: { fontSize: 15, fontWeight: "bold", color: "#333" },
    reviewDate: { fontSize: 12, color: "#999" },
    pillRating: { flexDirection: "row", alignItems: "center", backgroundColor: "#E8F5E9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    pillText: { color: "#13854c", fontWeight: "bold", fontSize: 12, marginLeft: 4 },
    reviewComment: { fontSize: 14, color: "#555", lineHeight: 20, marginBottom: 15 },
    ownerReplyBox: { backgroundColor: "#F8F9FA", padding: 12, borderRadius: 12, borderLeftWidth: 3, borderColor: "#13854c" },
    replyHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    replyOwnerName: { fontSize: 12, fontWeight: "bold", color: "#13854c", marginLeft: 6 },
    replyText: { fontSize: 13, color: "#444" },
    actionArea: { borderTopWidth: 1, borderColor: "#F1F3F5", paddingTop: 12 },
    replyTrigger: { flexDirection: "row", alignItems: "center" },
    replyTriggerText: { color: "#13854c", fontWeight: "600", fontSize: 13, marginLeft: 8 },
    replyInputWrapper: { backgroundColor: "#F1F3F5", borderRadius: 12, padding: 8 },
    replyInput: { fontSize: 14, minHeight: 60, textAlignVertical: "top", padding: 8, maxHeight: 120 },
    replyActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 8 },
    cancelText: { color: "#999", marginRight: 15, fontSize: 13 },
    sendBtn: { backgroundColor: "#13854c", padding: 8, borderRadius: 8 },
    emptyCont: { alignItems: "center", marginTop: 40 },
    emptyText: { color: "#999", marginTop: 10, fontSize: 16 }
});