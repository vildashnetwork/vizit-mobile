import React, { useEffect, useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    FlatList,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import * as Linking from 'expo-linking';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const BASE_URL = "https://vizit-backend-hubw.onrender.com";

/* ================= TYPES ================= */

type ReviewEntry = {
    id: string;
    name: string;
    profileImg: string;
    rating: number;
    comment: string;
    createdAt: string;
};

type House = {
    _id: string;
    title: string;
    type: string;
    image: string;
    images?: string[];
    description: string;
    rent: string;
    how: string;
    bedrooms: number;
    bathrooms: number;
    area_sqm: number;
    amenities: string[];

    location: {
        address: string;
        coordinates: {
            lat: number;
            lng: number;
        };
    };

    owner: {
        id: string;
        name: string;
        profile: string;
        email: string;
        verified?: boolean;
    };

    reviews: {
        overallRating: number;
        totalReviews: number;
        canEdit: boolean;
        entries: ReviewEntry[];
        images?: string[];
    };
};

/* ================= FULL SCREEN IMAGE MODAL WITH ZOOM ================= */

function FullScreenImageModal({
    visible,
    onClose,
    images,
    initialIndex
}: {
    visible: boolean;
    onClose: () => void;
    images: string[];
    initialIndex: number;
}) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const scrollViewRef = useRef<ScrollView>(null);

    const onScroll = (event: any) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        setCurrentIndex(index);
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <StatusBar hidden />
            <View style={styles.modalContainer}>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Ionicons name="close" size={30} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.imageCounter}>
                    {currentIndex + 1} / {images.length}
                </Text>

                <FlatList
                    data={images}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    initialScrollIndex={initialIndex}
                    getItemLayout={(_, index) => ({
                        length: width,
                        offset: width * index,
                        index,
                    })}
                    renderItem={({ item }) => (
                        <View style={styles.modalImageContainer}>
                            <ScrollView
                                maximumZoomScale={3.0}
                                minimumZoomScale={1.0}
                                showsHorizontalScrollIndicator={false}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.zoomScrollContent}
                                bouncesZoom={true}
                            >
                                <Image
                                    source={{ uri: item }}
                                    style={styles.modalImage}
                                    resizeMode="contain"
                                />
                            </ScrollView>
                        </View>
                    )}
                    keyExtractor={(_, index) => index.toString()}
                />
            </View>
        </Modal>
    );
}

/* ================= IMAGE CAROUSEL ================= */

function ImageCarousel({ images, onImagePress }: { images: string[]; onImagePress: (index: number) => void }) {
    const [activeIndex, setActiveIndex] = useState(0);

    const onScroll = (event: any) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        setActiveIndex(index);
    };

    return (
        <View style={styles.carouselContainer}>
            <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                renderItem={({ item, index }) => (
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => onImagePress(index)}
                        style={styles.carouselImageContainer}
                    >
                        <Image source={{ uri: item }} style={styles.carouselImage} />
                    </TouchableOpacity>
                )}
                keyExtractor={(_, index) => index.toString()}
            />

            {/* Pagination Dots */}
            {images.length > 1 && (
                <View style={styles.paginationContainer}>
                    {images.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.paginationDot,
                                i === activeIndex ? styles.activeDot : styles.inactiveDot,
                            ]}
                        />
                    ))}
                </View>
            )}

            {/* Image Count Badge */}
            <View style={styles.imageCountBadge}>
                <Ionicons name="images-outline" size={16} color="#fff" />
                <Text style={styles.imageCountText}>{images.length}</Text>
            </View>
        </View>
    );
}

/* ================= AMENITY ICON ================= */

function AmenityIcon({ name, size = 20 }: { name: string; size?: number }) {
    const iconMap: { [key: string]: { family: string; icon: string } } = {
        "WiFi": { family: "Ionicons", icon: "wifi" },
        "Parking": { family: "Ionicons", icon: "car" },
        "Pool": { family: "MaterialCommunityIcons", icon: "pool" },
        "Gym": { family: "MaterialCommunityIcons", icon: "dumbbell" },
        "AC": { family: "FontAwesome5", icon: "snowflake" },
        "Heating": { family: "Ionicons", icon: "fire" },
        "Laundry": { family: "MaterialCommunityIcons", icon: "washing-machine" },
        "Dishwasher": { family: "MaterialCommunityIcons", icon: "dishwasher" },
        "Pet Friendly": { family: "Ionicons", icon: "paw" },
        "Balcony": { family: "MaterialCommunityIcons", icon: "balcony" },
        "Garden": { family: "Ionicons", icon: "flower" },
        "Security": { family: "MaterialCommunityIcons", icon: "security" },
        "Elevator": { family: "MaterialCommunityIcons", icon: "elevator" },
        "Furnished": { family: "MaterialCommunityIcons", icon: "sofa" },
        "Fireplace": { family: "MaterialCommunityIcons", icon: "fireplace" },
    };

    const matched = iconMap[name] || { family: "Ionicons", icon: "help-circle" };

    switch (matched.family) {
        case 'Ionicons':
            return <Ionicons name={matched.icon} size={size} color="#10ca8c" />;
        case 'MaterialCommunityIcons':
            return <MaterialCommunityIcons name={matched.icon} size={size} color="#10ca8c" />;
        case 'FontAwesome5':
            return <FontAwesome5 name={matched.icon} size={size} color="#10ca8c" />;
        default:
            return <Ionicons name="help-circle" size={size} color="#10ca8c" />;
    }
}

/* ================= REVIEW ITEM ================= */

function ReviewItem({ review }: { review: ReviewEntry }) {
    const [expanded, setExpanded] = useState(false);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString();
    };

    const commentLength = review.comment?.length || 0;

    return (
        <View style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
                <View style={styles.reviewerInfo}>
                    <View style={styles.reviewerAvatar}>
                        {review.profileImg ? (
                            <Image source={{ uri: review.profileImg }} style={styles.avatarImage} />
                        ) : (
                            <Text style={styles.avatarText}>
                                {review.name?.charAt(0).toUpperCase() || "U"}
                            </Text>
                        )}
                    </View>
                    <View>
                        <Text style={styles.reviewerName}>{review.name || "Anonymous Guest"}</Text>
                        <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
                    </View>
                </View>
                <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.ratingText}>{review.rating}</Text>
                </View>
            </View>

            <Text style={styles.reviewComment} numberOfLines={expanded ? undefined : 5}>
                {review.comment}
            </Text>

            {commentLength > 150 && (
                <TouchableOpacity onPress={() => setExpanded(!expanded)}>
                    <Text style={styles.readMoreText}>
                        {expanded ? "Read less" : "Read more"}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

/* ================= MAIN SCREEN CONTENT ================= */

function PropertyDetailScreenContent() {
    const insets = useSafeAreaInsets();
    const { propertyId, currentUser, ownerId } =
        useLocalSearchParams<{
            propertyId: string;
            currentUser: string;
            ownerId: string;
        }>();

    const [loading, setLoading] = useState(true);
    const [property, setProperty] = useState<House | null>(null);
    const [fullScreenVisible, setFullScreenVisible] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [ownerData, setOwnerData] = useState<any>(null);
    const [loadingOwner, setLoadingOwner] = useState(false);

    /* ================= FETCH PROPERTY ================= */

    const fetchProperty = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${BASE_URL}/api/house/houses/${propertyId}`);
            setProperty(res.data.house);

            // Fetch owner details if available
            if (res.data.house?.owner?.email) {
                fetchOwnerDetails(res.data.house.owner.email);
            }
        } catch (err: any) {
            Alert.alert("Error", "Failed to load property");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchOwnerDetails = async (email: string) => {
        try {
            setLoadingOwner(true);
            const res = await axios.get(`${BASE_URL}/api/user/me/${email}`);
            setOwnerData(res.data.user);
        } catch (err) {
            console.error("Failed to fetch owner details:", err);
        } finally {
            setLoadingOwner(false);
        }
    };

    useEffect(() => {
        if (propertyId) fetchProperty();
    }, [propertyId]);

    /* ================= HANDLE IMAGE PRESS ================= */

    const handleImagePress = (index: number) => {
        setSelectedImageIndex(index);
        setFullScreenVisible(true);
    };

    /* ================= OPEN IN GOOGLE MAPS ================= */

    const openInGoogleMaps = () => {
        if (!property?.location?.coordinates) return;

        const { lat, lng } = property.location.coordinates;
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        Linking.openURL(url);
    };

    /* ================= FORMAT ADDRESS ================= */

    const formatAddress = (address: string) => {
        if (!address) return "";
        const parts = address.split(/[0#&\(=*]/);
        const firstPart = parts[0]?.replace(/^0+/, "");
        const aroundPart = parts[5] ? "Around " + parts[5] : "";
        const extraPart = parts[6] || "";
        return firstPart + (aroundPart ? " " + aroundPart : "") + (extraPart ? " " + extraPart : "");
    };

    /* ================= LOADING ================= */

    if (loading) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color="#10ca8c" />
            </View>
        );
    }

    if (!property) {
        return (
            <View style={[styles.center, { paddingTop: insets.top }]}>
                <Ionicons name="home-outline" size={60} color="#ccc" />
                <Text style={styles.notFoundText}>Property not found</Text>
            </View>
        );
    }

    // Get all images
    const allImages = property.reviews?.images?.length
        ? property.reviews.images
        : property.images?.length
            ? property.images
            : property.image
                ? [property.image]
                : [];

    const isOwner = currentUser === property.owner.id;

    /* ================= UI ================= */

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Image Carousel */}
                    {allImages.length > 0 && (
                        <ImageCarousel images={allImages} onImagePress={handleImagePress} />
                    )}

                    {/* Property Details Card */}
                    <View style={styles.card}>
                        <View style={styles.titleRow}>
                            <Text style={styles.title}>{property.title}</Text>
                            <View style={styles.typeBadge}>
                                <Text style={styles.typeText}>{property.type}</Text>
                            </View>
                        </View>

                        <View style={styles.locationRow}>
                            <Ionicons name="location-outline" size={18} color="#10ca8c" />
                            <Text style={styles.location} numberOfLines={2}>
                                {formatAddress(property.location.address)}
                            </Text>
                        </View>

                        <View style={styles.priceRow}>
                            <Text style={styles.price}>
                                {parseInt(property.rent).toLocaleString()} FCFA
                            </Text>
                            <Text style={styles.pricePeriod}>/{property.how}</Text>
                        </View>

                        {/* Quick Stats */}
                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <Ionicons name="bed-outline" size={20} color="#10ca8c" />
                                <Text style={styles.statText}>{property.bedrooms} beds</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Ionicons name="water-outline" size={20} color="#10ca8c" />
                                <Text style={styles.statText}>{property.bathrooms} baths</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <MaterialCommunityIcons name="ruler" size={20} color="#10ca8c" />
                                <Text style={styles.statText}>{property.area_sqm} m²</Text>
                            </View>
                        </View>
                    </View>

                    {/* Owner Info Card */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Property Owner</Text>
                        <View style={styles.ownerContainer}>
                            <View style={styles.ownerAvatar}>
                                {ownerData?.profile || property.owner.profile ? (
                                    <Image
                                        source={{ uri: ownerData?.profile || property.owner.profile }}
                                        style={styles.ownerAvatarImage}
                                    />
                                ) : (
                                    <Text style={styles.ownerAvatarText}>
                                        {property.owner.name?.charAt(0).toUpperCase()}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.ownerInfo}>
                                <View style={styles.ownerNameRow}>
                                    <Text style={styles.ownerName}>{property.owner.name.length > 10 ? property.owner.name.slice(0, 10) + ".." : property.owner.name}</Text>
                                    {ownerData?.verified ? (
                                        <View style={styles.verifiedBadge}>
                                            <MaterialCommunityIcons name="check-decagram" size={16} color="#10ca8c" />
                                            <Text style={styles.verifiedText}>Verified</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.unverifiedBadge}>
                                            <MaterialCommunityIcons name="lock-off-outline" size={14} color="#999" />
                                            <Text style={styles.unverifiedText}>Not Verified</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.ownerEmail}>{property.owner.email}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Description Card */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={styles.description}>{property.description}</Text>
                    </View>

                    {/* Amenities Card */}
                    {property.amenities && property.amenities.length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Amenities</Text>
                            <View style={styles.amenitiesGrid}>
                                {property.amenities.map((amenity, index) => (
                                    <View key={index} style={styles.amenityItem}>
                                        <AmenityIcon name={amenity} size={20} />
                                        <Text style={styles.amenityText}>{amenity}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Map Link Card */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Location</Text>
                        <TouchableOpacity style={styles.mapButton} onPress={openInGoogleMaps}>
                            <Ionicons name="map-outline" size={20} color="#10ca8c" />
                            <Text style={styles.mapButtonText}>View in Google Maps</Text>
                        </TouchableOpacity>
                        <Text style={styles.coordinatesText}>
                            {property.location.coordinates.lat.toFixed(6)}, {property.location.coordinates.lng.toFixed(6)}
                        </Text>
                    </View>

                    {/* Reviews Card */}
                    <View style={[styles.card, styles.lastCard]}>
                        <View style={styles.reviewsHeader}>
                            <Text style={styles.sectionTitle}>Reviews</Text>
                            <View style={styles.ratingSummary}>
                                <Ionicons name="star" size={18} color="#FFD700" />
                                <Text style={styles.ratingAverage}>{property.reviews.overallRating}</Text>
                                <Text style={styles.ratingTotal}>({property.reviews.totalReviews})</Text>
                            </View>
                        </View>

                        {property.reviews.entries.length === 0 ? (
                            <View style={styles.emptyReviews}>
                                <MaterialCommunityIcons name="comment-off-outline" size={40} color="#ccc" />
                                <Text style={styles.emptyReviewsText}>No reviews yet</Text>
                            </View>
                        ) : (
                            property.reviews.entries.map((review, index) => (
                                <ReviewItem key={index} review={review} />
                            ))
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Full Screen Image Modal with Zoom */}
            <FullScreenImageModal
                visible={fullScreenVisible}
                onClose={() => setFullScreenVisible(false)}
                images={allImages}
                initialIndex={selectedImageIndex}
            />
        </View>
    );
}

/* ================= MAIN SCREEN ================= */

export default function PropertyDetailScreen() {
    return (
        <SafeAreaProvider>
            <PropertyDetailScreenContent />
        </SafeAreaProvider>
    );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    notFoundText: {
        marginTop: 10,
        fontSize: 16,
        color: "#666",
    },

    /* ===== Carousel ===== */
    carouselContainer: {
        position: 'relative',
        width: width,
        height: 300,
        backgroundColor: '#000',
    },
    carouselImageContainer: {
        width: width,
        height: 300,
    },
    carouselImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    paginationContainer: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 15,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    activeDot: {
        backgroundColor: '#10ca8c',
        width: 12,
    },
    inactiveDot: {
        backgroundColor: 'rgba(255,255,255,0.6)',
    },
    imageCountBadge: {
        position: 'absolute',
        top: 15,
        right: 15,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 5,
    },
    imageCountText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },

    /* ===== Cards ===== */
    card: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    lastCard: {
        marginBottom: 20,
    },

    /* ===== Title Section ===== */
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a1a1a',
        flex: 1,
        marginRight: 10,
    },
    typeBadge: {
        backgroundColor: '#e8f5e9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    typeText: {
        color: '#10ca8c',
        fontSize: 12,
        fontWeight: '600',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    location: {
        flex: 1,
        fontSize: 14,
        color: '#666',
        marginLeft: 6,
        lineHeight: 20,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 16,
    },
    price: {
        fontSize: 24,
        fontWeight: '700',
        color: '#10ca8c',
    },
    pricePeriod: {
        fontSize: 14,
        color: '#999',
        marginLeft: 4,
    },

    /* ===== Stats ===== */
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 12,
    },
    statItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    statDivider: {
        width: 1,
        height: '100%',
        backgroundColor: '#e0e0e0',
    },
    statText: {
        fontSize: 14,
        color: '#444',
        fontWeight: '500',
    },

    /* ===== Owner ===== */
    ownerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ownerAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        overflow: 'hidden',
    },
    ownerAvatarImage: {
        width: '100%',
        height: '100%',
    },
    ownerAvatarText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#10ca8c',
    },
    ownerInfo: {
        flex: 1,
    },
    ownerNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    ownerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    verifiedText: {
        fontSize: 11,
        color: '#10ca8c',
        fontWeight: '600',
    },
    unverifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    unverifiedText: {
        fontSize: 11,
        color: '#999',
        fontWeight: '600',
    },
    ownerEmail: {
        fontSize: 13,
        color: '#666',
    },

    /* ===== Description ===== */
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    description: {
        fontSize: 14,
        color: '#555',
        lineHeight: 22,
    },

    /* ===== Amenities ===== */
    amenitiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    amenityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    amenityText: {
        fontSize: 13,
        color: '#555',
    },

    /* ===== Map ===== */
    mapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    mapButtonText: {
        fontSize: 14,
        color: '#10ca8c',
        fontWeight: '500',
    },
    coordinatesText: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },

    /* ===== Reviews ===== */
    reviewsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    ratingSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingAverage: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginLeft: 4,
    },
    ratingTotal: {
        fontSize: 14,
        color: '#999',
    },
    emptyReviews: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    emptyReviewsText: {
        marginTop: 10,
        fontSize: 14,
        color: '#999',
    },
    reviewItem: {
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 16,
        marginTop: 16,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    reviewerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    reviewerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#10ca8c',
    },
    reviewerName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    reviewDate: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff9e6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#f59e0b',
    },
    reviewComment: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
    readMoreText: {
        color: '#10ca8c',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 8,
    },

    /* ===== Modal ===== */
    modalContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageCounter: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    modalImageContainer: {
        width: width,
        height: height,
        backgroundColor: '#000',
    },
    zoomScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: width,
        height: height,
    },
    modalImage: {
        width: width,
        height: height,
    },
});