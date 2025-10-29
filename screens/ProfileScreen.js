import React, { useContext } from "react";
import { View, Text, Button, Image, ScrollView, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { UserContext } from "../context/UserContext";
import ProfileInfo from "../components/ProfileInfo";

export default function ProfileScreen() {
  const { userData, setUserData } = useContext(UserContext);

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

  return (
    <ScrollView contentContainerStyle={styles.profileContainer}>
      <Text style={styles.profileText}>👤 Profile Page</Text>

      <ProfileInfo />

      <Button title="Pick Profile Pictures" onPress={pickProfileImage} />

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
