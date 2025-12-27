// services/photoService.js
import storage from "@react-native-firebase/storage";
import { CURRENT_USER_ID } from "./UserConfig";

/**
 * Upload a profile photo to Firebase Storage
 * @param {string} imageUri - Local URI of the image
 * @returns {Promise<string>} Download URL of the uploaded image
 */
export const uploadProfilePhoto = async (imageUri) => {
  try {
    if (!CURRENT_USER_ID) {
      throw new Error("User not authenticated");
    }

    // Generate unique filename
    const filename = `profile_${Date.now()}.jpg`;
    // ✅ FIXED: Match your Firebase Storage rules path: profile_photos/{userId}/{filename}
    const reference = storage().ref(
      `profile_photos/${CURRENT_USER_ID}/${filename}`
    );

    console.log(`Uploading photo: ${filename}`);

    // Upload file
    await reference.putFile(imageUri);

    // Get download URL
    const downloadUrl = await reference.getDownloadURL();

    console.log(`Photo uploaded successfully: ${downloadUrl}`);
    return downloadUrl;
  } catch (error) {
    console.error("Error uploading photo:", error);
    throw error;
  }
};

/**
 * Delete a profile photo from Firebase Storage
 * @param {string} photoUrl - Download URL of the photo to delete
 * @returns {Promise<boolean>} Success status
 */
export const deleteProfilePhoto = async (photoUrl) => {
  try {
    if (!photoUrl || !photoUrl.includes("firebase")) {
      console.log("Invalid photo URL, skipping deletion");
      return false;
    }

    // Extract the file path from the URL
    // Firebase Storage URLs format: https://firebasestorage.googleapis.com/v0/b/...
    const urlParts = photoUrl.split("/o/");
    if (urlParts.length < 2) {
      console.log("Could not parse photo URL");
      return false;
    }

    const pathPart = urlParts[1].split("?")[0];
    const filePath = decodeURIComponent(pathPart);

    console.log(`Deleting photo: ${filePath}`);

    // Delete the file
    const reference = storage().ref(filePath);
    await reference.delete();

    console.log("Photo deleted successfully");
    return true;
  } catch (error) {
    // If file doesn't exist, consider it a success
    if (error.code === "storage/object-not-found") {
      console.log("Photo already deleted or doesn't exist");
      return true;
    }

    console.error("Error deleting photo:", error);
    throw error;
  }
};

/**
 * Delete all photos for a user (useful for account deletion)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteAllUserPhotos = async (userId) => {
  try {
    // ✅ FIXED: Match your Firebase Storage rules path
    const folderRef = storage().ref(`profile_photos/${userId}`);
    const list = await folderRef.listAll();

    // Delete all files in the folder
    const deletePromises = list.items.map((item) => item.delete());
    await Promise.all(deletePromises);

    console.log(`Deleted ${list.items.length} photos for user ${userId}`);
    return true;
  } catch (error) {
    console.error("Error deleting all user photos:", error);
    throw error;
  }
};
