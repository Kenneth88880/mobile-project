// services/profileService.js
// Web SDK version - saves to 'profiles' collection

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

/**
 * Get a user's profile by userId
 */
export const getUserProfile = async (userId) => {
  try {
    const docRef = doc(db, "profiles", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        userId: docSnap.id,
        ...docSnap.data(),
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

/**
 * Save/update a user's profile
 */
export const saveUserProfile = async (userId, data) => {
  try {
    const docRef = doc(db, "profiles", userId);
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving user profile:", error);
    return false;
  }
};

/**
 * Get average rating for a user
 */
export const getAverageRating = async (userId) => {
  try {
    const q = query(collection(db, "ratings"), where("toUserId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { average: "0.0", count: 0 };
    }

    let total = 0;
    querySnapshot.forEach((doc) => {
      total += doc.data().rating || 0;
    });

    const average = (total / querySnapshot.size).toFixed(1);

    return {
      average,
      count: querySnapshot.size,
    };
  } catch (error) {
    console.error("Error getting average rating:", error);
    return { average: "0.0", count: 0 };
  }
};

/**
 * Reset all duo data for a user
 */
export const resetAllDuoData = async (userId) => {
  try {
    // Delete all duo swipes where user is involved
    const swipesQuery = query(
      collection(db, "duoSwipes"),
      where("fromDuoId", "==", userId)
    );
    const swipesSnapshot = await getDocs(swipesQuery);
    for (const docSnapshot of swipesSnapshot.docs) {
      await deleteDoc(doc(db, "duoSwipes", docSnapshot.id));
    }

    // Delete all duo likes where user is involved
    const likesQuery1 = query(
      collection(db, "duoLikes"),
      where("fromUser1", "==", userId)
    );
    const likesQuery2 = query(
      collection(db, "duoLikes"),
      where("fromUser2", "==", userId)
    );
    const likesQuery3 = query(
      collection(db, "duoLikes"),
      where("toUser1", "==", userId)
    );
    const likesQuery4 = query(
      collection(db, "duoLikes"),
      where("toUser2", "==", userId)
    );

    const [likes1, likes2, likes3, likes4] = await Promise.all([
      getDocs(likesQuery1),
      getDocs(likesQuery2),
      getDocs(likesQuery3),
      getDocs(likesQuery4),
    ]);

    const allLikes = [
      ...likes1.docs,
      ...likes2.docs,
      ...likes3.docs,
      ...likes4.docs,
    ];

    for (const docSnapshot of allLikes) {
      await deleteDoc(doc(db, "duoLikes", docSnapshot.id));
    }

    // Delete all matches/chats where user is participant
    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", userId)
    );
    const chatsSnapshot = await getDocs(chatsQuery);
    for (const docSnapshot of chatsSnapshot.docs) {
      await deleteDoc(doc(db, "chats", docSnapshot.id));
    }

    return true;
  } catch (error) {
    console.error("Error resetting duo data:", error);
    return false;
  }
};

/**
 * Get current user's duo partner
 */
export const getCurrentDuoPartner = async (userId) => {
  try {
    // Check if user is in any active duo
    const q = query(
      collection(db, "duos"),
      where("users", "array-contains", userId),
      where("status", "==", "active"),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const duoDoc = querySnapshot.docs[0];
      const duoData = duoDoc.data();
      const partnerId = duoData.users.find((id) => id !== userId);

      if (partnerId) {
        const partnerProfile = await getUserProfile(partnerId);

        return {
          duoId: duoDoc.id,
          partnerId,
          partnerName: partnerProfile?.name || "Partner",
          partnerProfile,
          ...duoData,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting duo partner:", error);
    return null;
  }
};

/**
 * Get all duo pairs for matching
 */
export const getAllDuoPairs = async (userId) => {
  try {
    console.log("Loading duo pairs for user:", userId);

    // Get the current user's duo
    const currentDuo = await getCurrentDuoPartner(userId);
    if (!currentDuo) {
      console.log("No current duo found");
      return [];
    }

    console.log("Current duo ID:", currentDuo.duoId);

    // Get duo pairs that haven't been swiped yet
    const swipesQuery = query(
      collection(db, "duoSwipes"),
      where("fromDuoId", "==", currentDuo.duoId)
    );
    const swipesSnapshot = await getDocs(swipesQuery);
    const swipedDuoIds = swipesSnapshot.docs.map((doc) => doc.data().toDuoId);
    console.log("Already swiped duo IDs:", swipedDuoIds);

    // Get all active duo pairs, excluding own duo and already swiped
    const duosQuery = query(
      collection(db, "duos"),
      where("status", "==", "active")
    );
    const duosSnapshot = await getDocs(duosQuery);

    const pairs = [];
    for (const docSnapshot of duosSnapshot.docs) {
      const duoData = docSnapshot.data();
      const duoId = docSnapshot.id;

      // Skip own duo and already swiped duos
      if (duoId === currentDuo.duoId || swipedDuoIds.includes(duoId)) {
        continue;
      }

      // Get profiles for both users
      const users = duoData.users || [];
      if (users.length !== 2) continue;

      const user1Profile = await getUserProfile(users[0]);
      const user2Profile = await getUserProfile(users[1]);

      if (user1Profile && user2Profile) {
        pairs.push({
          id: duoId,
          user1Profile,
          user2Profile,
          users: users,
          createdAt: duoData.createdAt,
        });
      }
    }

    console.log("Total duo pairs loaded:", pairs.length);
    return pairs;
  } catch (error) {
    console.error("Error loading duo pairs:", error);
    return [];
  }
};

/**
 * Save a duo like
 */
export const saveDuoLike = async (
  fromDuoId,
  toDuoId,
  fromUser1,
  fromUser2,
  toUser1,
  toUser2
) => {
  try {
    await addDoc(collection(db, "duoLikes"), {
      fromDuoId,
      toDuoId,
      fromUser1,
      fromUser2,
      toUser1,
      toUser2,
      status: "pending",
      acceptedBy: [],
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Error saving duo like:", error);
    return false;
  }
};

/**
 * Save a duo swipe (pass or like)
 */
export const saveDuoSwipe = async (fromDuoId, toDuoId, action) => {
  try {
    await addDoc(collection(db, "duoSwipes"), {
      fromDuoId,
      toDuoId,
      action, // 'pass' or 'like'
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Error saving duo swipe:", error);
    return false;
  }
};
