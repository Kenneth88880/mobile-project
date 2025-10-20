import React, { useState } from "react";
import { View, Text, Button, Image, ScrollView, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";

// Handles profile photo logic
export default function ProfileScreen() {
  const [profileImages, setProfileImages] = useState([]);

  // pick images for profile tab
  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsMultipleSelection: true,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => ({ uri: asset.uri }));
      setProfileImages([...profileImages, ...newImages]);
    }
  };

  return (
    <View style={styles.profileContainer}>
      <Text style={styles.profileText}>👤 Profile Page</Text>
      <Button title="Pick Profile Pictures" onPress={pickProfileImage} />

      <ScrollView
        contentContainerStyle={styles.imageGrid}
        showsVerticalScrollIndicator={false}
      >
        {profileImages.map((img, index) => (
          <Image key={index} source={img} style={styles.profileImage} resizeMode="cover" />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  profileContainer: {
    flex: 1,
    alignItems: "center",
    padding: 10,
  },
  profileText: {
    fontSize: 18,
    marginBottom: 10,
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
