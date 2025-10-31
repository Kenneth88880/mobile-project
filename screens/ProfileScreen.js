import React, { useContext, useState, useEffect } from "react";
import { View, Text, Button, Image, ScrollView, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { UserContext } from "../context/UserContext";
import ProfileInfo from "../components/ProfileInfo";
import { saveUserProfile, getAverageRating } from "../profileService";
import { CURRENT_USER_ID } from "../UserConfig";

export default function ProfileScreen() {
  const { userData, setUserData } = useContext(UserContext);
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState({ average: 0, count: 0 });
  
  const userId = CURRENT_USER_ID;

  useEffect(() => {
    loadRating();
  }, []);

  const loadRating = async () => {
    console.log("Loading rating for user:", userId);
    const userRating = await getAverageRating(userId);
    console.log("Rating received:", userRating);
    console.log("This shows ratings that OTHER users gave TO", userId);
    setRating(userRating);
  };

  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsMultipleSelection: true,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => ({ uri: asset.uri }));
      setUserData({ ...userData, photos: [...userData.photos, ...newImages] });
    }
  };

  const handleSaveProfile = async () => {
    if (!userData.name || !userData.age) {
      Alert.alert("Missing Info", "Please add your name and age before saving.");
      return;
    }
    
    if (userData.photos.length === 0) {
      Alert.alert("Missing Photos", "Please add at least one photo before saving.");
      return;
    }

    setSaving(true);
    
    // Convert photo URIs to array of strings for Firebase
    const photoUrls = userData.photos.map(photo => photo.uri);
    
    const profileData = {
      name: userData.name,
      age: userData.age,
      description: userData.description,
      tags: userData.tags,
      photos: photoUrls,
    };

    const success = await saveUserProfile(userId, profileData);
    
    setSaving(false);
    
    if (success) {
      Alert.alert("Success", "Your profile has been saved and is now visible to other users!");
    } else {
      Alert.alert("Error", "Failed to save profile. Please try again.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.profileContainer}>
      <Text style={styles.profileText}>👤 Profile Page</Text>

      {/* Rating Display */}
      <View style={styles.ratingCard}>
        <Text style={styles.ratingTitle}>Your Profile Rating</Text>
        <View style={styles.ratingDisplay}>
          <Text style={styles.ratingStars}>
            {"⭐".repeat(Math.round(parseFloat(rating.average)))}
          </Text>
          <Text style={styles.ratingNumber}>
            {rating.average > 0 ? `${rating.average} / 5.0` : "Not rated yet"}
          </Text>
          <Text style={styles.ratingCount}>
            {rating.count > 0 ? `Based on ${rating.count} rating${rating.count !== 1 ? 's' : ''}` : "Be the first to get rated!"}
          </Text>
        </View>
        <Button title="Refresh Rating" onPress={loadRating} color="#FFD700" />
      </View>

      <ProfileInfo />

      <Button title="Pick Profile Pictures" onPress={pickProfileImage} />

      <View style={styles.buttonContainer}>
        <Button 
          title={saving ? "Saving..." : "Save Profile to Firebase"} 
          onPress={handleSaveProfile}
          disabled={saving}
          color="#4CAF50"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.imageGrid}
        showsVerticalScrollIndicator={false}
      >
        {userData.photos.map((img, index) => (
          <Image key={index} source={img} style={styles.profileImage} resizeMode="cover" />
        ))}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileContainer: {
    flexGrow: 1,
    alignItems: "center",
    padding: 10,
  },
  profileText: {
    fontSize: 18,
    marginBottom: 10,
  },
  ratingCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    width: "95%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  ratingDisplay: {
    alignItems: "center",
    marginBottom: 10,
  },
  ratingStars: {
    fontSize: 32,
    marginBottom: 5,
  },
  ratingNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 5,
  },
  ratingCount: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 10,
    width: "100%",
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    margin: 5,
  },
});