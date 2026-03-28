import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Text, Searchbar, useTheme } from "react-native-paper";
import * as Location from "expo-location";
import PlaceItem from "./ExplorePage/PlaceItem";
import PlaceInfo from "./ExplorePage/PlaceInfo";
import Categories, { CATEGORIES } from "./ExplorePage/Categories";
import MyDates from "./ExplorePage/MyDates";
import {
  searchNearbyPlaces,
  getPlaceDetails,
  getBasePlacesCache,
  setBasePlacesCache,
  clearBasePlacesCache,
} from "../services/placesService";
import firestore from "@react-native-firebase/firestore";

const PAGE_SIZE = 10;

const TABS = [
  { key: "explore", label: "Explore" },
  { key: "mydates", label: "My Dates" },
];

// Interleave arrays so the list reads: 1 restaurant, 1 cafe, 1 bar, …, 2 restaurant, …
function interleave(arrays) {
  const result = [];
  const maxLen = Math.max(0, ...arrays.map((a) => a.length));
  for (let i = 0; i < maxLen; i++) {
    for (const arr of arrays) {
      if (arr[i] !== undefined) result.push(arr[i]);
    }
  }
  return result;
}

export default function ExploreScreenNew({ currentUserId }) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState("explore");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [events, setEvents] = useState({});
  const [allPlaces, setAllPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [retryKey, setRetryKey] = useState(0);

  // basePlacesRef holds the initial all-category preload in memory.
  // The persistent version lives in AsyncStorage via setBasePlacesCache.
  const basePlacesRef = useRef([]);
  // Cache the device location so we only request it once.
  const locationRef = useRef(null);

  // Load events from Firestore in real-time on mount
  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribe = firestore()
      .collection("userEvents")
      .doc(currentUserId)
      .collection("events")
      .onSnapshot((snapshot) => {
        const loaded = {};
        snapshot.forEach((doc) => {
          const data = { id: doc.id, ...doc.data() };
          if (!loaded[data.date]) loaded[data.date] = [];
          loaded[data.date].push(data);
        });
        setEvents(loaded);
      });
    return () => unsubscribe();
  }, [currentUserId]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setAllPlaces([]);
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLocationError(null);
      try {
        // Request location once; reuse on subsequent category changes.
        if (!locationRef.current) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            if (!cancelled)
              setLocationError(
                "Location permission denied. Please enable it in Settings."
              );
            return;
          }
          const loc = await Location.getCurrentPositionAsync({});
          locationRef.current = loc.coords;
        }

        const { latitude, longitude } = locationRef.current;
        let results;

        if (selectedCategory) {
          // Category selected — fetch up to 10 of that type.
          results = await searchNearbyPlaces({
            latitude,
            longitude,
            radius: 1500,
            includedTypes: [selectedCategory],
            maxResultCount: 10,
            rankPreference: "POPULARITY",
          });
        } else if (basePlacesRef.current.length > 0) {
          // No category and we already have the base pool in memory — reuse it.
          results = basePlacesRef.current;
        } else {
          // Check AsyncStorage cache before firing 8 API calls.
          // This handles the case where the component remounts (e.g. navigating
          // away and back) within the 2 hour TTL — zero API calls needed.
          const persistedBase = await getBasePlacesCache();
          if (persistedBase) {
            if (__DEV__) console.log(`[ExploreScreen] Loaded ${persistedBase.length} places from persistent cache`);
            basePlacesRef.current = persistedBase;
            results = persistedBase;
          } else {
            // No cache — initial load. Fetch 5 from each category in parallel
            // then interleave for variety.
            if (__DEV__) console.log(`[ExploreScreen] No cache found, fetching all categories`);
            const batches = await Promise.all(
              CATEGORIES.map((cat) =>
                searchNearbyPlaces({
                  latitude,
                  longitude,
                  radius: 1500,
                  includedPrimaryTypes: [cat.type],
                  maxResultCount: 5,
                  rankPreference: "POPULARITY",
                }).catch(() => [])
              )
            );
            results = interleave(batches);
            basePlacesRef.current = results;
            // Persist to AsyncStorage so remounts within 2hrs cost nothing
            await setBasePlacesCache(results);
          }
        }

        if (!cancelled) setAllPlaces(results);
      } catch (err) {
        console.error("Failed to load places:", err);
        if (!cancelled) {
          const msg = err?.message || "";
          if (
            msg.toLowerCase().includes("location") ||
            msg.toLowerCase().includes("unavailable")
          ) {
            setLocationError(
              "Location unavailable. Please enable location services and try again."
            );
          } else {
            setLocationError("Failed to load places. Please try again.");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedCategory, retryKey]);

  // onSnapshot handles state — just write to Firestore
  const addEvent = async (event) => {
    try {
      await firestore()
        .collection("userEvents")
        .doc(currentUserId)
        .collection("events")
        .add({
          title: event.title,
          date: event.date,
          time: event.time,
          place: event.place,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error("Error adding event:", error);
    }
  };

  // Resolve the event by index to get its Firestore id
  const updateEvent = async (originalDate, index, updated) => {
    try {
      const eventToUpdate = (events[originalDate] || [])[index];
      if (!eventToUpdate?.id) return;
      await firestore()
        .collection("userEvents")
        .doc(currentUserId)
        .collection("events")
        .doc(eventToUpdate.id)
        .update({
          title: updated.title,
          date: updated.date,
          time: updated.time,
        });
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };

  const deleteEvent = async (date, index) => {
    try {
      const eventToDelete = (events[date] || [])[index];
      if (!eventToDelete?.id) return;
      await firestore()
        .collection("userEvents")
        .doc(currentUserId)
        .collection("events")
        .doc(eventToDelete.id)
        .delete();
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const filteredPlaces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allPlaces;
    // When searching, use the full base pool so the selected category
    // doesn't restrict what the user can find.
    const pool =
      basePlacesRef.current.length > 0 ? basePlacesRef.current : allPlaces;
    return pool.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [allPlaces, searchQuery]);

  const visiblePlaces = useMemo(
    () => filteredPlaces.slice(0, visibleCount),
    [filteredPlaces, visibleCount]
  );

  const hasMore = visibleCount < filteredPlaces.length;

  const renderPlaceItem = ({ item }) => (
    <PlaceItem
      place={item}
      onPress={async () => {
        setSelectedPlace(item); // show modal immediately with basic info
        try {
          const detailed = await getPlaceDetails(item.id);
          setSelectedPlace(detailed); // update with full details once loaded
        } catch (err) {
          console.error("Failed to load place details:", err);
          // modal stays open with basic info if details fail
        }
      }}
    />
  );

  const renderListHeader = () => (
    <Categories selected={selectedCategory} onSelect={setSelectedCategory} />
  );

  const renderListFooter = () => {
    if (loading) return null;
    if (hasMore) {
      return (
        <TouchableOpacity
          style={[styles.showMoreBtn, { borderColor: theme.colors.primary }]}
          onPress={() => setVisibleCount((v) => v + PAGE_SIZE)}
          activeOpacity={0.7}
        >
          <Text style={[styles.showMoreText, { color: theme.colors.primary }]}>
            Show More
          </Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[
              styles.loadingText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Finding places near you…
          </Text>
        </View>
      );
    }
    if (locationError) {
      return (
        <View style={styles.empty}>
          <Text style={{ color: theme.colors.error, textAlign: "center" }}>
            {locationError}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              // Clear everything including persistent cache on retry
              basePlacesRef.current = [];
              locationRef.current = null;
              clearBasePlacesCache();
              setRetryKey((k) => k + 1);
            }}
          >
            <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          No places found
        </Text>
      </View>
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.searchWrapper}>
        <Searchbar
          placeholder="Search places"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[
            styles.searchbar,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
          inputStyle={styles.searchInput}
          elevation={0}
        />
      </View>

      <View
        style={[
          styles.tabBar,
          { borderBottomColor: theme.colors.outlineVariant },
        ]}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                active && {
                  borderBottomColor: theme.colors.primary,
                  borderBottomWidth: 3,
                },
              ]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: active
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant,
                    fontWeight: active ? "700" : "500",
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === "explore" ? (
        <FlatList
          data={visiblePlaces}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPlaceItem}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderListFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <MyDates
          events={events}
          onExplore={() => setActiveTab("explore")}
          onUpdateEvent={updateEvent}
          onDeleteEvent={deleteEvent}
        />
      )}

      <PlaceInfo
        place={selectedPlace}
        visible={!!selectedPlace}
        onClose={() => setSelectedPlace(null)}
        onCreateEvent={addEvent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchbar: {
    borderRadius: 28,
    height: 46,
  },
  searchInput: {
    fontSize: 15,
    minHeight: 0,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginTop: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 4,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  showMoreBtn: {
    marginHorizontal: 40,
    marginVertical: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  showMoreText: {
    fontSize: 15,
    fontWeight: "600",
  },
});