// services/profileService.js
// React Native Firebase SDK - for production

import firestore from "@react-native-firebase/firestore";

/**
 * Get a user's profile by userId
 */
export const getUserProfile = async (userId) => {
  try {
    const doc = await firestore().collection("profiles").doc(userId).get();

    if (doc.exists) {
      return {
        userId: doc.id,
        ...doc.data(),
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
    await firestore()
      .collection("profiles")
      .doc(userId)
      .set(data, { merge: true });
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
    const snapshot = await firestore()
      .collection("ratings")
      .where("toUserId", "==", userId)
      .get();

    if (snapshot.empty) {
      return { average: "0.0", count: 0 };
    }

    let total = 0;
    snapshot.forEach((doc) => {
      total += doc.data().rating || 0;
    });

    const average = (total / snapshot.size).toFixed(1);

    return {
      average,
      count: snapshot.size,
    };
  } catch (error) {
    console.error("Error getting average rating:", error);
    return { average: "0.0", count: 0 };
  }
};

/**
 * Get current user's duo partner
 */
export const getCurrentDuoPartner = async (userId) => {
  try {
    // Check if user is in any active duo
    const snapshot = await firestore()
      .collection("duos")
      .where("users", "array-contains", userId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const duoDoc = snapshot.docs[0];
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
    const swipesSnapshot = await firestore()
      .collection("duoSwipes")
      .where("fromDuoId", "==", currentDuo.duoId)
      .get();

    const swipedDuoIds = swipesSnapshot.docs.map((doc) => doc.data().toDuoId);
    console.log("Already swiped duo IDs:", swipedDuoIds);

    // Get all active duo pairs, excluding own duo and already swiped
    const duosSnapshot = await firestore()
      .collection("duos")
      .where("status", "==", "active")
      .get();

    const pairs = [];
    for (const doc of duosSnapshot.docs) {
      const duoData = doc.data();
      const duoId = doc.id;

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
    await firestore().collection("duoLikes").add({
      fromDuoId,
      toDuoId,
      fromUser1,
      fromUser2,
      toUser1,
      toUser2,
      status: "pending",
      acceptedBy: [],
      timestamp: firestore.FieldValue.serverTimestamp(),
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
    await firestore().collection("duoSwipes").add({
      fromDuoId,
      toDuoId,
      action, // 'pass' or 'like'
      timestamp: firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Error saving duo swipe:", error);
    return false;
  }
};
