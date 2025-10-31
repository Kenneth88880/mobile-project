import { db } from "./firebaseConfig";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  setDoc,
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  serverTimestamp 
} from "firebase/firestore";

// Save or update user profile to Firebase
export const saveUserProfile = async (userId, userData) => {
  try {
    const profileRef = doc(db, "profiles", userId);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      // Update existing profile
      await updateDoc(profileRef, {
        ...userData,
        updatedAt: serverTimestamp(),
      });
      console.log("Profile updated successfully!");
    } else {
      // Create new profile
      await setDoc(profileRef, {
        ...userData,
        userId: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log("Profile created successfully!");
    }
    return true;
  } catch (error) {
    console.error("Error saving profile:", error);
    return false;
  }
};

// Get all profiles except current user
export const getAllProfiles = async (currentUserId) => {
  try {
    const profilesRef = collection(db, "profiles");
    const q = query(profilesRef, where("userId", "!=", currentUserId));
    const querySnapshot = await getDocs(q);
    
    const profiles = [];
    querySnapshot.forEach((doc) => {
      profiles.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    return profiles;
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return [];
  }
};

// Get a specific user profile
export const getUserProfile = async (userId) => {
  try {
    const profileRef = doc(db, "profiles", userId);
    const profileSnap = await getDoc(profileRef);
    
    if (profileSnap.exists()) {
      return {
        id: profileSnap.id,
        ...profileSnap.data(),
      };
    } else {
      console.log("No such profile!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
};

// Save rating for a profile
export const saveRating = async (fromUserId, toUserId, rating) => {
  try {
    await addDoc(collection(db, "ratings"), {
      fromUser: fromUserId,
      toUser: toUserId,
      rating: rating, // 1-5 stars
      timestamp: serverTimestamp(),
    });
    console.log(`Rated user ${toUserId} with ${rating} stars`);
    return true;
  } catch (error) {
    console.error("Error saving rating:", error);
    return false;
  }
};

// Get average rating for a user
export const getAverageRating = async (userId) => {
  try {
    console.log(`Fetching ratings WHERE toUser == "${userId}"`);
    const q = query(collection(db, "ratings"), where("toUser", "==", userId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`No ratings found for user ${userId}`);
      return { average: 0, count: 0 };
    }
    
    let totalRating = 0;
    let count = 0;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Rating from ${data.fromUser}: ${data.rating} stars`);
      totalRating += data.rating;
      count++;
    });
    
    const average = totalRating / count;
    console.log(`Average: ${average.toFixed(1)} from ${count} ratings`);
    return { average: average.toFixed(1), count };
  } catch (error) {
    console.error("Error getting average rating:", error);
    return { average: 0, count: 0 };
  }
};

// Save swipe action (like/pass)
export const saveSwipeAction = async (currentUserId, targetUserId, action) => {
  try {
    await addDoc(collection(db, "swipes"), {
      fromUser: currentUserId,
      toUser: targetUserId,
      action: action, // "like" or "pass"
      timestamp: serverTimestamp(),
    });
    
    // Check for match (if both users liked each other)
    const matchQuery = query(
      collection(db, "swipes"),
      where("fromUser", "==", targetUserId),
      where("toUser", "==", currentUserId),
      where("action", "==", "like")
    );
    
    const matchSnapshot = await getDocs(matchQuery);
    if (!matchSnapshot.empty && action === "like") {
      // It's a match!
      await addDoc(collection(db, "matches"), {
        users: [currentUserId, targetUserId],
        timestamp: serverTimestamp(),
      });
      console.log("🎉 It's a match!");
      return { match: true };
    }
    
    return { match: false };
  } catch (error) {
    console.error("Error saving swipe:", error);
    return { match: false };
  }
};