import React, { useContext } from "react";
import { View, Image, Button, ScrollView, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { UserContext } from "../context/UserContext";

export default function PhotoPicker() {
  const { userData, setUserData } = useContext(UserContext);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => asset.uri);
      setUserData({ ...userData, photos: [...userData.photos, ...newImages] });
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Pick Images" onPress={pickImage} />
      <ScrollView horizontal style={styles.scroll}>
        {userData.photos.map((uri, index) => (
          <Image key={index} source={{ uri }} style={styles.image} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", marginTop: 10 },
  scroll: { marginTop: 10 },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
  },
});
