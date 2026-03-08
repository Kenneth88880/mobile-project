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
import { searchNearbyPlaces } from "../services/placesService";

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

export default function ExploreScreenNew({ isActive }) {
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

  // basePlacesRef holds the initial all-category preload.
  // It is the pool used for search so that an active category filter
  // never restricts what the user can find via the search bar.
  const basePlacesRef = useRef([]);
  // Cache the device location so we only request it once.
  const locationRef = useRef(null);

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
          // Category selected — fetch up to 20 of that type.
          results = await searchNearbyPlaces({
            latitude,
            longitude,
            radius: 1500,
            includedTypes: [selectedCategory],
            maxResultCount: 20,
            rankPreference: "POPULARITY",
          });
        } else if (basePlacesRef.current.length > 0) {
          // No category and we already have the base pool — reuse it
          // (avoids 8 extra API calls every time the user deselects a category).
          results = basePlacesRef.current;
        } else {
          // Initial load (or after a retry) — fetch 5 from each category
          // in parallel then interleave for variety.
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
          basePlacesRef.current = results; // store as permanent search pool
        }

        if (!cancelled) setAllPlaces(results);
      } catch (err) {
        console.error("Failed to load places:", err);
        if (!cancelled) {
          const msg = err?.message || "";
          if (msg.toLowerCase().includes("location") || msg.toLowerCase().includes("unavailable")) {
            setLocationError("Location unavailable. Please enable location services and try again.");
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

  const addEvent = (event) => {
    setEvents((prev) => ({
      ...prev,
      [event.date]: [...(prev[event.date] || []), event],
    }));
  };

  const updateEvent = (originalDate, index, updated) => {
    setEvents((prev) => {
      const next = { ...prev };
      const list = [...(next[originalDate] || [])];
      list.splice(index, 1);
      if (list.length === 0) delete next[originalDate];
      else next[originalDate] = list;
      next[updated.date] = [...(next[updated.date] || []), updated];
      return next;
    });
  };

  const deleteEvent = (date, index) => {
    setEvents((prev) => {
      const next = { ...prev };
      const list = [...(next[date] || [])];
      list.splice(index, 1);
      if (list.length === 0) delete next[date];
      else next[date] = list;
      return next;
    });
  };

  const filteredPlaces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allPlaces;
    // When searching, use the full base pool so the selected category
    // doesn't restrict what the user can find.
    const pool = basePlacesRef.current.length > 0 ? basePlacesRef.current : allPlaces;
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
    <PlaceItem place={item} onPress={() => setSelectedPlace(item)} />
  );

  const renderListHeader = () => (
    <Categories selected={selectedCategory} onSelect={setSelectedCategory} />
  );

  const renderListFooter = () => {
    if (loading) return null; // spinner is shown in empty component instead
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
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
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
              basePlacesRef.current = [];
              locationRef.current = null;
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
