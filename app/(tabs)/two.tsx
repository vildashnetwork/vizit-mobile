import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  Keyboard
} from "react-native";
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from "axios";
import { Text, View } from '@/components/Themed';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-av';

const { width } = Dimensions.get('window');
const API_BASE = "https://vizit-backend-hubw.onrender.com/api/house";

// Property Types with Icons
const propertyTypes = [
  { value: "Apartment", icon: "laptop-house", family: "FontAwesome5" },
  { value: "Guest House", icon: "home", family: "Ionicons" },
  { value: "Hotel", icon: "hotel", family: "FontAwesome5" },
  { value: "Modern Room", icon: "cube", family: "Ionicons" },
  { value: "Studio", icon: "palette", family: "MaterialCommunityIcons" },
  { value: "Villa", icon: "warehouse", family: "FontAwesome5" },
  { value: "Penthouse", icon: "lighthouse-on", family: "MaterialCommunityIcons" },
  { value: "Townhouse", icon: "warehouse", family: "MaterialCommunityIcons" }
];

// Amenities Options with Icons
const amenityOptions = [
  { name: "WiFi", icon: "wifi", family: "Ionicons" },
  { name: "Parking", icon: "car", family: "Ionicons" },
  { name: "Pool", icon: "pool", family: "MaterialCommunityIcons" },
  { name: "Gym", icon: "dumbbell", family: "MaterialCommunityIcons" },
  { name: "AC", icon: "snowflake", family: "FontAwesome5" },
  { name: "Heating", icon: "fire", family: "Ionicons" },
  { name: "Laundry", icon: "washing-machine", family: "MaterialCommunityIcons" },
  { name: "Dishwasher", icon: "dishwasher", family: "MaterialCommunityIcons" },
  { name: "Pet Friendly", icon: "paw", family: "Ionicons" },
  { name: "Balcony", icon: "balcony", family: "MaterialCommunityIcons" },
  { name: "Garden", icon: "flower", family: "Ionicons" },
  { name: "Security", icon: "security", family: "MaterialCommunityIcons" },
  { name: "Elevator", icon: "elevator", family: "MaterialCommunityIcons" },
  { name: "Furnished", icon: "sofa", family: "MaterialCommunityIcons" },
  { name: "Fireplace", icon: "fireplace", family: "MaterialCommunityIcons" }
];

const getIcon = (amenity) => {
  const iconMap = {
    "WiFi": { name: "wifi", family: "Ionicons" },
    "Parking": { name: "car", family: "Ionicons" },
    "Pool": { name: "pool", family: "MaterialCommunityIcons" },
    "Gym": { name: "dumbbell", family: "MaterialCommunityIcons" },
    "AC": { name: "snowflake", family: "FontAwesome5" },
    "Heating": { name: "heating-coil", family: "MaterialCommunityIcons" },
    "Laundry": { name: "washing-machine", family: "MaterialCommunityIcons" },
    "Dishwasher": { name: "dishwasher", family: "MaterialCommunityIcons" },
    "Pet Friendly": { name: "paw", family: "Ionicons" },
    "Balcony": { name: "balcony", family: "MaterialCommunityIcons" },
    "Garden": { name: "flower", family: "Ionicons" },
    "Security": { name: "security", family: "MaterialCommunityIcons" },
    "Elevator": { name: "elevator", family: "MaterialCommunityIcons" },
    "Furnished": { name: "sofa", family: "MaterialCommunityIcons" },
    "Fireplace": { name: "fireplace", family: "MaterialCommunityIcons" }
  };
  return iconMap[amenity] || { name: "help-circle", family: "Ionicons" };
};

export default function CreatePropertyScreen() {
  const router = useRouter();
  const scrollViewRef = useRef(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const [formData, setFormData] = useState({
    title: "",
    type: "Apartment",
    rent: "",
    address: "",
    lat: 0,
    lng: 0,
    bedrooms: 1,
    bathrooms: 1,
    area_sqm: 50,
    description: "",
    media: [],
    how: "month",
  });

  const steps = ["Basic", "Details", "Ame..", "Media", "Review"];

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardOffset(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardOffset(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Get User Data
  useEffect(() => {
    const getUserData = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          console.warn("No token found");
          setLoading(false);
          return;
        }

        const response = await axios.get(
          `https://vizit-backend-hubw.onrender.com/api/owner/decode/token/owner`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.status === 200) {
          setUser(response.data.res);
        }
      } catch (error) {
        console.error("Failed to decode token:", error);
        Alert.alert("Error", "Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    getUserData();
  }, []);

  // Get Location on Mount
  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          "Location Required",
          "We need your location to set the property address automatically. You can also enter it manually.",
          [
            { text: "Enter Manually", onPress: () => { } },
            { text: "Try Again", onPress: getLocation }
          ]
        );
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      const { latitude, longitude } = location.coords;

      const response = await axios.get(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=28065c9b690540718c37d7f07710a51c`
      );

      if (response.data.features && response.data.features[0]) {
        const properties = response.data.features[0].properties;
        const address = `${properties.address_line1 || ''}, ${properties.city || properties.suburb || ''}, ${properties.country || ''}`;

        setFormData(prev => ({
          ...prev,
          lat: latitude,
          lng: longitude,
          address: address.trim()
        }));
      }
    } catch (error) {
      console.error("Location error:", error);
      Alert.alert("Error", "Failed to get your location. Please enter address manually.");
    }
  };

  // Media Upload Handler
  const pickMedia = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your media library.");
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets.length > 0) {
        setUploading(true);

        const uploads = await Promise.all(
          result.assets.map(async (asset) => {
            const isVideo = asset.type === 'video';
            const uploadPreset = isVideo ? "vizit-video" : "vizit-image";

            const formData = new FormData();

            // @ts-ignore
            formData.append("file", {
              uri: asset.uri,
              type: isVideo ? 'video/mp4' : 'image/jpeg',
              name: `upload.${isVideo ? 'mp4' : 'jpg'}`
            });

            formData.append("upload_preset", uploadPreset);

            const response = await axios.post(
              `https://api.cloudinary.com/v1_1/dgigs6v72/${isVideo ? "video" : "image"}/upload`,
              formData,
              {
                headers: {
                  'Content-Type': 'multipart/form-data'
                },
                timeout: 30000
              }
            );

            return {
              url: response.data.secure_url,
              type: isVideo ? "video" : "image",
              thumbnail: isVideo ? await generateThumbnail(asset.uri) : null
            };
          })
        );

        setFormData(prev => ({
          ...prev,
          media: [...prev.media, ...uploads]
        }));

        Alert.alert("Success", "Media uploaded successfully!");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      Alert.alert("Upload Failed", "Failed to upload media. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const generateThumbnail = async (videoUri) => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000,
      });
      return uri;
    } catch (e) {
      console.log('Could not generate thumbnail', e);
      return null;
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your camera.");
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled) {
        handleMediaUpload([result.assets[0]]);
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to use camera.");
    }
  };

  const removeMedia = (index) => {
    Alert.alert(
      "Remove Media",
      "Are you sure you want to remove this item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setFormData(prev => ({
              ...prev,
              media: prev.media.filter((_, i) => i !== index)
            }));
          }
        }
      ]
    );
  };

  const handleAmenityToggle = (amenity) => {
    setSelectedAmenities(prev => {
      if (prev.includes(amenity)) {
        return prev.filter(a => a !== amenity);
      } else {
        return [...prev, amenity];
      }
    });
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.rent || !formData.address) {
      Alert.alert("Validation Error", "Title, Rent, and Address are required");
      return;
    }

    if (formData.media.length === 0) {
      Alert.alert("Validation Error", "Please upload at least one image or video");
      return;
    }

    if (!user) {
      Alert.alert("Error", "You must be logged in to create a listing");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        owner: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          location: user.location,
          profile: user.profile,
        },
        type: formData.type,
        title: formData.title,
        rent: Number(formData.rent),
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        area_sqm: Number(formData.area_sqm),
        location: {
          address: formData.address,
          coordinates: {
            lat: Number(formData.lat) || 0,
            lng: Number(formData.lng) || 0,
          },
        },
        amenities: selectedAmenities,
        description: formData.description,
        how: formData.how,
        reviews: {
          images: formData.media.map(m => m.url),
        },
        minimumduration: "1 day",
        isAvalable: true,
        image: formData.media[0]?.url || "",
      };

      const token = await AsyncStorage.getItem("token");

      const response = await axios.post(
        `${API_BASE}/houses`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      Alert.alert(
        "Success!",
        "Your property has been listed successfully.",
        [
          {
            text: "View Listings",
            onPress: () => router.push("/listings")
          }
        ]
      );

      setFormData({
        title: "",
        type: "Apartment",
        rent: "",
        address: "",
        lat: 0,
        lng: 0,
        bedrooms: 1,
        bathrooms: 1,
        area_sqm: 50,
        description: "",
        media: [],
        how: "month",
      });
      setSelectedAmenities([]);
      setActiveStep(0);

    } catch (error) {
      console.error("Create house failed:", error);
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to create listing. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const prevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const renderIcon = (family, name, size, color) => {
    switch (family) {
      case 'Ionicons':
        return <Ionicons name={name} size={size} color={color} />;
      case 'MaterialCommunityIcons':
        return <MaterialCommunityIcons name={name} size={size} color={color} />;
      case 'FontAwesome5':
        return <FontAwesome5 name={name} size={size} color={color} />;
      default:
        return <Ionicons name={name} size={size} color={color} />;
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <TouchableOpacity
            style={styles.stepItem}
            onPress={() => setActiveStep(index)}
          >
            <View style={[
              styles.stepCircle,
              index <= activeStep ? styles.activeStepCircle : styles.inactiveStepCircle
            ]}>
              <Text style={[
                styles.stepCircleText,
                index <= activeStep ? styles.activeStepCircleText : styles.inactiveStepCircleText
              ]}>
                {index + 1}
              </Text>
            </View>
            <Text style={[
              styles.stepLabel,
              index === activeStep && styles.activeStepLabel
            ]}>
              {step}
            </Text>
          </TouchableOpacity>
          {index < steps.length - 1 && (
            <View style={[
              styles.stepConnector,
              index < activeStep && styles.activeConnector
            ]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
  const options = ["day", "month", "night"];
  const renderBasicInfo = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>Basic Information</Text>
      <Text style={styles.sectionSubtitle}>Tell us about your property</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Property Title <Text style={styles.required}>*</Text></Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="home-outline" size={20} color="#10ca8c" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="e.g. Luxury Apartment with Ocean View"
            placeholderTextColor="#999"
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Property Type</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.typeScroll}
        >
          {propertyTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeChip,
                formData.type === type.value && styles.selectedTypeChip
              ]}
              onPress={() => setFormData({ ...formData, type: type.value })}
            >
              {renderIcon(
                type.family,
                type.icon,
                18,
                formData.type === type.value ? "#fff" : "#666"
              )}
              <Text style={[
                styles.typeChipText,
                formData.type === type.value && styles.selectedTypeChipText
              ]}>
                {type.value}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={styles.label}>Rent (XAF) <Text style={styles.required}>*</Text></Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="cash-outline" size={20} color="#10ca8c" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="250000"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={formData.rent}
              onChangeText={(text) => setFormData({ ...formData, rent: text })}
            />
          </View>
        </View>

        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Period <Text style={styles.required}>*</Text></Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="calendar-outline" size={20} color="#10ca8c" style={styles.inputIcon} />

            <View style={styles.typeScrollme}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.selectButton,
                    formData.how === option && styles.selectButtonActive
                  ]}
                  onPress={() => setFormData({ ...formData, how: option })}
                >
                  <Text style={[
                    styles.selectText,
                    formData.how === option && styles.selectTextActive
                  ]}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Address <Text style={styles.required}>*</Text></Text>
        <View style={styles.addressContainer}>
          <View style={[styles.inputWrapper, { flex: 1, marginRight: 10 }]}>
            <Ionicons name="location-outline" size={20} color="#10ca8c" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.addressInput]}
              placeholder="Property address"
              placeholderTextColor="#999"
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              multiline
            />
          </View>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={getLocation}
          >
            <Ionicons name="locate" size={24} color="#10ca8c" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderDetails = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>Property Details</Text>
      <Text style={styles.sectionSubtitle}>Tell us more about your space</Text>

      <View style={styles.counterCard}>
        <View style={styles.counterRow}>
          <View style={styles.counterInfo}>
            <Ionicons name="bed-outline" size={24} color="#10ca8c" />
            <Text style={styles.counterLabel}>Bedrooms</Text>
          </View>
          <View style={styles.counterControls}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setFormData({ ...formData, bedrooms: Math.max(1, formData.bedrooms - 1) })}
            >
              <Ionicons name="remove" size={20} color="#10ca8c" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{formData.bedrooms}</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setFormData({ ...formData, bedrooms: formData.bedrooms + 1 })}
            >
              <Ionicons name="add" size={20} color="#10ca8c" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.counterRow, styles.counterRowBorder]}>
          <View style={styles.counterInfo}>
            <Ionicons name="water-outline" size={24} color="#10ca8c" />
            <Text style={styles.counterLabel}>Bathrooms</Text>
          </View>
          <View style={styles.counterControls}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setFormData({ ...formData, bathrooms: Math.max(1, formData.bathrooms - 1) })}
            >
              <Ionicons name="remove" size={20} color="#10ca8c" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{formData.bathrooms}</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setFormData({ ...formData, bathrooms: formData.bathrooms + 1 })}
            >
              <Ionicons name="add" size={20} color="#10ca8c" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Area (square meters)</Text>
        <View style={styles.areaContainer}>
          <View style={[styles.inputWrapper, { flex: 1 }]}>
            <MaterialCommunityIcons name="ruler" size={20} color="#10ca8c" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={String(formData.area_sqm)}
              keyboardType="numeric"
              onChangeText={(text) => setFormData({ ...formData, area_sqm: Number(text) || 0 })}
            />
          </View>
          <View style={styles.areaBadge}>
            <Text style={styles.areaBadgeText}>m²</Text>
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <View style={styles.textAreaWrapper}>
          <TextInput
            style={styles.textArea}
            placeholder="Describe your property in detail... What makes it special?"
            placeholderTextColor="#999"
            multiline
            numberOfLines={5}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{formData.description.length}/500</Text>
        </View>
      </View>
    </View>
  );

  const renderAmenities = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>Amenities</Text>
      <Text style={styles.sectionSubtitle}>Select all amenities your property offers</Text>

      <View style={styles.amenitiesGrid}>
        {amenityOptions.slice(0, 8).map((amenity) => {
          const isSelected = selectedAmenities.includes(amenity.name);
          return (
            <TouchableOpacity
              key={amenity.name}
              style={[
                styles.amenityCard,
                isSelected && styles.selectedAmenityCard
              ]}
              onPress={() => handleAmenityToggle(amenity.name)}
            >
              <View style={[
                styles.amenityIconContainer,
                isSelected && styles.selectedAmenityIconContainer
              ]}>
                {renderIcon(
                  amenity.family,
                  amenity.icon,
                  24,
                  isSelected ? "#fff" : "#10ca8c"
                )}
              </View>
              <Text style={[
                styles.amenityName,
                isSelected && styles.selectedAmenityName
              ]}>
                {amenity.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.viewAllBtn}
        onPress={() => setShowAmenitiesModal(true)}
      >
        <Text style={styles.viewAllBtnText}>View All Amenities</Text>
        <Ionicons name="chevron-forward" size={20} color="#10ca8c" />
      </TouchableOpacity>

      {selectedAmenities.length > 0 && (
        <View style={styles.selectedAmenitiesContainer}>
          <Text style={styles.selectedAmenitiesTitle}>Selected Amenities:</Text>
          <View style={styles.selectedAmenitiesList}>
            {selectedAmenities.map((amenity, index) => (
              <View key={index} style={styles.selectedAmenityTag}>
                <Text style={styles.selectedAmenityTagText}>{amenity}</Text>
                <TouchableOpacity onPress={() => handleAmenityToggle(amenity)}>
                  <Ionicons name="close-circle" size={16} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderMedia = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>Photos & Videos</Text>
      <Text style={styles.sectionSubtitle}>Upload up to 20 photos or videos</Text>

      <View style={styles.mediaActions}>
        <TouchableOpacity
          style={styles.mediaActionBtn}
          onPress={pickMedia}
          disabled={uploading}
        >
          <View style={styles.mediaActionContent}>
            <Ionicons name="images-outline" size={32} color="#10ca8c" />
            <Text style={styles.mediaActionText}>Gallery</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mediaActionBtn}
          onPress={takePhoto}
          disabled={uploading}
        >
          <View style={styles.mediaActionContent}>
            <Ionicons name="camera-outline" size={32} color="#10ca8c" />
            <Text style={styles.mediaActionText}>Camera</Text>
          </View>
        </TouchableOpacity>
      </View>

      {uploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="large" color="#10ca8c" />
          <Text style={styles.uploadingText}>Uploading media...</Text>
        </View>
      )}

      {formData.media.length > 0 && (
        <View style={styles.mediaGrid}>
          <Text style={styles.mediaCount}>{formData.media.length} item(s) uploaded</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {formData.media.map((item, index) => (
              <View key={index} style={styles.mediaItem}>
                {item.type === "image" ? (
                  <Image source={{ uri: item.url }} style={styles.mediaImage} />
                ) : (
                  <View style={styles.videoContainer}>
                    <Video
                      source={{ uri: item.url }}
                      style={styles.mediaImage}
                      useNativeControls
                      resizeMode="cover"
                      isLooping
                    />
                    <View style={styles.videoBadge}>
                      <Ionicons name="videocam" size={16} color="#fff" />
                    </View>
                  </View>
                )}
                {index === 0 && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>Primary</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeMediaBtn}
                  onPress={() => removeMedia(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderReview = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>Review Your Listing</Text>
      <Text style={styles.sectionSubtitle}>Double-check everything before publishing</Text>

      <View style={styles.reviewCard}>
        {formData.media[0] && (
          <Image
            source={{ uri: formData.media[0].url }}
            style={styles.reviewCoverImage}
          />
        )}

        <View style={styles.reviewContent}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewTitle}>{formData.title || "Untitled Property"}</Text>
            <View style={styles.reviewTypeBadge}>
              <Text style={styles.reviewTypeBadgeText}>{formData.type}</Text>
            </View>
          </View>

          <View style={styles.reviewPrice}>
            <Text style={styles.reviewPriceAmount}>
              XAF {parseInt(formData.rent || 0).toLocaleString()}
            </Text>
            <Text style={styles.reviewPricePeriod}>/{formData.how}</Text>
          </View>

          <View style={styles.reviewStats}>
            <View style={styles.reviewStat}>
              <Ionicons name="bed-outline" size={18} color="#666" />
              <Text style={styles.reviewStatText}>{formData.bedrooms} beds</Text>
            </View>
            <View style={styles.reviewStat}>
              <Ionicons name="water-outline" size={18} color="#666" />
              <Text style={styles.reviewStatText}>{formData.bathrooms} baths</Text>
            </View>
            <View style={styles.reviewStat}>
              <MaterialCommunityIcons name="ruler" size={18} color="#666" />
              <Text style={styles.reviewStatText}>{formData.area_sqm} m²</Text>
            </View>
          </View>

          <View style={styles.reviewDivider} />

          <View style={styles.reviewAddress}>
            <Ionicons name="location-outline" size={18} color="#10ca8c" />
            <Text style={styles.reviewAddressText} numberOfLines={2}>
              {formData.address || "Address not set"}
            </Text>
          </View>

          {selectedAmenities.length > 0 && (
            <>
              <View style={styles.reviewDivider} />
              <Text style={styles.reviewSubtitle}>Amenities</Text>
              <View style={styles.reviewAmenities}>
                {selectedAmenities.slice(0, 5).map((amenity, index) => (
                  <View key={index} style={styles.reviewAmenity}>
                    <Ionicons name="checkmark-circle" size={16} color="#10ca8c" />
                    <Text style={styles.reviewAmenityText}>{amenity}</Text>
                  </View>
                ))}
                {selectedAmenities.length > 5 && (
                  <Text style={styles.reviewMoreAmenities}>
                    +{selectedAmenities.length - 5} more
                  </Text>
                )}
              </View>
            </>
          )}

          {formData.description ? (
            <>
              <View style={styles.reviewDivider} />
              <Text style={styles.reviewSubtitle}>Description</Text>
              <Text style={styles.reviewDescription} numberOfLines={3}>
                {formData.description}
              </Text>
            </>
          ) : null}

          <View style={styles.reviewDivider} />

          <View style={styles.reviewMediaInfo}>
            <Ionicons name="images-outline" size={18} color="#666" />
            <Text style={styles.reviewMediaText}>
              {formData.media.length} photo{formData.media.length !== 1 ? 's' : ''} uploaded
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.termsContainer}>
        <TouchableOpacity style={styles.termsCheckbox}>
          <View style={styles.checkbox}>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.termsText}>
          I confirm that I have the right to list this property and agree to the{' '}
          <Text style={styles.termsLink}>terms of service</Text>
        </Text>
      </View>
    </View>
  );





  const renderAmenitiesModal = () => (
    <Modal
      visible={showAmenitiesModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAmenitiesModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Amenities</Text>
            <TouchableOpacity onPress={() => setShowAmenitiesModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={amenityOptions}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => {
              const isSelected = selectedAmenities.includes(item.name);
              return (
                <TouchableOpacity
                  style={styles.modalAmenityItem}
                  onPress={() => handleAmenityToggle(item.name)}
                >
                  <View style={styles.modalAmenityLeft}>
                    <View style={[
                      styles.modalAmenityIcon,
                      isSelected && styles.selectedModalAmenityIcon
                    ]}>
                      {renderIcon(
                        item.family,
                        item.icon,
                        20,
                        isSelected ? "#fff" : "#10ca8c"
                      )}
                    </View>
                    <Text style={[
                      styles.modalAmenityText,
                      isSelected && styles.selectedModalAmenityText
                    ]}>
                      {item.name}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color="#10ca8c" />
                  )}
                </TouchableOpacity>
              );
            }}
          />

          <TouchableOpacity
            style={styles.modalDoneBtn}
            onPress={() => setShowAmenitiesModal(false)}
          >
            <Text style={styles.modalDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10ca8c" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ backgroundColor: '#ffffff', }}>
            <Text style={styles.headerTitle}>Create Listing</Text>
            <Text style={styles.headerSubtitle}>List your property</Text>
          </View>
          <TouchableOpacity
            style={styles.myPropertiesBtn}
            onPress={() => router.push('../MyHouses')}
          >
            <Ionicons name="list" size={18} color="#10ca8c" />
            <Text style={styles.myPropertiesText}>My Listings</Text>
          </TouchableOpacity>
        </View>

        {renderStepIndicator()}
      </View>

      {/* Main Content */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: keyboardOffset + 100 }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeStep === 0 && renderBasicInfo()}
        {activeStep === 1 && renderDetails()}
        {activeStep === 2 && renderAmenities()}
        {activeStep === 3 && renderMedia()}
        {activeStep === 4 && renderReview()}
      </ScrollView>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        {activeStep > 0 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={prevStep}
            disabled={submitting}
          >
            <Ionicons name="chevron-back" size={20} color="#666" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.nextButton,
            activeStep === 0 && styles.nextButtonFull,
            submitting && styles.disabledButton
          ]}
          onPress={activeStep === 4 ? handleSubmit : nextStep}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {activeStep === 4 ? "Publish Listing" : "Continue"}
              </Text>
              {activeStep < 4 && <Ionicons name="chevron-forward" size={20} color="#fff" />}
            </>
          )}
        </TouchableOpacity>
      </View>

      {renderAmenitiesModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingTop: Platform.OS === 'android' ? 20 : 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  myPropertiesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fff9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10ca8c',
  },
  myPropertiesText: {
    color: '#10ca8c',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 15,
    backgroundColor: '#fff',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  activeStepCircle: {
    backgroundColor: '#10ca8c',
  },
  inactiveStepCircle: {
    backgroundColor: '#f0f0f0',
  },
  stepCircleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeStepCircleText: {
    color: '#fff',
  },
  inactiveStepCircleText: {
    color: '#999',
  },
  stepLabel: {
    fontSize: 10,
    color: '#999',
  },
  activeStepLabel: {
    color: '#10ca8c',
    fontWeight: '600',
  },
  stepConnector: {
    height: 2,
    flex: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 5,
  },
  activeConnector: {
    backgroundColor: '#10ca8c',
  },
  scrollContent: {
    padding: 20,
  },
  stepContainer: {
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
    padding: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },
  required: {
    color: '#ff4444',
  },


  // inputWrapper: {
  // flexDirection: 'row',
  // alignItems: 'center',
  // backgroundColor: '#f9f9f9',
  // borderRadius: 12,
  // borderWidth: 1,
  // borderColor: '#f0f0f0',
  // },
  // inputIcon: {
  //   paddingHorizontal: 12,
  // },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  inputIcon: {
    marginRight: 10,
  },
  typeScrollme: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    display: "flex",
    flexDirection: "row", // Horizontal layout for the buttons
    gap: 8,               // Space between options
  },
  selectButton: {
    flex: 1,              // This forces all buttons to be equal width
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectButtonActive: {
    backgroundColor: 'rgba(16, 202, 140, 0.1)', // Light green tint
    borderColor: '#10ca8c',
  },
  selectText: {
    color: '#999',
    fontSize: 13,
    fontWeight: '500',
  },
  selectTextActive: {
    color: '#10ca8c',
    fontWeight: 'bold',
  },


  input: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 14,
    fontSize: 16,
    color: '#333',
  },
  addressInput: {
    minHeight: 50,
  },
  row: {
    flexDirection: 'column',
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#fff",
  },
  locationButton: {
    width: 52,
    height: 52,
    backgroundColor: '#f0fff9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10ca8c',
  },
  typeScroll: {
    flexGrow: 0,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  selectedTypeChip: {
    backgroundColor: '#10ca8c',
    borderColor: '#10ca8c',
  },
  typeChipText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedTypeChipText: {
    color: '#fff',
  },
  counterCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  counterRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  counterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  counterLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginLeft: 12,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  counterBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#fff',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10ca8c',
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  areaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  areaBadge: {
    backgroundColor: '#f0fff9',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#10ca8c',
  },
  areaBadgeText: {
    color: '#10ca8c',
    fontSize: 16,
    fontWeight: '600',
  },
  textAreaWrapper: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    padding: 12,
  },
  textArea: {
    height: 120,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    color: '#999',
    fontSize: 12,
    marginTop: 5,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 10
  },
  amenityCard: {
    width: (width - 60) / 2,
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  selectedAmenityCard: {
    backgroundColor: '#f0fff9',
    borderColor: '#10ca8c',
  },
  amenityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  selectedAmenityIconContainer: {
    backgroundColor: '#10ca8c',
    borderColor: '#10ca8c',
  },
  amenityName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedAmenityName: {
    color: '#10ca8c',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  viewAllBtnText: {
    color: '#10ca8c',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  selectedAmenitiesContainer: {
    marginTop: 16,
    backgroundColor: "#fff"
  },
  selectedAmenitiesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 12,
  },
  selectedAmenitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: "#fff"

  },
  selectedAmenityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fff9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#10ca8c',
  },
  selectedAmenityTagText: {
    color: '#10ca8c',
    fontSize: 14,
    marginRight: 4,
  },
  mediaActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: "#fff"
  },
  mediaActionBtn: {
    flex: 1,
    marginHorizontal: 6,
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  mediaActionContent: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',

  },
  mediaActionText: {
    color: '#10ca8c',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  uploadingContainer: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    marginBottom: 20,
  },
  uploadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  mediaGrid: {
    marginTop: 20,
    backgroundColor: "#fff",
    padding: 10
  },
  mediaCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  mediaItem: {
    width: 120,
    height: 120,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  primaryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#10ca8c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  removeMediaBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  reviewCoverImage: {
    width: '100%',
    height: 200,
  },
  reviewContent: {
    padding: 20,
    backgroundColor: "#fff"
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: "#fff"
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  reviewTypeBadge: {
    backgroundColor: '#f0fff9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10ca8c',
  },
  reviewTypeBadgeText: {
    color: '#10ca8c',
    fontSize: 12,
    fontWeight: '600',
  },
  reviewPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
    backgroundColor: "#fff"
  },
  reviewPriceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10ca8c',
  },
  reviewPricePeriod: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  reviewStats: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: "#fff"

  },
  reviewStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    backgroundColor: "#fff"
  },
  reviewStatText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 16,
  },
  reviewAddress: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: "#fff"
  },
  reviewAddressText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    lineHeight: 20,
  },
  reviewSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  reviewAmenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: "#fff"
  },
  reviewAmenity: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
    backgroundColor: "#fff"
  },
  reviewAmenityText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  reviewMoreAmenities: {
    fontSize: 14,
    color: '#10ca8c',
    fontWeight: '600',
    marginTop: 4,
    backgroundColor: "#fff"
  },
  reviewDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  reviewMediaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#fff"
  },
  reviewMediaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
  },
  termsCheckbox: {
    marginRight: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#10ca8c',
    backgroundColor: '#10ca8c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  termsLink: {
    color: '#10ca8c',
    fontWeight: '600',
  },
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
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalAmenityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  modalAmenityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  modalAmenityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  selectedModalAmenityIcon: {
    backgroundColor: '#10ca8c',
    borderColor: '#10ca8c',
  },
  modalAmenityText: {
    fontSize: 16,
    color: '#333',
  },
  selectedModalAmenityText: {
    color: '#10ca8c',
    fontWeight: '600',
  },
  modalDoneBtn: {
    marginTop: 20,
    backgroundColor: '#10ca8c',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10ca8c',
    paddingVertical: 14,
    borderRadius: 12,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
});