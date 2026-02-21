import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import { Text, Searchbar, useTheme } from "react-native-paper";
import PlaceItem from "./ExplorePage/PlaceItem";
import PlaceInfo from "./ExplorePage/PlaceInfo";
import Categories from "./ExplorePage/Categories";
import MyDates from "./ExplorePage/MyDates";
import places from "../archive/places.json";

// Map places.json categories to our Google-Places-style category IDs.
// When you switch to the real API the data will already have a `type` field.
const CATEGORY_MAP = {
  restaurant: [
    "Afghan",
    "American",
    "Asian Fusion",
    "BBQ",
    "Breakfast",
    "Burgers",
    "Caribbean",
    "Chinese",
    "Ethiopian",
    "French",
    "Greek",
    "Indian",
    "Italian",
    "Japanese",
    "Korean",
    "Latin",
    "Lebanese",
    "Mediterranean",
    "Mexican",
    "Middle Eastern",
    "Pakistani",
    "Persian",
    "Pizza",
    "Portuguese",
    "Seafood",
    "Southern",
    "Steakhouses",
    "Sushi",
    "Thai",
    "Turkish",
    "Vegan",
    "Vegetarian",
    "Vietnamese",
  ],
  cafe: ["Cafe", "Coffee", "Bakeries", "Desserts", "Donuts", "Ice Cream"],
  bar: ["Bar", "Bars", "Cocktail Bars", "Pubs", "Wine Bars", "Breweries"],
  park: ["Parks", "Park", "Hiking", "Beaches", "Gardens"],
  movie_theater: ["Cinema", "Movie Theater", "Movie Theatres"],
  museum: ["Museum", "Museums", "Art Galleries", "Gallery"],
  bowling_alley: ["Bowling", "Arcade", "Entertainment"],
  spa: ["Spa", "Massage", "Wellness"],
};

function matchesCategory(place, categoryId) {
  if (!categoryId) return true;
  const mapped = CATEGORY_MAP[categoryId] || [];
  return mapped.some(
    (c) => place.category && place.category.toLowerCase() === c.toLowerCase(),
  );
}

const TABS = [
  { key: "explore", label: "Explore" },
  { key: "mydates", label: "My Dates" },
];

export default function ExploreScreenNew({ isActive }) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState("explore");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [events, setEvents] = useState({});

  const addEvent = (event) => {
    setEvents((prev) => ({
      ...prev,
      [event.date]: [...(prev[event.date] || []), event],
    }));
  };

  const updateEvent = (originalDate, index, updated) => {
    setEvents((prev) => {
      const next = { ...prev };
      // Remove from original date
      const list = [...(next[originalDate] || [])];
      list.splice(index, 1);
      if (list.length === 0) delete next[originalDate];
      else next[originalDate] = list;
      // Add to (possibly new) date
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
    let result = places;

    if (selectedCategory) {
      result = result.filter((p) => matchesCategory(p, selectedCategory));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [selectedCategory, searchQuery]);

  const renderPlaceItem = ({ item }) => (
    <PlaceItem place={item} onPress={() => setSelectedPlace(item)} />
  );

  const ListHeader = (
    <>
      {/* Categories row */}
      <Categories selected={selectedCategory} onSelect={setSelectedCategory} />

    </>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Search bar */}
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

      {/* Tab bar */}
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

      {/* Tab content */}
      {activeTab === "explore" ? (
        <FlatList
          data={filteredPlaces}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPlaceItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                No places found
              </Text>
            </View>
          }
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
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
});
