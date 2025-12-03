// services/profileService.js
// ✅ FIXED: Using React Native Firebase instead of web SDK

import firestore from "@react-native-firebase/firestore";

/**
 * Get a user's profile by userId
 */
export const getUserProfile = async (userId) => {
  try {
    const doc = await firestore().collection("users").doc(userId).get();

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
      .collection("users")
      .doc(userId)
      .set(data, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving user profile:", error);
    return false;
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
      const user1Profile = await getUserProfile(duoData.user1);
      const user2Profile = await getUserProfile(duoData.user2);

      if (user1Profile && user2Profile) {
        pairs.push({
          id: duoId,
          user1Profile,
          user2Profile,
          users: [duoData.user1, duoData.user2],
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
 * Get current user's duo partner
 */
export const getCurrentDuoPartner = async (userId) => {
  try {
    // Check if user is user1
    let snapshot = await firestore()
      .collection("duos")
      .where("user1", "==", userId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const duoDoc = snapshot.docs[0];
      const duoData = duoDoc.data();
      const partnerProfile = await getUserProfile(duoData.user2);

      return {
        duoId: duoDoc.id,
        partnerId: duoData.user2,
        partnerName: partnerProfile?.name || "Partner",
        partnerProfile,
        ...duoData,
      };
    }

    // Check if user is user2
    snapshot = await firestore()
      .collection("duos")
      .where("user2", "==", userId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const duoDoc = snapshot.docs[0];
      const duoData = duoDoc.data();
      const partnerProfile = await getUserProfile(duoData.user1);

      return {
        duoId: duoDoc.id,
        partnerId: duoData.user1,
        partnerName: partnerProfile?.name || "Partner",
        partnerProfile,
        ...duoData,
      };
    }

    return null;
  } catch (error) {
    console.error("Error getting duo partner:", error);
    return null;
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
 * Delete duo like between two duos
 */
export const deleteDuoLikeBetween = async (fromDuoId, toDuoId) => {
  try {
    const snapshot = await firestore()
      .collection("duoLikes")
      .where("fromDuoId", "==", fromDuoId)
      .where("toDuoId", "==", toDuoId)
      .get();

    const deletePromises = snapshot.docs.map((doc) => doc.ref.delete());
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error("Error deleting duo like:", error);
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

/**
 * Accept a duo like
 */
export const acceptDuoLike = async (likeId, userId, yourDuoId, fromDuoId) => {
  try {
    const likeRef = firestore().collection("duoLikes").doc(likeId);
    const likeDoc = await likeRef.get();

    if (!likeDoc.exists) {
      console.error("Duo like not found");
      return false;
    }

    const likeData = likeDoc.data();
    const acceptedBy = likeData.acceptedBy || [];

    // Add user to acceptedBy if not already there
    if (!acceptedBy.includes(userId)) {
      acceptedBy.push(userId);

      await likeRef.update({
        acceptedBy,
        lastUpdated: firestore.FieldValue.serverTimestamp(),
      });
    }

    // Check if both users in the receiving duo have accepted
    const duo = await getCurrentDuoPartner(userId);
    if (duo) {
      const bothAccepted =
        acceptedBy.includes(duo.user1 || userId) &&
        acceptedBy.includes(duo.user2 || duo.partnerId);

      if (bothAccepted) {
        // Create a match/chat
        await createDuoMatch(yourDuoId, fromDuoId, likeId);

        // Update status to matched
        await likeRef.update({
          status: "matched",
          matchedAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    return true;
  } catch (error) {
    console.error("Error accepting duo like:", error);
    return false;
  }
};

/**
 * Delete a duo like
 */
export const deleteDuoLike = async (likeId) => {
  try {
    await firestore().collection("duoLikes").doc(likeId).delete();
    return true;
  } catch (error) {
    console.error("Error deleting duo like:", error);
    return false;
  }
};

/**
 * Create a chat when both duos match
 */
const createDuoMatch = async (duo1Id, duo2Id, likeId) => {
  try {
    // Get both duos
    const duo1Doc = await firestore().collection("duos").doc(duo1Id).get();
    const duo2Doc = await firestore().collection("duos").doc(duo2Id).get();

    if (!duo1Doc.exists || !duo2Doc.exists) {
      console.error("One or both duos not found");
      return false;
    }

    const duo1Data = duo1Doc.data();
    const duo2Data = duo2Doc.data();

    const participants = [
      duo1Data.user1,
      duo1Data.user2,
      duo2Data.user1,
      duo2Data.user2,
    ];

    // Create chat
    await firestore()
      .collection("chats")
      .add({
        participants,
        duo1Id,
        duo2Id,
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastMessage: "Match created! Start chatting!",
        lastMessageTime: firestore.FieldValue.serverTimestamp(),
        unreadCount: {
          [duo1Data.user1]: 0,
          [duo1Data.user2]: 0,
          [duo2Data.user1]: 0,
          [duo2Data.user2]: 0,
        },
      });

    return true;
  } catch (error) {
    console.error("Error creating duo match:", error);
    return false;
  }
};

/**
 * Save a rating for a user
 */
export const saveRating = async (fromUserId, toUserId, rating) => {
  try {
    await firestore().collection("ratings").add({
      fromUserId,
      toUserId,
      rating,
      timestamp: firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Error saving rating:", error);
    return false;
  }
};

/**
 * Get average rating for a user
 */
export const getUserRating = async (userId) => {
  try {
    const snapshot = await firestore()
      .collection("ratings")
      .where("toUserId", "==", userId)
      .get();

    if (snapshot.empty) {
      return { average: 0, count: 0 };
    }

    let total = 0;
    snapshot.forEach((doc) => {
      total += doc.data().rating || 0;
    });

    return {
      average: total / snapshot.size,
      count: snapshot.size,
    };
  } catch (error) {
    console.error("Error getting user rating:", error);
    return { average: 0, count: 0 };
  }
};

/**
 * Create or update a duo partnership
 */
export const createDuoPartnership = async (user1Id, user2Id) => {
  try {
    // Check if duo already exists
    let snapshot = await firestore()
      .collection("duos")
      .where("user1", "==", user1Id)
      .where("user2", "==", user2Id)
      .where("status", "==", "active")
      .get();

    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }

    // Check reverse
    snapshot = await firestore()
      .collection("duos")
      .where("user1", "==", user2Id)
      .where("user2", "==", user1Id)
      .where("status", "==", "active")
      .get();

    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }

    // Create new duo
    const duoRef = await firestore().collection("duos").add({
      user1: user1Id,
      user2: user2Id,
      status: "active",
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    return duoRef.id;
  } catch (error) {
    console.error("Error creating duo partnership:", error);
    return null;
  }
};

/**
 * End a duo partnership
 */
export const endDuoPartnership = async (duoId) => {
  try {
    await firestore().collection("duos").doc(duoId).update({
      status: "inactive",
      endedAt: firestore.FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error ending duo partnership:", error);
    return false;
  }
};
