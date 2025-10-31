import React, { useEffect, useState, useRef } from "react";
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, PanResponder, Animated, Alert } from "react-native";
import { getAllProfiles, saveRating } from "../profileService";
import { CURRENT_USER_ID } from "../UserConfig";

export default function DatingScreen() {
  const [profiles, setProfiles] = useState([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingProfile, setRatingProfile] = useState(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const currentUserId = CURRENT_USER_ID;

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    const fetchedProfiles = await getAllProfiles(currentUserId);
    console.log(`Loaded ${fetchedProfiles.length} profiles for user: ${currentUserId}`);
    setProfiles(fetchedProfiles);
    setCurrentPairIndex(0); // Reset to first pair
    setLoading(false);
  };

  const handleProfileClick = (profile) => {
    setSelectedProfile(profile);
    setCurrentImageIndex(0);
  };

  const handleBackToDouble = () => {
    setSelectedProfile(null);
    setCurrentImageIndex(0);
  };

  const handleRateProfile = (profile) => {
    setRatingProfile(profile);
    setShowRatingModal(true);
  };

  const submitRating = async (rating) => {
    if (ratingProfile) {
      await saveRating(currentUserId, ratingProfile.userId, rating);
      Alert.alert("Rating Submitted", `You rated ${ratingProfile.name} ${rating} stars!`);
      setShowRatingModal(false);
      setRatingProfile(null);
    }
  };

  const handleNextImage = () => {
    if (selectedProfile && selectedProfile.photos.length > 1) {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % selectedProfile.photos.length
      );
    }
  };

  const handlePrevImage = () => {
    if (selectedProfile && selectedProfile.photos.length > 1) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? selectedProfile.photos.length - 1 : prevIndex - 1
      );
    }
  };

  const handleSwipeComplete = (direction) => {
    const action = direction === "right" ? "like" : "pass";
    console.log(`${action} on both profiles!`);
    
    // Move to next pair
    setCurrentPairIndex((prevIndex) => prevIndex + 2);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10) {
          if (gestureState.x0 < 200) {
            handlePrevImage();
          } else {
            handleNextImage();
          }
        }
      },
    })
  ).current;

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={{ color: "white", fontSize: 18 }}>Loading profiles...</Text>
      </View>
    );
  }

  if (currentPairIndex >= profiles.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={{ color: "white", fontSize: 18 }}>
          No more profiles! Check back later.
        </Text>
      </View>
    );
  }

  const topProfile = profiles[currentPairIndex];
  const bottomProfile = profiles[currentPairIndex + 1];

  // Rating Modal
  if (showRatingModal && ratingProfile) {
    return (
      <View style={styles.modalContainer}>
        <View style={styles.ratingModal}>
          <Text style={styles.modalTitle}>Rate {ratingProfile.name}</Text>
          <Text style={styles.modalSubtitle}>How would you rate this profile?</Text>
          
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                style={styles.starButton}
                onPress={() => submitRating(star)}
              >
                <Text style={styles.starText}>⭐</Text>
                <Text style={styles.starNumber}>{star}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => {
              setShowRatingModal(false);
              setRatingProfile(null);
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // If viewing a single profile
  if (selectedProfile) {
    return (
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBackToDouble}>
          <Text style={styles.backButtonText}>← Back to Double Dating</Text>
        </TouchableOpacity>

        <View 
          style={styles.imageCard}
        >
          <Image 
            source={{ uri: selectedProfile.photos[currentImageIndex] }} 
            style={styles.image} 
            resizeMode="cover" 
          />
          
          {/* Left tap zone for previous image */}
          <TouchableOpacity 
            style={styles.leftTapZone}
            onPress={handlePrevImage}
            activeOpacity={1}
          />
          
          {/* Right tap zone for next image */}
          <TouchableOpacity 
            style={styles.rightTapZone}
            onPress={handleNextImage}
            activeOpacity={1}
          />
          
          {selectedProfile.photos.length > 1 && (
            <View style={styles.dotsContainer} pointerEvents="none">
              {selectedProfile.photos.map((_, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.dot,
                    index === currentImageIndex && styles.activeDot
                  ]} 
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardText}>
            {selectedProfile.name || "Unknown"} {selectedProfile.age ? `, ${selectedProfile.age}` : ""}
          </Text>
          <Text style={styles.desc}>{selectedProfile.description}</Text>
          <Text style={styles.tags}>{selectedProfile.tags}</Text>
          
          <TouchableOpacity 
            style={styles.rateButton}
            onPress={() => handleRateProfile(selectedProfile)}
          >
            <Text style={styles.rateButtonText}>⭐ Rate this profile</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.instructions}>
          Tap left/right on images to flip through • Go back to like/pass
        </Text>
      </ScrollView>
    );
  }

  // Double dating view
  return (
    <View style={styles.doubleDatingContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>💑 Double Dating</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadProfiles}>
          <Text style={styles.refreshText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.userIndicator}>Viewing as: {currentUserId}</Text>

      {topProfile && (
        <TouchableOpacity 
          style={styles.halfCard}
          onPress={() => handleProfileClick(topProfile)}
          activeOpacity={0.9}
        >
          <Image 
            source={{ uri: topProfile.photos[0] }} 
            style={styles.halfImage} 
            resizeMode="cover" 
          />
          <View style={styles.halfCardOverlay}>
            <Text style={styles.halfCardText}>
              {topProfile.name} {topProfile.age ? `, ${topProfile.age}` : ""}
            </Text>
            <Text style={styles.tapToView}>Tap to view profile</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.swipeActions}>
        <TouchableOpacity 
          style={styles.passButton}
          onPress={() => handleSwipeComplete("left")}
        >
          <Text style={styles.actionButtonText}>✗ PASS BOTH</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.likeButton}
          onPress={() => handleSwipeComplete("right")}
        >
          <Text style={styles.actionButtonText}>❤️ LIKE BOTH</Text>
        </TouchableOpacity>
      </View>

      {bottomProfile ? (
        <TouchableOpacity 
          style={styles.halfCard}
          onPress={() => handleProfileClick(bottomProfile)}
          activeOpacity={0.9}
        >
          <Image 
            source={{ uri: bottomProfile.photos[0] }} 
            style={styles.halfImage} 
            resizeMode="cover" 
          />
          <View style={styles.halfCardOverlay}>
            <Text style={styles.halfCardText}>
              {bottomProfile.name} {bottomProfile.age ? `, ${bottomProfile.age}` : ""}
            </Text>
            <Text style={styles.tapToView}>Tap to view profile</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={[styles.halfCard, styles.emptyCard]}>
          <Text style={styles.emptyText}>No more profiles</Text>
        </View>
      )}

      <Text style={styles.instructions}>
        Tap profiles to view details • Swipe or use buttons to decide
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    alignItems: "center",
    paddingVertical: 20,
  },
  doubleDatingContainer: {
    flex: 1,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginTop: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "95%",
    marginTop: 20,
    marginBottom: 5,
  },
  refreshButton: {
    backgroundColor: "white",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  userIndicator: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 10,
  },
  halfCard: {
    width: "95%",
    height: "35%",
    borderRadius: 20,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
    overflow: "hidden",
    position: "relative",
  },
  halfImage: {
    width: "100%",
    height: "100%",
  },
  halfCardOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 15,
  },
  halfCardText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  tapToView: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 5,
  },
  swipeActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "95%",
    marginVertical: 15,
  },
  passButton: {
    backgroundColor: "#F44336",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 25,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  likeButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 25,
    flex: 1,
    marginLeft: 10,
    alignItems: "center",
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyCard: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
  },
  backButton: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  imageCard: {
    width: "95%",
    height: 500,
    borderRadius: 20,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
    overflow: "hidden",
    marginBottom: 15,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  leftTapZone: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "50%",
    height: "100%",
    backgroundColor: "transparent",
    zIndex: 100,
  },
  rightTapZone: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "50%",
    height: "100%",
    backgroundColor: "transparent",
    zIndex: 100,
  },
  dotsContainer: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "white",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  infoCard: {
    width: "95%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
    marginBottom: 20,
  },
  cardText: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  desc: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 5,
    color: "#555",
    lineHeight: 22,
  },
  tags: {
    fontSize: 14,
    textAlign: "center",
    color: "#888",
    marginTop: 10,
  },
  instructions: {
    color: "white",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
    fontStyle: "italic",
  },
  rateButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
    marginTop: 15,
    alignItems: "center",
  },
  rateButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  ratingModal: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    width: "85%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 25,
    textAlign: "center",
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 20,
  },
  starButton: {
    alignItems: "center",
    padding: 10,
  },
  starText: {
    fontSize: 40,
  },
  starNumber: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 5,
    color: "#333",
  },
  cancelButton: {
    backgroundColor: "#ccc",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#333",
  },
});