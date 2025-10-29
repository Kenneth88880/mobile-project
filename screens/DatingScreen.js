import React, { useContext, useEffect, useState, useRef } from "react";
import { View, Text, Image, StyleSheet, ScrollView, PanResponder, Animated } from "react-native";
import { UserContext } from "../context/UserContext";

export default function DatingScreen() {
  const { userData } = useContext(UserContext);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const pan = useRef(new Animated.ValueXY()).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [userData]);

  const handleNextImage = () => {
    if (userData.photos.length > 1) {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % userData.photos.length
      );
    }
  };

  const handlePrevImage = () => {
    if (userData.photos.length > 1) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? userData.photos.length - 1 : prevIndex - 1
      );
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy * 0.5 });
        const newOpacity = 1 - Math.abs(gestureState.dx) / 400;
        opacity.setValue(newOpacity);
        // Rotate card based on drag
        const rotateValue = gestureState.dx / 15;
        rotate.setValue(rotateValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
          if (gestureState.x0 < 200) {
            handlePrevImage();
          } else {
            handleNextImage();
          }
        } 
        else if (Math.abs(gestureState.dx) > 120) {
          // Swipe detected
          const direction = gestureState.dx > 0 ? "right" : "left";
          
          Animated.parallel([
            Animated.timing(pan, {
              toValue: { x: gestureState.dx > 0 ? 500 : -500, y: gestureState.dy },
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Reset card
            pan.setValue({ x: 0, y: 0 });
            opacity.setValue(1);
            rotate.setValue(0);
            
            // Show feedback
            if (direction === "right") {
              console.log("✓ YES - Swiped Right!");
            } else {
              console.log("✗ NO - Swiped Left!");
            }
          });
        } else {
          // Return to center
          Animated.parallel([
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              friction: 7,
              tension: 40,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.spring(rotate, {
              toValue: 0,
              friction: 7,
              tension: 40,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  if (userData.photos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={{ color: "white", fontSize: 18 }}>
          Go to your profile and add photos & info first!
        </Text>
      </View>
    );
  }

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-50, 0, 50],
    outputRange: ["-10deg", "0deg", "10deg"],
  });

  const likeOpacity = pan.x.interpolate({
    inputRange: [0, 150],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const nopeOpacity = pan.x.interpolate({
    inputRange: [-150, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <ScrollView 
      style={styles.scrollContainer}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Image Card */}
      <Animated.View 
        style={[
          styles.imageCard,
          {
            transform: [
              { translateX: pan.x },
              { rotate: rotateInterpolate }
            ],
            opacity: opacity,
          }
        ]}
        {...panResponder.panHandlers}
      >
        <Image 
          source={userData.photos[currentImageIndex]} 
          style={styles.image} 
          resizeMode="cover" 
        />
        
        {/* YES Label */}
        <Animated.View style={[styles.likeLabel, { opacity: likeOpacity }]}>
          <Text style={styles.likeText}>YES ❤️</Text>
        </Animated.View>

        {/* NO Label */}
        <Animated.View style={[styles.nopeLabel, { opacity: nopeOpacity }]}>
          <Text style={styles.nopeText}>NO ✗</Text>
        </Animated.View>
        
        {/* Image indicator dots */}
        {userData.photos.length > 1 && (
          <View style={styles.dotsContainer} pointerEvents="none">
            {userData.photos.map((_, index) => (
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
      </Animated.View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.cardText}>
          {userData.name || "Unknown"} {userData.age ? `, ${userData.age}` : ""}
        </Text>
        <Text style={styles.desc}>{userData.description}</Text>
        <Text style={styles.tags}>{userData.tags}</Text>
      </View>

      {/* Instructions */}
      <Text style={styles.instructions}>
        👈 Swipe left for NO  |  Swipe right for YES 👉
      </Text>
    </ScrollView>
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
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  likeLabel: {
    position: "absolute",
    top: 50,
    right: 40,
    borderWidth: 4,
    borderColor: "#4CAF50",
    borderRadius: 10,
    padding: 10,
    transform: [{ rotate: "20deg" }],
  },
  likeText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  nopeLabel: {
    position: "absolute",
    top: 50,
    left: 40,
    borderWidth: 4,
    borderColor: "#F44336",
    borderRadius: 10,
    padding: 10,
    transform: [{ rotate: "-20deg" }],
  },
  nopeText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#F44336",
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
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "bold",
  },
});