import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Alert,
  Modal,
  ScrollView,
  Linking,
  Platform,
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
  IconButton,
} from "react-native-paper";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

const categories = [
  "Restaurants",
  "Parks",
  "Cafes",
  "Museums",
  "Gyms",
  "Libraries",
  "Malls",
  "Hospitals",
];

export default function ExploreScreen() {
  const theme = useTheme();
  const [region, setRegion] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [pins, setPins] = useState([]);
  const [places, setPlaces] = useState([]);
  const [recommendedPlaces, setRecommendedPlaces] = useState([]);
  const [visibleCount, setVisibleCount] = useState(3);
  const [searchText, setSearchText] = useState("");
  const [previousSearches, setPreviousSearches] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [placeDetails, setPlaceDetails] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [locationPermission, setLocationPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("previousSearches");
      if (saved) setPreviousSearches(JSON.parse(saved));
    })();
  }, []);

  useEffect(() => {
    checkLocationPermission();
  }, []);

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

      // Generate recommended places on initial load
      const recommended = generateRecommendedPlaces(userRegion);
      setRecommendedPlaces(recommended);
      setPins(recommended);
      setPlaces(recommended);

      setIsLoading(false);
    } catch (error) {
      console.error("Location fetch error:", error);
      setIsLoading(false);
    }
  };

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

  const generateRecommendedPlaces = (userRegion) => {
    if (!userRegion) return [];

    const recommendedCategories = ["Restaurants", "Cafes", "Parks", "Museums"];
    const places = [];

    recommendedCategories.forEach((category, categoryIndex) => {
      // Generate 3-5 places per category
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        places.push({
          id: `recommended-${category}-${i}`,
          name: `${category.slice(0, -1)} ${String.fromCharCode(
            65 + categoryIndex * 5 + i
          )}`,
          category: category,
          latitude: userRegion.latitude + (Math.random() - 0.5) * 0.08,
          longitude: userRegion.longitude + (Math.random() - 0.5) * 0.08,
          distance: (Math.random() * 5).toFixed(1),
        });
      }
    });

    return places.sort((a, b) => a.distance - b.distance);
  };

  const generateMockPlaces = (category) => {
    if (!region) return [];
    const newPlaces = Array.from({ length: 40 }).map((_, i) => ({
      id: `${category}-${i}`,
      name: `${category} #${i + 1}`,
      latitude: region.latitude + (Math.random() - 0.5) * 0.3,
      longitude: region.longitude + (Math.random() - 0.5) * 0.3,
      distance: (Math.random() * 50).toFixed(1),
    }));
    return newPlaces.sort((a, b) => a.distance - b.distance);
  };

  const handleCategorySelect = (category) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      setPins(recommendedPlaces);
      setPlaces(recommendedPlaces);
      setVisibleCount(3);
    } else {
      setSelectedCategory(category);
      const generated = generateMockPlaces(category);
      setPins(generated);
      setPlaces(generated);
      setVisibleCount(3);
    }
  };

  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + 10, places.length));
  };

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

    const result = generateMockPlaces(term);
    setPins(result);
    setPlaces(result);
    setVisibleCount(3);
    if (result.length > 0) {
      setRegion({
        ...region,
        latitude: result[0].latitude,
        longitude: result[0].longitude,
      });
    }
  };

  const handleSelectPlace = async (place) => {
    setSelectedPlace(place);
    setPlaceDetails(null);
    setReviews([]);

    const mockDetails = {
      address: "123 Example Street, Toronto, ON",
      rating: (Math.random() * 5).toFixed(1),
      totalReviews: Math.floor(Math.random() * 300),
    };
    setPlaceDetails(mockDetails);

    const mockReviews = Array.from({ length: 5 }).map((_, i) => ({
      id: i.toString(),
      user: `User${i + 1}`,
      comment: `This is a mock review for ${place.name}. Great atmosphere!`,
      rating: (Math.random() * 5).toFixed(1),
    }));
    setReviews(mockReviews);
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Icon
          source="map-marker-radius"
          size={48}
          color={theme.colors.primary}
        />
        <Text variant="titleMedium" style={{ marginTop: 16 }}>
          Fetching location...
        </Text>
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
        <Card style={styles.permissionCard} elevation={2}>
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
      <Surface style={styles.header} elevation={2}>
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
        onChangeText={setSearchText}
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
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={region}
            scrollEnabled={true}
            zoomEnabled={true}
            rotateEnabled={true}
            pitchEnabled={true}
          >
            <Marker coordinate={region} title="You are here" pinColor="blue" />
            {pins.map((p) => (
              <Marker
                key={p.id}
                coordinate={{ latitude: p.latitude, longitude: p.longitude }}
                title={p.name}
                description={`${p.distance} km away`}
                onPress={() => handleSelectPlace(p)}
              />
            ))}
          </MapView>
        </View>

        <View style={styles.placesList}>
          {places.slice(0, visibleCount).map((item) => (
            <Card
              key={item.id}
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
                    <Text variant="titleMedium">{item.name}</Text>
                    <Text variant="bodySmall">{item.distance} km away</Text>
                  </View>
                  {item.category && !selectedCategory && (
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
        >
          <Dialog.Title>{selectedPlace?.name}</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              {placeDetails && (
                <>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      marginBottom: 8,
                    }}
                  >
                    <Icon source="map-marker" size={16} />
                    <Text variant="bodyMedium">{placeDetails.address}</Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      marginBottom: 8,
                    }}
                  >
                    <Icon source="star" size={16} color="#FFD700" />
                    <Text variant="bodyMedium">
                      {placeDetails.rating} ({placeDetails.totalReviews}{" "}
                      reviews)
                    </Text>
                  </View>
                  <Text variant="titleSmall" style={styles.reviewsTitle}>
                    User Reviews:
                  </Text>
                  {reviews.map((r) => (
                    <Card key={r.id} style={styles.reviewCard}>
                      <Card.Content>
                        <Text variant="labelLarge">{r.user}</Text>
                        <Text variant="bodySmall">{r.comment}</Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            marginTop: 4,
                          }}
                        >
                          <Icon source="star" size={14} color="#FFD700" />
                          <Text variant="bodySmall">{r.rating}</Text>
                        </View>
                      </Card.Content>
                    </Card>
                  ))}
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

const { height } = Dimensions.get("window");
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
  mapContainer: {
    height: height * 0.3,
    margin: 8,
    borderRadius: 10,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
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
});
