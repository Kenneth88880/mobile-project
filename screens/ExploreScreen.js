import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Linking,
  Platform,
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
import {
  Text,
  Searchbar,
  Chip,
  Card,
  Button,
  List,
  Portal,
  Dialog,
  Surface,
  useTheme,
  Icon,
} from "react-native-paper";
// import MapView, { Marker } from "react-native-maps"; // Using static maps instead
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PLACES_API_KEY } from "../services/googleMapsConfig";

const categories = [
  "Restaurants",
  "Parks",
  "Cafes",
  "Museums",
  "Gyms",
  "Libraries",
  "Malls",
];

export default function ExploreScreen() {
  const theme = useTheme();
  const [region, setRegion] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [pins, setPins] = useState([]);
  const [places, setPlaces] = useState([]);
  const [recommendedPlaces, setRecommendedPlaces] = useState([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [searchText, setSearchText] = useState("");
  const [previousSearches, setPreviousSearches] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [placeDetails, setPlaceDetails] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [locationPermission, setLocationPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState(null);

  // Load previous search history from storage
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("previousSearches");
      if (saved) setPreviousSearches(JSON.parse(saved));
    })();
  }, []);

  // Check location permission on mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  // Check and request location permission
  const checkLocationPermission = async () => {
    try {
      setIsLoading(true);
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status);

      if (status === "granted") {
        await fetchUserLocation();
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Permission check error:", error);
      setLocationPermission("denied");
      setIsLoading(false);
    }
  };

  // Get user's current location and fetch nearby places
  const fetchUserLocation = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Location timeout")), 10000)
      );

      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const loc = await Promise.race([locationPromise, timeoutPromise]);

      const userRegion = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };

      setRegion(userRegion);

      // Fetch recommended places on initial load
      const recommended = await fetchNearbyPlaces(userRegion);
      setRecommendedPlaces(recommended);
      setPins(recommended);
      setPlaces(recommended);

      setIsLoading(false);
    } catch (error) {
      console.error("Location fetch error:", error);
      setIsLoading(false);
    }
  };

  // Request location permission from user
  const handleRequestPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);

      if (status === "granted") {
        setIsLoading(true);
        await fetchUserLocation();
      } else if (status === "denied") {
        Alert.alert(
          "Location Access Required",
          "Please enable location access in your device settings to use this feature.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                if (Platform.OS === "ios") {
                  Linking.openURL("app-settings:");
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Permission request error:", error);
      Alert.alert("Error", "Failed to request location permission.");
    }
  };

  // Calculate distance between two coordinates in kilometers
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Generate URL for static map showing all visible places (not currently used)
  const generateStaticMapUrl = () => {
    if (!region) return null;

    const { width } = Dimensions.get("window");
    const mapWidth = Math.floor(width - 16);
    const mapHeight = 250;

    let url = `https://maps.googleapis.com/maps/api/staticmap?center=${region.latitude},${region.longitude}&zoom=13&size=${mapWidth}x${mapHeight}&scale=2`;
    url += `&markers=color:blue|label:You|${region.latitude},${region.longitude}`;

    const visiblePins = places.slice(0, visibleCount);
    visiblePins.forEach((pin, index) => {
      const label = index + 1;
      url += `&markers=color:red|label:${label}|${pin.latitude},${pin.longitude}`;
    });

    url += `&key=${PLACES_API_KEY}`;
    return url;
  };

  // Generate URL for static map showing selected place in dialog
  const generatePlaceStaticMapUrl = (place) => {
    if (!place) return null;

    const { width } = Dimensions.get("window");
    const mapWidth = Math.floor(width - 32);
    const mapHeight = 200;

    let url = `https://maps.googleapis.com/maps/api/staticmap?center=${place.latitude},${place.longitude}&zoom=15&size=${mapWidth}x${mapHeight}&scale=2`;
    url += `&markers=color:red|label:P|${place.latitude},${place.longitude}`;
    url += `&key=${PLACES_API_KEY}`;

    return url;
  };

  // Fetch nearby places from Google Places API by type
  const fetchNearbyPlaces = async (
    userRegion,
    types = ["restaurant", "cafe", "park", "museum"]
  ) => {
    if (!userRegion) return [];

    try {
      const radius = 5000;
      const location = `${userRegion.latitude},${userRegion.longitude}`;
      const allPlaces = [];

      for (const type of types) {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${type}&key=${PLACES_API_KEY}`;

        console.log(`Fetching ${type} places...`);
        const response = await fetch(url);
        const data = await response.json();

        console.log(`API Response Status for ${type}:`, data.status);
        if (data.error_message) {
          console.error(`API Error for ${type}:`, data.error_message);
        }

        if (data.status === "REQUEST_DENIED") {
          Alert.alert(
            "API Access Denied",
            `Error: ${
              data.error_message || "Request denied"
            }\n\nPlease check:\n1. Billing is enabled in Google Cloud Console\n2. Places API is enabled\n3. API key has no restrictions blocking this request`
          );
          return [];
        }

        if (data.status === "OK" && data.results) {
          const places = data.results.slice(0, 5).map((place) => {
            const placeLat = place.geometry.location.lat;
            const placeLng = place.geometry.location.lng;
            const distance = calculateDistance(
              userRegion.latitude,
              userRegion.longitude,
              placeLat,
              placeLng
            );

            return {
              id: place.place_id,
              name: place.name,
              category: type.charAt(0).toUpperCase() + type.slice(1) + "s",
              latitude: placeLat,
              longitude: placeLng,
              distance: distance.toFixed(1),
              rating: place.rating,
              vicinity: place.vicinity,
            };
          });

          allPlaces.push(...places);
        } else if (data.status !== "ZERO_RESULTS") {
          console.warn(`Unexpected status for ${type}:`, data.status);
        }
      }

      return allPlaces.sort((a, b) => a.distance - b.distance);
    } catch (error) {
      console.error("Error fetching nearby places:", error);
      Alert.alert("Error", "Failed to fetch nearby places. Please try again.");
      return [];
    }
  };

  // Fetch places filtered by selected category
  const fetchPlacesByCategory = async (category, userRegion) => {
    if (!userRegion) return [];

    try {
      const radius = 10000;
      const location = `${userRegion.latitude},${userRegion.longitude}`;

      const categoryTypeMap = {
        Restaurants: "restaurant",
        Parks: "park",
        Cafes: "cafe",
        Museums: "museum",
        Gyms: "gym",
        Libraries: "library",
        Malls: "shopping_mall",
      };

      const type = categoryTypeMap[category] || category.toLowerCase();
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${type}&key=${PLACES_API_KEY}`;

      console.log(`Fetching category: ${category}...`);
      const response = await fetch(url);
      const data = await response.json();

      console.log(`API Response Status for ${category}:`, data.status);
      if (data.error_message) {
        console.error(`API Error for ${category}:`, data.error_message);
      }

      if (data.status === "REQUEST_DENIED") {
        Alert.alert(
          "API Access Denied",
          `Error: ${
            data.error_message || "Request denied"
          }\n\nPlease check:\n1. Billing is enabled in Google Cloud Console\n2. Places API is enabled\n3. API key has no restrictions blocking this request`
        );
        return [];
      }

      if (data.status === "OK" && data.results) {
        console.log(`Found ${data.results.length} places for ${category}`);
        return data.results
          .map((place) => {
            const placeLat = place.geometry.location.lat;
            const placeLng = place.geometry.location.lng;
            const distance = calculateDistance(
              userRegion.latitude,
              userRegion.longitude,
              placeLat,
              placeLng
            );

            return {
              id: place.place_id,
              name: place.name,
              category: category,
              latitude: placeLat,
              longitude: placeLng,
              distance: distance.toFixed(1),
              rating: place.rating,
              vicinity: place.vicinity,
            };
          })
          .sort((a, b) => a.distance - b.distance);
      }

      return [];
    } catch (error) {
      console.error("Error fetching places by category:", error);
      Alert.alert("Error", "Failed to fetch places. Please try again.");
      return [];
    }
  };

  // Handle category chip selection/deselection
  const handleCategorySelect = async (category) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      setPins(recommendedPlaces);
      setPlaces(recommendedPlaces);
      setVisibleCount(5);
    } else {
      setSelectedCategory(category);
      const results = await fetchPlacesByCategory(category, region);
      setPins(results);
      setPlaces(results);
      setVisibleCount(5);
    }
  };

  // Increase visible places count by 10
  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + 10, places.length));
  };

  // Search for places and update results
  const handleSearch = async (term) => {
    if (!term) return;
    setSearchText(term);
    setShowHistory(false);

    const newHistory = [
      term,
      ...previousSearches.filter((t) => t !== term),
    ].slice(0, 15);
    setPreviousSearches(newHistory);
    await AsyncStorage.setItem("previousSearches", JSON.stringify(newHistory));

    const result = await searchPlaces(term, region);
    setPins(result);
    setPlaces(result);
    setVisibleCount(5);

    if (result.length > 0) {
      setRegion({
        ...region,
        latitude: result[0].latitude,
        longitude: result[0].longitude,
      });
    }
  };

  // Search places using text query via Google Places API
  const searchPlaces = async (query, userRegion) => {
    if (!userRegion) return [];

    try {
      const location = `${userRegion.latitude},${userRegion.longitude}`;
      const radius = 10000;
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        query
      )}&location=${location}&radius=${radius}&key=${PLACES_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.results) {
        return data.results
          .map((place) => {
            const placeLat = place.geometry.location.lat;
            const placeLng = place.geometry.location.lng;
            const distance = calculateDistance(
              userRegion.latitude,
              userRegion.longitude,
              placeLat,
              placeLng
            );

            const placeTypes = place.types || [];
            let category = "Places";
            if (placeTypes.includes("restaurant")) category = "Restaurants";
            else if (placeTypes.includes("cafe")) category = "Cafes";
            else if (placeTypes.includes("park")) category = "Parks";
            else if (placeTypes.includes("museum")) category = "Museums";
            else if (placeTypes.includes("gym")) category = "Gyms";
            else if (placeTypes.includes("library")) category = "Libraries";
            else if (placeTypes.includes("shopping_mall")) category = "Malls";

            return {
              id: place.place_id,
              name: place.name,
              category: category,
              latitude: placeLat,
              longitude: placeLng,
              distance: distance.toFixed(1),
              rating: place.rating,
              vicinity: place.formatted_address || place.vicinity,
            };
          })
          .sort((a, b) => a.distance - b.distance);
      }

      return [];
    } catch (error) {
      console.error("Error searching places:", error);
      Alert.alert("Error", "Failed to search places. Please try again.");
      return [];
    }
  };

  // Fetch and display details for selected place
  const handleSelectPlace = async (place) => {
    setSelectedPlace(place);
    setPlaceDetails(null);
    setReviews([]);

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.id}&fields=formatted_address,rating,user_ratings_total,reviews,formatted_phone_number,opening_hours,website&key=${PLACES_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.result) {
        const details = {
          address:
            data.result.formatted_address ||
            place.vicinity ||
            "Address not available",
          rating: data.result.rating || place.rating || "N/A",
          totalReviews: data.result.user_ratings_total || 0,
          phoneNumber: data.result.formatted_phone_number,
          website: data.result.website,
          openingHours: data.result.opening_hours?.weekday_text,
        };
        setPlaceDetails(details);

        if (data.result.reviews) {
          const placeReviews = data.result.reviews.map((review, index) => ({
            id: index.toString(),
            user: review.author_name,
            comment: review.text,
            rating: review.rating,
            time: review.relative_time_description,
          }));
          setReviews(placeReviews);
        }
      } else {
        setPlaceDetails({
          address: place.vicinity || "Address not available",
          rating: place.rating || "N/A",
          totalReviews: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
      setPlaceDetails({
        address: place.vicinity || "Address not available",
        rating: place.rating || "N/A",
        totalReviews: 0,
      });
    }
  };

  if (isLoading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  if (locationPermission !== "granted" || !region) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Card style={styles.permissionCard} elevation={0}>
          <Card.Content style={styles.permissionContent}>
            <Icon
              source="map-marker-off"
              size={64}
              color={theme.colors.primary}
            />
            <Text
              variant="headlineSmall"
              style={[
                styles.permissionTitle,
                { color: theme.colors.onSurface },
              ]}
            >
              Location Access Required
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.permissionDescription,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              To use this feature, you need to allow location access. This helps
              us show you nearby places and explore your surroundings.
            </Text>
            <Button
              mode="contained"
              onPress={handleRequestPermission}
              icon="map-marker-check"
              style={styles.permissionButton}
            >
              Enable Location Access
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Surface style={styles.header} elevation={0}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon source="compass" size={28} color={theme.colors.primary} />
          <Text variant="headlineMedium">
            {selectedCategory ? selectedCategory : "Recommended for You"}
          </Text>
        </View>
      </Surface>

      <Searchbar
        placeholder="Search for places..."
        value={searchText}
        onFocus={() => setShowHistory(true)}
        onBlur={() => setShowHistory(false)}
        onChangeText={(text) => {
          setSearchText(text);
          if (text === "") {
            setPins(recommendedPlaces);
            setPlaces(recommendedPlaces);
            setVisibleCount(5);
            setSelectedCategory(null);
          }
        }}
        onSubmitEditing={() => handleSearch(searchText)}
        style={styles.searchBar}
      />

      {showHistory && previousSearches.length > 0 && (
        <Card style={styles.historyCard}>
          <Card.Content>
            {previousSearches.slice(0, 5).map((item, index) => (
              <List.Item
                key={index}
                title={item}
                left={(props) => <List.Icon {...props} icon="history" />}
                onPress={() => handleSearch(item)}
              />
            ))}
          </Card.Content>
        </Card>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
      >
        {categories.map((cat) => (
          <Chip
            key={cat}
            selected={selectedCategory === cat}
            onPress={() => handleCategorySelect(cat)}
            style={styles.categoryChip}
          >
            {cat}
          </Chip>
        ))}
      </ScrollView>

      <ScrollView style={styles.scrollContent}>
        <View style={styles.placesList}>
          {places.slice(0, visibleCount).map((item, index) => (
            <Card
              key={`${item.id}-${index}`}
              style={styles.placeCard}
              onPress={() => handleSelectPlace(item)}
            >
              <Card.Content>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 4,
                      }}
                    >
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        {item.distance} km away
                      </Text>
                      {item.rating && (
                        <>
                          <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.onSurfaceVariant }}
                          >
                            •
                          </Text>
                          <Icon
                            source="star"
                            size={14}
                            color={theme.colors.tertiary}
                          />
                          <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.onSurfaceVariant }}
                          >
                            {item.rating}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                  {item.category && (
                    <Chip compact style={styles.categoryBadge}>
                      {item.category}
                    </Chip>
                  )}
                </View>
              </Card.Content>
            </Card>
          ))}

          {visibleCount < places.length && (
            <Button
              mode="contained"
              onPress={handleShowMore}
              style={styles.showMoreButton}
            >
              Show More
            </Button>
          )}
        </View>
      </ScrollView>

      <Portal>
        <Dialog
          visible={!!selectedPlace}
          onDismiss={() => setSelectedPlace(null)}
          style={styles.dialog}
        >
          <Dialog.Title>{selectedPlace?.name}</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <ScrollView>
              {selectedPlace && placeDetails && (
                <Card style={styles.dialogInfoCard} elevation={0}>
                  <Card.Content style={{ padding: 0 }}>
                    <View style={styles.dialogMapContainer}>
                      <Image
                        source={{
                          uri: generatePlaceStaticMapUrl(selectedPlace),
                        }}
                        style={styles.dialogMap}
                        resizeMode="cover"
                      />
                    </View>
                  </Card.Content>
                  <Card.Content style={{ paddingBottom: 8 }}>
                    <List.Item
                      title={placeDetails.address}
                      left={(props) => (
                        <List.Icon
                          {...props}
                          icon="map-marker"
                          color={theme.colors.primary}
                        />
                      )}
                      titleNumberOfLines={3}
                      style={{ paddingVertical: 0, minHeight: 40 }}
                    />
                    <List.Item
                      title={`${placeDetails.rating} (${placeDetails.totalReviews} reviews)`}
                      left={(props) => (
                        <List.Icon
                          {...props}
                          icon="star"
                          color={theme.colors.tertiary}
                        />
                      )}
                      style={{ paddingVertical: 0, minHeight: 40 }}
                    />
                    <Button
                      mode="contained"
                      onPress={() => {
                        const lat = selectedPlace.latitude;
                        const lng = selectedPlace.longitude;
                        const label = encodeURIComponent(selectedPlace.name);
                        const url =
                          Platform.OS === "ios"
                            ? `maps://app?daddr=${lat},${lng}`
                            : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
                        Linking.openURL(url);
                      }}
                      style={{ marginTop: 8 }}
                    >
                      Get Directions
                    </Button>
                  </Card.Content>
                </Card>
              )}
              {placeDetails && (
                <>
                  {reviews.length > 0 && (
                    <>
                      <Text variant="titleSmall" style={styles.reviewsTitle}>
                        User Reviews
                      </Text>
                      {reviews.map((r) => (
                        <Card
                          key={r.id}
                          style={styles.reviewCard}
                          elevation={0}
                        >
                          <Card.Content>
                            <View
                              style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 4,
                              }}
                            >
                              <Text
                                variant="labelLarge"
                                style={{ color: theme.colors.onSurface }}
                              >
                                {r.user}
                              </Text>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <Icon
                                  source="star"
                                  size={14}
                                  color={theme.colors.tertiary}
                                />
                                <Text
                                  variant="bodySmall"
                                  style={{
                                    color: theme.colors.onSurfaceVariant,
                                  }}
                                >
                                  {r.rating}
                                </Text>
                              </View>
                            </View>
                            <Text
                              variant="bodySmall"
                              style={{ color: theme.colors.onSurfaceVariant }}
                            >
                              {r.comment}
                            </Text>
                            {r.time && (
                              <Text
                                variant="bodySmall"
                                style={{
                                  color: theme.colors.outline,
                                  marginTop: 4,
                                }}
                              >
                                {r.time}
                              </Text>
                            )}
                          </Card.Content>
                        </Card>
                      ))}
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setSelectedPlace(null)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  permissionCard: {
    maxWidth: 400,
    width: "100%",
  },
  permissionContent: {
    alignItems: "center",
    padding: 24,
  },
  permissionTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  permissionDescription: {
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  permissionButton: {
    marginTop: 8,
  },
  header: {
    padding: 16,
  },
  searchBar: {
    margin: 8,
  },
  historyCard: {
    margin: 8,
  },
  categoryScroll: {
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  categoryChip: {
    marginRight: 8,
  },
  scrollContent: {
    flex: 1,
  },
  mapCard: {
    margin: 8,
    overflow: "hidden",
  },
  mapContainer: {
    height: 250,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapErrorContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 16,
  },
  mapErrorText: {
    textAlign: "center",
    marginTop: 8,
  },
  placesList: {
    padding: 8,
  },
  placeCard: {
    marginBottom: 8,
  },
  showMoreButton: {
    margin: 8,
  },
  reviewsTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  reviewCard: {
    marginBottom: 8,
  },
  categoryBadge: {
    marginLeft: 8,
  },
  dialogMapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: "hidden",
  },
  dialogMap: {
    width: "100%",
    height: "100%",
  },
  dialog: {
    maxHeight: "100%",
    maxWidth: 500,
    alignSelf: "center",
  },
  dialogScrollArea: {
    maxHeight: "99%",
  },
  dialogCard: {
    marginBottom: 0,
  },
  dialogInfoCard: {
    marginBottom: 0,
  },
  placeNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  placeNumberText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
