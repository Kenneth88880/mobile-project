import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
  Modal,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

const categories = ["Restaurants", "Parks", "Cafes", "Museums", "Gyms", "Libraries", "Malls", "Hospitals"];

export default function ExploreScreen() {
  const [region, setRegion] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [pins, setPins] = useState([]);
  const [places, setPlaces] = useState([]);
  const [visibleCount, setVisibleCount] = useState(3);
  const [searchText, setSearchText] = useState("");
  const [previousSearches, setPreviousSearches] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [placeDetails, setPlaceDetails] = useState(null);
  const [reviews, setReviews] = useState([]);

  // Load previous searches
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("previousSearches");
      if (saved) setPreviousSearches(JSON.parse(saved));
    })();
  }, []);

  // Get user location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location is required for Explore features.");
        setRegion({
          latitude: 43.6532,
          longitude: -79.3832,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
    })();
  }, []);

  // Generate mock nearby places
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
      setPins([]);
      setPlaces([]);
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

    // Save search history (keep only last 15)
    const newHistory = [term, ...previousSearches.filter((t) => t !== term)].slice(0, 15);
    setPreviousSearches(newHistory);
    await AsyncStorage.setItem("previousSearches", JSON.stringify(newHistory));

    // Default mock fallback
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

    /*
    // --- GOOGLE PLACES API SEARCH (uncomment to use) ---
    const GOOGLE_API_KEY = "YOUR_API_KEY_HERE";
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(term)}&location=${region.latitude},${region.longitude}&radius=50000&key=${GOOGLE_API_KEY}`
      );
      const data = await response.json();
      const placesData = data.results.map((p, index) => ({
        id: p.place_id || index.toString(),
        name: p.name,
        latitude: p.geometry.location.lat,
        longitude: p.geometry.location.lng,
        distance: ((p.distance || Math.random() * 50).toFixed(1)),
      }));
      setPins(placesData);
      setPlaces(placesData);
    } catch (err) {
      console.error("Google Places API Error:", err);
    }
    */
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

  const closeOverlay = () => {
    setSelectedPlace(null);
    setPlaceDetails(null);
    setReviews([]);
  };

  if (!region) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Fetching location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧭 Explore Nearby</Text>

      {/* Search bar */}
      <View style={{ marginBottom: 10 }}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search for places..."
          value={searchText}
          onFocus={() => setShowHistory(true)}
          onBlur={() => setShowHistory(false)} // hides when not in use
          onChangeText={setSearchText}
          onSubmitEditing={() => handleSearch(searchText)}
        />
        {showHistory && previousSearches.length > 0 && (
          <View style={styles.historyContainer}>
            <ScrollView style={{ maxHeight: 150 }}>
              {previousSearches.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleSearch(item)}
                  style={styles.historyItem}
                >
                  <Text>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Category buttons */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryButton, selectedCategory === cat && styles.activeButton]}
            onPress={() => handleCategorySelect(cat)}
          >
            <Text style={[styles.categoryText, selectedCategory === cat && styles.activeText]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView style={styles.map} region={region}>
          <Marker coordinate={region} title="You are here" />
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

      {/* Cards */}
      <FlatList
        data={places.slice(0, visibleCount)}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleSelectPlace(item)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>{item.distance} km away</Text>
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          visibleCount < places.length && (
            <TouchableOpacity style={styles.showMoreBtn} onPress={handleShowMore}>
              <Text style={styles.showMoreText}>Show More</Text>
            </TouchableOpacity>
          )
        }
      />

      {/* Overlay for details */}
      <Modal visible={!!selectedPlace} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.detailCard}>
            <TouchableOpacity style={styles.closeBtn} onPress={closeOverlay}>
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>✖</Text>
            </TouchableOpacity>

            <ScrollView>
              {selectedPlace && (
                <>
                  <Text style={styles.detailTitle}>{selectedPlace.name}</Text>
                  {placeDetails && (
                    <>
                      <Text style={styles.detailText}>
                        📍 {placeDetails.address || "Unknown address"}
                      </Text>
                      <Text style={styles.detailText}>
                        ⭐ {placeDetails.rating} ({placeDetails.totalReviews} reviews)
                      </Text>
                    </>
                  )}
                  <Text style={styles.sectionHeader}>User Reviews:</Text>
                  {reviews.map((r) => (
                    <View key={r.id} style={styles.reviewCard}>
                      <Text style={{ fontWeight: "bold" }}>{r.user}</Text>
                      <Text>{r.comment}</Text>
                      <Text style={{ color: "#777" }}>⭐ {r.rating}</Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const { height, width } = Dimensions.get("window");
const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: "#fff" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  searchBar: { borderColor: "#ccc", borderWidth: 1, borderRadius: 10, padding: 8 },
  historyContainer: { backgroundColor: "#f5f5f5", borderRadius: 8, marginTop: 4, paddingVertical: 4 },
  historyItem: { padding: 8, borderBottomColor: "#ddd", borderBottomWidth: 1 },
  categoryScroll: { marginBottom: 10 },
  categoryButton: { backgroundColor: "#eee", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 15, marginRight: 8 },
  activeButton: { backgroundColor: "#000" },
  categoryText: { color: "#333", fontWeight: "500" },
  activeText: { color: "#fff" },
  mapContainer: { height: height * 0.35, borderRadius: 10, overflow: "hidden", marginBottom: 10 },
  map: { flex: 1 },
  card: { backgroundColor: "#f8f8f8", padding: 15, borderRadius: 10, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: "bold" },
  cardSubtitle: { color: "#555" },
  showMoreBtn: { backgroundColor: "#000", padding: 10, borderRadius: 10, alignItems: "center", marginVertical: 10 },
  showMoreText: { color: "#fff", fontWeight: "bold" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  detailCard: {
    width: width * 0.9,
    height: height * 0.65,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
  },
  closeBtn: { alignSelf: "flex-end", padding: 5 },
  detailTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 5 },
  detailText: { fontSize: 15, marginBottom: 3 },
  sectionHeader: { fontSize: 17, fontWeight: "bold", marginTop: 10, marginBottom: 5 },
  reviewCard: {
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
});
