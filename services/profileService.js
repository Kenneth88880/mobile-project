// services/profileService.js
// React Native Firebase SDK - for production

import firestore from "@react-native-firebase/firestore";
import { generateGeohash } from "../utils/locationUtils";

// caching vars for later use 
const profileCache = {};
const duoPartnerCache = {};

/**
 * Get a user's profile by userId
 */
export const getUserProfile = async (userId) => {
  if (profileCache[userId]) return profileCache[userId];
  try {
    const doc = await firestore().collection("profiles").doc(userId).get();
    if (doc.exists) {
      const profile = { userId: doc.id, ...doc.data() };
      profileCache[userId] = profile;
      return profile;
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

// Call this after saveUserProfile so the cache doesn't serve stale data
export const invalidateProfileCache = (userId) => {
  delete profileCache[userId];
};

/**
 * Save/update a user's profile
 * Automatically generates geohash if latitude/longitude are present
 */
export const saveUserProfile = async (userId, data) => {
  try {
    const profileData = { ...data };
    if (profileData.latitude && profileData.longitude) {
      profileData.geohash = generateGeohash(profileData.latitude, profileData.longitude);
    }
    await firestore().collection("profiles").doc(userId).set(profileData, { merge: true });
    delete profileCache[userId]; // ← invalidate so next read is fresh
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
  if (duoPartnerCache[userId]) return duoPartnerCache[userId];
  try {
    const snapshot = await firestore()
      .collection("duos")
      .where("users", "array-contains", userId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const duoDoc = snapshot.docs[0];
    const duoData = duoDoc.data();
    const partnerId = duoData.users.find((id) => id !== userId);
    if (!partnerId) return null;

    const partnerProfile = await getUserProfile(partnerId);
    const result = {
      duoId: duoDoc.id,
      partnerId,
      partnerName: partnerProfile?.name || "Partner",
      partnerProfile,
      ...duoData,
    };
    duoPartnerCache[userId] = result;
    return result;
  } catch (error) {
    console.error("Error getting duo partner:", error);
    return null;
  }
};

export const invalidateDuoCache = (userId) => {
  delete duoPartnerCache[userId];
};

/**
 * Check if a user has already rated another user and get the rating
 */
export const hasUserRatedProfile = async (raterId, ratedUserId) => {
  try {
    const ratingsSnapshot = await firestore()
      .collection("ratings")
      .where("fromUserId", "==", raterId)
      .where("toUserId", "==", ratedUserId)
      .get();

    if (!ratingsSnapshot.empty) {
      const doc = ratingsSnapshot.docs[0];
      return {
        exists: true,
        ratingId: doc.id,
        rating: doc.data().rating,
        ...doc.data(),
      };
    }

    return { exists: false };
  } catch (error) {
    console.error("Error checking if user rated profile:", error);
    return { exists: false };
  }
};

/**
 * Get all duo pairs for matching
 */
export const getAllDuoPairs = async (userId, currentDuoId) => {
  try {
    console.log("Loading duo pairs for user:", userId);

    if (!currentDuoId) {
      console.log("No duo ID provided");
      return [];
    }

    console.log("Current duo ID:", currentDuoId);

    // Fire all 4 independent reads simultaneously
    const [swipesSnapshot, sentLikesSnapshot, receivedLikesSnapshot, duosSnapshot] =
      await Promise.all([
        firestore()
          .collection("duoSwipes")
          .where("fromDuoId", "==", currentDuoId)
          .get(),
        firestore()
          .collection("duoLikes")
          .where("fromDuoId", "==", currentDuoId)
          .get(),
        firestore()
          .collection("duoLikes")
          .where("toDuoId", "==", currentDuoId)
          .get(),
        firestore()
          .collection("duos")
          .where("status", "==", "active")
          .get(),
      ]);

    const excludedDuoIds = new Set([
      currentDuoId,
      ...swipesSnapshot.docs.map((d) => d.data().toDuoId),
      ...sentLikesSnapshot.docs.map((d) => d.data().toDuoId),
      ...receivedLikesSnapshot.docs.map((d) => d.data().fromDuoId),
    ]);

    // Filter out excluded and invalid duos before any profile fetching
    const eligibleDuos = duosSnapshot.docs.filter((doc) => {
      if (excludedDuoIds.has(doc.id)) return false;
      return (doc.data().users || []).length === 2;
    });

    if (eligibleDuos.length === 0) {
      console.log("No eligible duos found");
      return [];
    }

    // Collect all unique user IDs across eligible duos
    const allUserIds = new Set();
    eligibleDuos.forEach((doc) => {
      const { users } = doc.data();
      allUserIds.add(users[0]);
      allUserIds.add(users[1]);
    });

    // Fetch all profiles in one parallel batch
    const profileResults = await Promise.all(
      [...allUserIds].map((id) =>
        getUserProfile(id).then((profile) => [id, profile])
      )
    );
    const profileMap = Object.fromEntries(
      profileResults.filter(([, profile]) => profile != null)
    );

    // Assemble pairs — zero additional network calls
    const pairs = [];
    for (const doc of eligibleDuos) {
      const duoData = doc.data();
      const user1Profile = profileMap[duoData.users[0]];
      const user2Profile = profileMap[duoData.users[1]];

      if (!user1Profile || !user2Profile) continue;

      if (!user1Profile.photos?.length || !user2Profile.photos?.length) {
        console.log(`Skipping duo ${doc.id} - missing photos`);
        continue;
      }

      console.log(`✅ Including duo ${doc.id}: ${user1Profile.name} + ${user2Profile.name}`);
      pairs.push({
        id: doc.id,
        user1Profile,
        user2Profile,
        users: duoData.users,
        createdAt: duoData.createdAt,
      });
    }

    console.log("Total duo pairs loaded:", pairs.length);
    return pairs;
  } catch (error) {
    console.error("Error getting all duo pairs:", error);
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
  toUser2,
) => {
  try {
    console.log("Saving duo like:", { fromDuoId, toDuoId });

    // Pre-accept the sending duo since they initiated the like
    const acceptedBy = [fromUser1, fromUser2];

    await firestore().collection("duoLikes").add({
      fromDuoId,
      toDuoId,
      fromUser1,
      fromUser2,
      toUser1,
      toUser2,
      status: "pending",
      acceptedBy,
      timestamp: firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
    });

    console.log("✅ Duo like saved successfully");
    return true;
  } catch (error) {
    console.error("Error saving duo like:", error);
    return false;
  }
};

/**
 * Delete a duo like between two duos
 */
export const deleteDuoLikeBetween = async (fromDuoId, toDuoId) => {
  try {
    console.log("Deleting duo like between:", { fromDuoId, toDuoId });

    const snapshot = await firestore()
      .collection("duoLikes")
      .where("fromDuoId", "==", fromDuoId)
      .where("toDuoId", "==", toDuoId)
      .get();

    const batch = firestore().batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log("✅ Duo like deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting duo like:", error);
    return false;
  }
};

/**
 * Save a duo swipe (pass)
 */
export const saveDuoSwipe = async (fromDuoId, toDuoId) => {
  try {
    await firestore().collection("duoSwipes").add({
      fromDuoId,
      toDuoId,
      timestamp: firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
    });
    console.log("✅ Duo swipe saved");
    return true;
  } catch (error) {
    console.error("Error saving duo swipe:", error);
    return false;
  }
};

/**
 * Save or update a rating for a user
 */
export const saveRating = async (fromUserId, toUserId, rating) => {
  try {
    // Check if rating already exists
    const existingRating = await firestore()
      .collection("ratings")
      .where("fromUserId", "==", fromUserId)
      .where("toUserId", "==", toUserId)
      .get();

    if (!existingRating.empty) {
      // Update existing rating
      const ratingDoc = existingRating.docs[0];
      await ratingDoc.ref.update({
        rating,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      console.log("✅ Rating updated");
    } else {
      // Create new rating
      await firestore().collection("ratings").add({
        fromUserId,
        toUserId,
        rating,
        timestamp: firestore.FieldValue.serverTimestamp(),
        createdAt: new Date().toISOString(),
      });
      console.log("✅ Rating saved");
    }

    return true;
  } catch (error) {
    console.error("Error saving rating:", error);
    return false;
  }
};

/**
 * Update user's gender
 */
export const updateUserGender = async (userId, gender) => {
  try {
    await firestore().collection("profiles").doc(userId).update({
      gender,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ Updated gender for user ${userId}: ${gender}`);
    return true;
  } catch (error) {
    console.error("Error updating user gender:", error);
    throw error;
  }
};

/**
 * Update user's duo preference
 */
export const updateDuoPreference = async (userId, duoPreference) => {
  try {
    await firestore().collection("profiles").doc(userId).update({
      duoPreference,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ Updated duo preference for user ${userId}:`, duoPreference);
    return true;
  } catch (error) {
    console.error("Error updating duo preference:", error);
    throw error;
  }
};

/**
 * Get duo partner's profile including their gender and preferences
 */
export const getDuoPartnerProfile = async (partnerId) => {
  try {
    const partnerDoc = await firestore()
      .collection("profiles")
      .doc(partnerId)
      .get();

    if (!partnerDoc.exists) {
      return null;
    }

    return {
      uid: partnerDoc.id,
      userId: partnerDoc.id,
      ...partnerDoc.data(),
    };
  } catch (error) {
    console.error("Error getting duo partner profile:", error);
    throw error;
  }
};

/**
 * Check if two duos match based on their gender preferences
 */
export const checkDuoPreferenceMatch = (
  duo1User1,
  duo1User2,
  duo2User1,
  duo2User2,
) => {
  console.log("=== CHECKING DUO PREFERENCE MATCH ===");

  const duo1Pref1 =
    duo1User1.duoPreference?.interestedIn || duo1User1.genderPreference || [];
  const duo1Pref2 =
    duo1User2.duoPreference?.interestedIn || duo1User2.genderPreference || [];
  const duo2Pref1 =
    duo2User1.duoPreference?.interestedIn || duo2User1.genderPreference || [];
  const duo2Pref2 =
    duo2User2.duoPreference?.interestedIn || duo2User2.genderPreference || [];

  const duo1User1InterestedInDuo2 =
    duo1Pref1.length === 0
      ? true
      : duo1Pref1.includes(duo2User1.gender) && duo1Pref1.includes(duo2User2.gender);

  const duo1User2InterestedInDuo2 =
    duo1Pref2.length === 0
      ? true
      : duo1Pref2.includes(duo2User1.gender) && duo1Pref2.includes(duo2User2.gender);

  const duo1InterestedInDuo2 = duo1User1InterestedInDuo2 && duo1User2InterestedInDuo2;

  const duo2User1InterestedInDuo1 =
    duo2Pref1.length === 0
      ? true
      : duo2Pref1.includes(duo1User1.gender) && duo2Pref1.includes(duo1User2.gender);

  const duo2User2InterestedInDuo1 =
    duo2Pref2.length === 0
      ? true
      : duo2Pref2.includes(duo1User1.gender) && duo2Pref2.includes(duo1User2.gender);

  const duo2InterestedInDuo1 = duo2User1InterestedInDuo1 && duo2User2InterestedInDuo1;

  const finalMatch = duo1InterestedInDuo2 && duo2InterestedInDuo1;
  console.log(`FINAL RESULT: ${finalMatch ? "✅✅ MUTUAL MATCH" : "❌ NO MATCH"}`);
  return finalMatch;
};

/**
 * Get potential matches for a duo, filtered by gender preferences
 */
export const getFilteredPotentialMatches = async (
  currentUser,
  duoPartner,
  maxDistance,
) => {
  try {
    const usersSnapshot = await firestore()
      .collection("profiles")
      .where("duoPartnerId", "!=", null)
      .get();

    const potentialMatches = [];
    const processedDuos = new Set();

    for (const userDoc of usersSnapshot.docs) {
      const user = { uid: userDoc.id, userId: userDoc.id, ...userDoc.data() };

      if (user.uid === currentUser.uid || user.uid === duoPartner.uid) continue;

      const duoKey = [user.uid, user.duoPartnerId].sort().join("_");
      if (processedDuos.has(duoKey)) continue;
      if (!user.duoPartnerId) continue;

      const otherPartnerDoc = await firestore()
        .collection("profiles")
        .doc(user.duoPartnerId)
        .get();

      if (!otherPartnerDoc.exists) continue;

      const otherPartner = {
        uid: otherPartnerDoc.id,
        userId: otherPartnerDoc.id,
        ...otherPartnerDoc.data(),
      };

      const preferencesMatch = checkDuoPreferenceMatch(
        currentUser,
        duoPartner,
        user,
        otherPartner,
      );

      if (!preferencesMatch) continue;

      if (maxDistance && currentUser.location && user.location) {
        const distance = calculateDistance(
          currentUser.location.latitude,
          currentUser.location.longitude,
          user.location.latitude,
          user.location.longitude,
        );
        if (distance > maxDistance) continue;
      }

      potentialMatches.push(user);
      processedDuos.add(duoKey);
    }

    return potentialMatches;
  } catch (error) {
    console.error("Error getting filtered potential matches:", error);
    throw error;
  }
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRadians = (degrees) => degrees * (Math.PI / 180);

/**
 * Update max distance preference for a user
 */
export const updateMaxDistance = async (userId, maxDistance) => {
  try {
    await firestore()
      .collection("profiles")
      .doc(userId)
      .update({ maxDistance });
    console.log(`Max distance updated to ${maxDistance}km for user ${userId}`);
    return true;
  } catch (error) {
    console.error("Error updating max distance:", error);
    return false;
  }
};

/**
 * Update user location and geohash
 */
export const updateUserLocation = async (userId, latitude, longitude, city) => {
  try {
    const geohash = generateGeohash(latitude, longitude);

    await firestore()
      .collection("profiles")
      .doc(userId)
      .update({
        latitude,
        longitude,
        city: city || "Unknown",
        geohash,
        lastActive: firestore.FieldValue.serverTimestamp(),
      });

    console.log(`Location updated for user ${userId}: ${city} (${geohash})`);
    return true;
  } catch (error) {
    console.error("Error updating user location:", error);
    return false;
  }
};

/**
 * Query profiles within distance using geohash bounds
 */
export const getProfilesWithinDistance = async (
  centerLat,
  centerLon,
  radiusInKm,
  excludeUserId,
) => {
  try {
    const { getGeohashQueryBounds } = require("../utils/locationUtils");
    const bounds = getGeohashQueryBounds(centerLat, centerLon, radiusInKm);

    const promises = [];
    for (const bound of bounds) {
      const q = firestore()
        .collection("profiles")
        .orderBy("geohash")
        .startAt(bound[0])
        .endAt(bound[1]);
      promises.push(q.get());
    }

    const snapshots = await Promise.all(promises);
    const profiles = [];
    const seenIds = new Set();

    for (const snap of snapshots) {
      for (const doc of snap.docs) {
        const profile = { userId: doc.id, ...doc.data() };
        if (seenIds.has(doc.id) || doc.id === excludeUserId) continue;
        seenIds.add(doc.id);
        profiles.push(profile);
      }
    }

    console.log(`Found ${profiles.length} profiles within ${radiusInKm}km`);
    return profiles;
  } catch (error) {
    console.error("Error querying profiles by distance:", error);
    return [];
  }
};

/**
 * Accept a duo like.
 * If all 4 people accept, create a group chat.
 */
export const acceptDuoLike = async (
  likeId,
  currentUserId,
  currentDuoId,
  fromDuoId,
) => {
  try {
    console.log("Accepting duo like:", { likeId, currentUserId, currentDuoId, fromDuoId });

    const likeDoc = await firestore().collection("duoLikes").doc(likeId).get();
    if (!likeDoc.exists) throw new Error("Duo like not found");

    const likeData = likeDoc.data();
    const acceptedBy = likeData.acceptedBy || [];

    if (!acceptedBy.includes(currentUserId)) acceptedBy.push(currentUserId);

    await firestore().collection("duoLikes").doc(likeId).update({ acceptedBy });

    const fromDuoDoc = await firestore().collection("duos").doc(fromDuoId).get();
    const toDuoDoc = await firestore().collection("duos").doc(currentDuoId).get();

    if (!fromDuoDoc.exists || !toDuoDoc.exists) throw new Error("One or both duos not found");

    const fromDuoUsers = fromDuoDoc.data().users || [];
    const toDuoUsers = toDuoDoc.data().users || [];
    const allUsers = [...fromDuoUsers, ...toDuoUsers];

    console.log("All users involved:", allUsers);
    console.log("Users who accepted:", acceptedBy);

    if (acceptedBy.length === 4) {
      console.log("All 4 users accepted! Creating group chat...");

      const profilePromises = allUsers.map((userId) => getUserProfile(userId));
      const profiles = await Promise.all(profilePromises);
      const names = profiles.map((p) => p?.name || "Unknown").join(", ");

      const chatData = {
        participants: allUsers,
        duoIds: [fromDuoId, currentDuoId],
        groupName: names,
        isGroupChat: true,
        isPrivate: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastMessage: "",
        lastMessageTime: firestore.FieldValue.serverTimestamp(),
        type: "duo_match",
      };

      const chatRef = await firestore().collection("chats").add(chatData);
      console.log("Created chat:", chatRef.id);

      await firestore().collection("duoLikes").doc(likeId).delete();
      await saveDuoSwipe(currentDuoId, fromDuoId);
      await saveDuoSwipe(fromDuoId, currentDuoId);

      return { success: true, matched: true, chatId: chatRef.id };
    } else {
      console.log(`Waiting for more acceptances (${acceptedBy.length}/4)`);
      return { success: true, matched: false, acceptedCount: acceptedBy.length };
    }
  } catch (error) {
    console.error("Error accepting duo like:", error);
    throw error;
  }
};

/**
 * Decline a duo like.
 * Immediately removes the like and creates swipes so they don't show up again.
 */
export const declineDuoLike = async (likeId, currentDuoId, fromDuoId) => {
  try {
    console.log("Declining duo like:", { likeId, currentDuoId, fromDuoId });
    await firestore().collection("duoLikes").doc(likeId).delete();
    await saveDuoSwipe(currentDuoId, fromDuoId);
    await saveDuoSwipe(fromDuoId, currentDuoId);
    return { success: true };
  } catch (error) {
    console.error("Error declining duo like:", error);
    throw error;
  }
};

/**
 * Reset test data for dev mode.
 * Clears all likes and swipes for the current duo.
 */
export const resetTestData = async (currentDuoId) => {
  try {
    console.log("Resetting test data for duo:", currentDuoId);

    const [likesFrom, likesTo, swipesFrom, swipesTo] = await Promise.all([
      firestore().collection("duoLikes").where("fromDuoId", "==", currentDuoId).get(),
      firestore().collection("duoLikes").where("toDuoId", "==", currentDuoId).get(),
      firestore().collection("duoSwipes").where("fromDuoId", "==", currentDuoId).get(),
      firestore().collection("duoSwipes").where("toDuoId", "==", currentDuoId).get(),
    ]);

    await Promise.all([
      ...likesFrom.docs.map((d) => d.ref.delete()),
      ...likesTo.docs.map((d) => d.ref.delete()),
      ...swipesFrom.docs.map((d) => d.ref.delete()),
      ...swipesTo.docs.map((d) => d.ref.delete()),
    ]);

    console.log("✅ Test data reset complete!");
    return { success: true };
  } catch (error) {
    console.error("Error resetting test data:", error);
    throw error;
  }
};

/**
 * Get a user's subscription status.
 * Uses the cached profile to avoid an extra Firestore read.
 * Returns "active" | "past_due" | "canceled" | null
 */
export const getSubscriptionStatus = async (userId) => {
  try {
    const profile = await getUserProfile(userId);
    console.log("sub status", profile?.subscriptionStatus);
    return profile?.subscriptionStatus ?? null;
  } catch (error) {
    console.error("Error getting subscription status:", error);
    return null;
  }
};

/**
 * Subscribe to real-time subscription status updates.
 * Returns an unsubscribe function — call it in useEffect cleanup.
 *
 * Usage:
 *   const unsub = subscribeToSubscriptionStatus(uid, (status) => {
 *     setSubscriptionStatus(status);
 *   });
 *   return () => unsub();
 */
export const subscribeToSubscriptionStatus = (userId, onChange) => {
  return firestore()
    .collection("profiles")
    .doc(userId)
    .onSnapshot(
      (doc) => {
        const status = doc.exists ? (doc.data()?.subscriptionStatus ?? null) : null;
        onChange(status);
      },
      (error) => {
        console.error("Error listening to subscription status:", error);
      }
    );
};