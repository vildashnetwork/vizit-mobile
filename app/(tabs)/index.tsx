import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TextInput,
  Keyboard,
} from "react-native";
import { View, Text } from "@/components/Themed";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Dimensions } from "react-native";
import { debounce } from "lodash";

/* =========================
   TYPES
========================= */

type Property = {
  reviews: any;
  _id: string;
  title: string;
  type: string;
  rent: number;
  how?: string;
  likes?: number;
  views?: number;
  image?: string;
  images?: string[];
  amenities?: string[];
  location?: {
    city?: string;
    address?: string;
  };
  owner?: {
    id?: string;
    verified?: boolean;
    email?: string;
  };
  isAvalable?: boolean; // Added this field
};

/* =========================
   FILTERS
========================= */

const FILTERS = [
  { key: "all", label: "All", icon: "home-city" },
  { key: "hotel", label: "Hotels", icon: "bed" },
  { key: "guest house", label: "Guest House", icon: "home-account" },
  { key: "apartment", label: "Apartments", icon: "office-building" },
];

/* =========================
   SCREEN
========================= */
const { width } = Dimensions.get('window');

export default function TabOneScreen() {
  const [houses, setHouses] = useState<Property[]>([]);
  const [filteredHouses, setFilteredHouses] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Fetch and sort listings with verified status
  const fetchAndSortListings = async (rawListings: Property[]) => {
    try {
      const updatedListings = await Promise.all(
        rawListings.map(async (item) => {
          try {
            // Check if owner email exists
            if (item.owner?.email) {
              const res = await axios.get(
                `https://auth.vizit.homes/api/user/me/${item.owner.email}`
              );
              return {
                ...item,
                owner: {
                  ...item.owner,
                  verified: res.data.user?.verified || false
                }
              };
            }
            return { ...item, owner: { ...item.owner, verified: false } };
          } catch (err) {
            return { ...item, owner: { ...item.owner, verified: false } };
          }
        })
      );

      // Sort: verified first, then unverified
      return updatedListings.sort((a, b) => {
        const aVerified = a.owner?.verified || false;
        const bVerified = b.owner?.verified || false;
        return (bVerified ? 1 : 0) - (aVerified ? 1 : 0);
      });
    } catch (error) {
      console.error("Error sorting listings:", error);
      return rawListings;
    }
  };

  // Fetch houses
  const fetchHouses = async () => {
    try {
      const res = await axios.get(
        "https://auth.vizit.homes/api/house/houses"
      );
      const rawHouses = res.data.houses || [];
      const sortedHouses = await fetchAndSortListings(rawHouses);
      setHouses(sortedHouses);
      applyFilters(sortedHouses, activeFilter, searchQuery);
    } catch (err) {
      console.error("Failed to fetch houses", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHouses();
  }, []);

  // Apply filters and search - MODIFIED TO ONLY SHOW AVAILABLE HOUSES
  const applyFilters = useCallback(
    (housesList: Property[], filter: string, query: string) => {
      // First filter to only show available houses
      let availableHouses = housesList.filter(house => house.isAvalable === true);

      // Then apply type filter
      if (filter !== "all") {
        availableHouses = availableHouses.filter(
          (h) =>
            h.type && h.type.toLowerCase().includes(filter.toLowerCase())
        );
      }

      // Apply search query
      if (query.trim() !== "") {
        const searchLower = query.toLowerCase().trim();
        availableHouses = availableHouses.filter((item) => {
          const titleMatch = item.title?.toLowerCase().includes(searchLower);
          const locationMatch = item.location?.address?.toLowerCase().includes(searchLower);
          const typeMatch = item.type?.toLowerCase().includes(searchLower);
          const amenitiesMatch = item.amenities?.some(a =>
            a.toLowerCase().includes(searchLower)
          );

          return titleMatch || locationMatch || typeMatch || amenitiesMatch;
        });
      }

      setFilteredHouses(availableHouses);
      setIsSearching(false);
    },
    []
  );

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      applyFilters(houses, activeFilter, query);
    }, 500),
    [houses, activeFilter]
  );

  // Handle search input change
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setIsSearching(true);
    debouncedSearch(text);
  };

  // Handle filter change
  const handleFilterChange = (filterKey: string) => {
    setActiveFilter(filterKey);
    applyFilters(houses, filterKey, searchQuery);
  };

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHouses();
  }, []);

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    applyFilters(houses, activeFilter, "");
    Keyboard.dismiss();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="teal" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, location, type..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            onSubmitEditing={() => applyFilters(houses, activeFilter, searchQuery)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* FILTER BAR */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {FILTERS.map((f) => {
          const active = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterBtn,
                active && styles.filterBtnActive,
              ]}
              onPress={() => handleFilterChange(f.key)}
            >
              <MaterialCommunityIcons
                name={f.icon}
                size={18}
                color={active ? "#fff" : "#414141"}
              />
              <Text
                style={[
                  styles.filterText,
                  active && styles.filterTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Results count */}
      {!isSearching && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {filteredHouses.length} {filteredHouses.length === 1 ? 'property' : 'properties'} found
          </Text>
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* PROPERTY LIST */}
      <FlatList
        data={filteredHouses}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 90, marginTop: 5 }}
        renderItem={({ item, index }) => (
          <PropertyCard
            property={item}
            isFirstVerified={index === 0 && item.owner?.verified}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["teal"]}
            tintColor="teal"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {isSearching ? (
              <ActivityIndicator size="small" color="teal" />
            ) : (
              <>
                <Ionicons name="business-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyTitle}>No available properties found</Text>
                <Text style={styles.emptySubtitle}>
                  Try adjusting your filters or check back later
                </Text>
              </>
            )}
          </View>
        }
        ListHeaderComponent={
          isSearching ? (
            <View style={styles.searchingContainer}>
              <ActivityIndicator size="small" color="teal" />
              <Text style={styles.searchingText}>Searching...</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

/* =========================
   PROPERTY CARD
========================= */

function PropertyCard({ property, isFirstVerified }: { property: Property; isFirstVerified?: boolean }) {
  const imagesToDisplay = property.reviews?.images || [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [user, setUser] = useState<any>(null);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setActiveIndex(index);
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) return;
        const res = await axios.get(
          "https://auth.vizit.homes/api/owner/decode/token/owner",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.status === 200) setUser(res.data.user);
      } catch (err) {
        console.error("Token error:", err);
      }
    };
    fetchUser();
  }, []);

  const splted = property.location?.address?.split(/[0#&\(=*]/);
  const result = splted ? splted[0] + "  " + (splted[5] ? "Around " + splted[5] : "") : "";
  const isVerified = property.owner?.verified === true;

  return (
    <View style={styles.card}>
      {/* Verified Badge - Show if first verified */}
      {isFirstVerified && (
        <View style={styles.topVerifiedBadge}>
          <MaterialCommunityIcons name="check-decagram" size={16} color="#13854c" />
          <Text style={styles.topVerifiedText}>Top Verified</Text>
        </View>
      )}

      {/* SLIDING CAROUSEL */}
      <View style={styles.sliderContainer}>
        {/* The Badge */}
        <View style={[
          styles.badgeContainer,
          !isVerified && styles.unverifiedBadge
        ]}>
          <MaterialCommunityIcons
            name={isVerified ? "check-decagram" : "lock-off-outline"}
            size={16}
            color={isVerified ? "#13854c" : "#666"}
          />
          <Text style={[
            styles.badgeText,
            { color: isVerified ? "#13854c" : "#666" }
          ]}>
            {isVerified ? "Vizit Verified" : "Not Verified"}
          </Text>
        </View>

        {imagesToDisplay.length > 0 ? (
          <>
            <FlatList
              data={imagesToDisplay}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              keyExtractor={(_, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={styles.imageSlide}>
                  <Image
                    source={{ uri: item }}
                    style={styles.fullImage}
                    resizeMode="cover"
                  />
                </View>
              )}
            />

            {/* PAGINATION DOTS */}
            <View style={styles.pagination}>
              {imagesToDisplay.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    activeIndex === i ? styles.activeDot : styles.inactiveDot
                  ]}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={40} color="#9ca3af" />
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardHead}>
          <Text style={styles.title}>
            {property.title.length > 100 ? property.title.slice(0, 100) + "..." :
              property.title.slice(0, 100)}
          </Text>
          <Text style={styles.meta}>
            {property.type} • {result}
          </Text>
        </View>

        <View style={styles.priceBox}>
          <Text style={styles.price}>{Number(property.rent).toLocaleString()} FCFA</Text>
          <Text style={styles.priceSub}>per {property.how}</Text>
        </View>
      </View>

      {/* AMENITIES */}
      <View style={styles.amenities}>
        {property.amenities?.slice(0, 3).map((a, i) => (
          <View key={i} style={styles.chip}>
            <Text style={styles.chipText}>{a}</Text>
          </View>
        ))}
        {property.amenities && property.amenities.length > 3 && (
          <Text style={styles.more}>+{property.amenities.length - 3} more</Text>
        )}
      </View>

      {/* BUTTON */}
      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.push({
          pathname: "../Property",
          params: { propertyId: property._id, currentUser: user?._id, ownerId: property.owner?.id },
        })}
      >
        <Text style={styles.btnText}>View Details</Text>
        <Ionicons name="chevron-forward" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  imageSlide: {
    width: width,
    position: 'relative',
  },
  fullImage: {
    width: '100%',
    height: 300,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: { backgroundColor: '#13854c' },
  inactiveDot: { backgroundColor: 'rgba(255,255,255,0.5)' },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  /* SEARCH BAR */
  searchContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    height: "100%",
  },
  clearButton: {
    padding: 4,
  },
  /* FILTERS */
  filterBar: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: "#fff",
  },
  filterBtn: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    height: 38,
  },
  filterBtnActive: {
    backgroundColor: "teal",
  },
  filterText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  filterTextActive: {
    color: "#fff",
  },
  /* RESULTS */
  resultsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  resultsText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  clearText: {
    fontSize: 14,
    color: "teal",
    fontWeight: "600",
  },
  searchingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    backgroundColor: "#fff",
    gap: 8,
  },
  searchingText: {
    fontSize: 14,
    color: "#666",
  },
  /* LIST */
  empty: {
    alignItems: "center",
    marginTop: 80,
    backgroundColor: "transparent",
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  /* CARD */
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  topVerifiedBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#13854c33",
    zIndex: 20,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  topVerifiedText: {
    fontSize: 11,
    color: "#13854c",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  cardBody: {
    padding: 14,
    backgroundColor: "#ffffff",
  },
  cardHead: {
    marginBottom: 6,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
    textTransform: "capitalize",
  },
  priceBox: {
    alignItems: "flex-end",
    backgroundColor: "#ffffff",
    marginTop: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: "800",
    color: "teal",
  },
  priceSub: {
    fontSize: 12,
    color: "#6b7280",
  },
  amenities: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#ffffff",
    gap: 6,
    marginVertical: 8,
    paddingHorizontal: 14,
  },
  chip: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    color: "#374151",
  },
  more: {
    fontSize: 12,
    color: "#6b7280",
    alignSelf: "center",
  },
  stats: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    gap: 16,
    marginTop: 6,
    marginBottom: 10,
  },
  unverifiedBadge: {
    borderColor: '#66666633',
    backgroundColor: 'rgba(230, 230, 230, 0.95)',
  },
  stat: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "teal",
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 14,
    marginBottom: 14,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  sliderContainer: {
    position: 'relative',
    width: width,
    height: 300,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: 15,
    right: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#13854c33',
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  pagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 15,
    alignSelf: 'center',
    backgroundColor: "transparent",
    zIndex: 10,
  },
});