import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { CURRENT_USER_ID } from '../UserConfig';
import { getUserProfile, saveUserProfile, getAverageRating, resetAllDuoData } from '../profileService';
import PhotoPicker from '../components/PhotoPicker';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Pre-defined tags users can choose from
const AVAILABLE_TAGS = [
  // Interests
  '🎮 Gaming',
  '📚 Reading',
  '🎬 Movies',
  '🎵 Music',
  '🎨 Art',
  '📸 Photography',
  '✈️ Travel',
  '🍳 Cooking',
  '🏋️ Fitness',
  '⚽ Sports',
  '🧘 Yoga',
  '🎭 Theater',
  '🎤 Karaoke',
  '🎸 Live Music',
  '🌿 Nature',
  '🏕️ Camping',
  '🏖️ Beach',
  '⛷️ Skiing',
  '🏂 Snowboarding',
  '🚴 Cycling',
  '🏃 Running',
  '🧗 Rock Climbing',
  '🎣 Fishing',
  '🎯 Darts',
  '🎱 Pool/Billiards',
  '🎳 Bowling',
  
  // Food & Drink
  '☕ Coffee',
  '🍷 Wine',
  '🍺 Beer',
  '🍹 Cocktails',
  '🍕 Pizza',
  '🍣 Sushi',
  '🌮 Tacos',
  '🍔 Burgers',
  '🥗 Healthy Eating',
  '🌱 Vegetarian',
  '🥑 Vegan',
  '🍰 Desserts',
  
  // Lifestyle
  '🌃 Nightlife',
  '🏡 Homebody',
  '🎉 Party',
  '😌 Chill Vibes',
  '🌅 Early Bird',
  '🌙 Night Owl',
  '🐶 Dog Lover',
  '🐱 Cat Lover',
  '🐾 Pet Lover',
  '👨‍👩‍👧‍👦 Family Oriented',
  '💼 Career Focused',
  '🎓 Student',
  '🧠 Intellectual',
  '😂 Funny',
  '💪 Adventurous',
  '🤗 Friendly',
  '🧘‍♀️ Spiritual',
  '🙏 Religious',
  
  // Activities
  '🎪 Festivals',
  '🎨 Museums',
  '🎢 Theme Parks',
  '🎰 Casino',
  '🛍️ Shopping',
  '💆 Spa Days',
  '🎮 Board Games',
  '🧩 Puzzles',
  '📺 Netflix',
  '🎙️ Podcasts',
  '📖 Book Clubs',
  '🍿 Movie Nights',
  '🎲 Game Nights',
  '🏀 Basketball',
  '⚾ Baseball',
  '🏈 Football',
  '⚽ Soccer',
  '🏐 Volleyball',
  '🎾 Tennis',
  '🏓 Ping Pong',
  '🥊 Boxing',
  '🥋 Martial Arts',
  
  // Creative
  '✍️ Writing',
  '🎨 Painting',
  '🎬 Filmmaking',
  '🎹 Piano',
  '🎸 Guitar',
  '🎤 Singing',
  '💃 Dancing',
  '🎭 Acting',
  '🧶 Crafts',
  '🪡 Sewing',
  '🎪 DIY Projects',
  
  // Social
  '🗣️ Deep Conversations',
  '🤝 Networking',
  '🎤 Public Speaking',
  '🌍 Meeting New People',
  '💬 Texting',
  '📞 Phone Calls',
  '🎥 Video Chats',
  '👥 Group Hangouts',
  '🍻 Bar Hopping',
  '☕ Coffee Dates',
  '🍽️ Dinner Dates',
  '🎬 Movie Dates',
];

export default function ProfileScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    description: '',
    photos: [],
    tags: [],
    duoPartnerId: null,
  });
  const [duoPartnerProfile, setDuoPartnerProfile] = useState(null);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showPartnerSearch, setShowPartnerSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showPendingRequests, setShowPendingRequests] = useState(false);
  const [rating, setRating] = useState({ average: 0, count: 0 });
  const [loadingRating, setLoadingRating] = useState(true);

  useEffect(() => {
    loadProfile();
    loadPendingRequests();
    loadRating();
  }, []);

  const loadRating = async () => {
    setLoadingRating(true);
    try {
      const ratingData = await getAverageRating(CURRENT_USER_ID);
      setRating(ratingData);
    } catch (error) {
      console.error('Error loading rating:', error);
    } finally {
      setLoadingRating(false);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const requestsRef = collection(db, 'duoRequests');
      const q = query(requestsRef, where('toUserId', '==', CURRENT_USER_ID), where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      
      const requests = [];
      for (const docSnap of querySnapshot.docs) {
        const requestData = docSnap.data();
        
        const requesterProfile = await getUserProfile(requestData.fromUserId);
        if (requesterProfile) {
          requests.push({
            id: docSnap.id,
            ...requestData,
            requesterProfile: {
              ...requesterProfile,
              tags: Array.isArray(requesterProfile.tags) ? requesterProfile.tags : [],
            }
          });
        }
      }
      
      setPendingRequests(requests);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  const loadDuo = async () => {
    try {
      const duosRef = collection(db, 'duos');
      const q = query(duosRef, where('users', 'array-contains', CURRENT_USER_ID));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const duoDoc = querySnapshot.docs[0];
        const duoData = duoDoc.data();
        
        const partnerId = duoData.users.find(id => id !== CURRENT_USER_ID);
        
        if (partnerId) {
          const partnerProfile = await getUserProfile(partnerId);
          if (partnerProfile) {
            const cleanedPartnerProfile = {
              ...partnerProfile,
              tags: Array.isArray(partnerProfile.tags) ? partnerProfile.tags : [],
            };
            setDuoPartnerProfile(cleanedPartnerProfile);
            
            setProfile(prev => ({
              ...prev,
              duoPartnerId: partnerId
            }));
            
            return partnerId;
          }
        }
      } else {
        setDuoPartnerProfile(null);
      }
      
      return null;
    } catch (error) {
      console.error('Error loading duo:', error);
      return null;
    }
  };

  const loadProfile = async () => {
    try {
      const userProfile = await getUserProfile(CURRENT_USER_ID);
      
      if (userProfile) {
        const cleanedProfile = {
          name: userProfile.name || '',
          age: userProfile.age || '',
          description: userProfile.description || '',
          photos: Array.isArray(userProfile.photos) ? userProfile.photos : [],
          tags: Array.isArray(userProfile.tags) ? userProfile.tags : [],
          duoPartnerId: null,
        };
        
        setProfile(cleanedProfile);
        await loadDuo();
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSave = async () => {
    if (!profile.name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!profile.age.trim() || isNaN(profile.age)) {
      Alert.alert('Error', 'Please enter a valid age');
      return;
    }

    const success = await saveUserProfile(CURRENT_USER_ID, profile);
    if (success) {
      Alert.alert('Success', 'Profile saved!');
      setIsEditing(false);
      loadProfile();
    } else {
      Alert.alert('Error', 'Failed to save profile');
    }
  };

  const handlePhotosChange = (newPhotos) => {
    setProfile({ ...profile, photos: newPhotos });
  };

  const searchUsers = useCallback(async (searchText) => {
    if (!searchText || !searchText.trim() || searchText.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    
    try {
      const profilesRef = collection(db, 'profiles');
      const querySnapshot = await getDocs(profilesRef);
      
      const searchLower = searchText.trim().toLowerCase();
      const results = [];
      
      querySnapshot.forEach((docSnap) => {
        try {
          const userData = docSnap.data();
          
          if (docSnap.id !== CURRENT_USER_ID && userData && userData.name) {
            const nameLower = userData.name.toLowerCase();
            
            if (nameLower.includes(searchLower)) {
              results.push({
                id: docSnap.id,
                name: userData.name || 'Unknown',
                age: userData.age || '?',
                description: userData.description || '',
                photos: Array.isArray(userData.photos) ? userData.photos : [],
                tags: Array.isArray(userData.tags) ? userData.tags : [],
              });
            }
          }
        } catch (itemError) {
          console.error('Error processing user:', docSnap.id, itemError);
        }
      });
      
      const sortedResults = results.sort((a, b) => a.name.localeCompare(b.name));
      const limitedResults = sortedResults.slice(0, 50);
      
      setSearchResults(limitedResults);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Search Error', 'Failed to search users. Please try again.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const debouncedSearch = useCallback((text) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!text || !text.trim() || text.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timeout = setTimeout(() => {
      searchUsers(text);
    }, 500);

    setSearchTimeout(timeout);
  }, [searchTimeout, searchUsers]);

  const handleSendDuoRequest = async (partner) => {
    Alert.alert(
      'Send Duo Request',
      `Send a duo partner request to ${partner.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: async () => {
            try {
              const requestsRef = collection(db, 'duoRequests');
              const existingQuery = query(
                requestsRef,
                where('fromUserId', '==', CURRENT_USER_ID),
                where('toUserId', '==', partner.id)
              );
              const existingSnapshot = await getDocs(existingQuery);
              
              if (!existingSnapshot.empty) {
                Alert.alert('Request Already Sent', 'You already sent a request to this user.');
                return;
              }
              
              await addDoc(collection(db, 'duoRequests'), {
                fromUserId: CURRENT_USER_ID,
                toUserId: partner.id,
                status: 'pending',
                createdAt: serverTimestamp()
              });
              
              setShowPartnerSearch(false);
              setSearchQuery('');
              setSearchResults([]);
              
              Alert.alert('Request Sent!', `Your duo request has been sent to ${partner.name}. They will need to accept it.`);
            } catch (error) {
              console.error('Error sending duo request:', error);
              Alert.alert('Error', 'Failed to send duo request');
            }
          }
        }
      ]
    );
  };

  const handleAcceptRequest = async (request) => {
    Alert.alert(
      'Accept Duo Request',
      `Accept ${request.requesterProfile.name} as your duo partner?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'duoRequests', request.id), {
                status: 'accepted',
                acceptedAt: serverTimestamp()
              });
              
              const duosRef = collection(db, 'duos');
              const existingDuoQuery = query(duosRef, where('users', 'array-contains', CURRENT_USER_ID));
              const existingDuoSnapshot = await getDocs(existingDuoQuery);
              
              if (!existingDuoSnapshot.empty) {
                const duoDoc = existingDuoSnapshot.docs[0];
                await updateDoc(doc(db, 'duos', duoDoc.id), {
                  users: [CURRENT_USER_ID, request.fromUserId]
                });
              } else {
                await addDoc(collection(db, 'duos'), {
                  users: [CURRENT_USER_ID, request.fromUserId],
                  createdAt: serverTimestamp()
                });
              }
              
              await loadProfile();
              await loadPendingRequests();
              setShowPendingRequests(false);
              
              Alert.alert('Success!', `${request.requesterProfile.name} is now your duo partner!`);
            } catch (error) {
              console.error('Error accepting request:', error);
              Alert.alert('Error', 'Failed to accept request');
            }
          }
        }
      ]
    );
  };

  const handleDeclineRequest = async (request) => {
    Alert.alert(
      'Decline Request',
      `Decline duo request from ${request.requesterProfile.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'duoRequests', request.id));
              await loadPendingRequests();
              Alert.alert('Request Declined', 'The duo request has been declined.');
            } catch (error) {
              console.error('Error declining request:', error);
              Alert.alert('Error', 'Failed to decline request');
            }
          }
        }
      ]
    );
  };

  const handleRemovePartner = () => {
    Alert.alert(
      'Remove Duo Partner',
      'Are you sure you want to remove your duo partner?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const duosRef = collection(db, 'duos');
              const q = query(duosRef, where('users', 'array-contains', CURRENT_USER_ID));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                const duoDoc = querySnapshot.docs[0];
                await deleteDoc(doc(db, 'duos', duoDoc.id));
              }
              
              setProfile({ ...profile, duoPartnerId: null });
              setDuoPartnerProfile(null);
              
              Alert.alert('Success', 'Duo partner removed');
            } catch (error) {
              console.error('Error removing duo partner:', error);
              Alert.alert('Error', 'Failed to remove duo partner');
            }
          }
        }
      ]
    );
  };

  const toggleTag = (tag) => {
    const currentTags = Array.isArray(profile.tags) ? profile.tags : [];
    
    if (currentTags.includes(tag)) {
      setProfile({
        ...profile,
        tags: currentTags.filter(t => t !== tag)
      });
    } else {
      if (currentTags.length >= 5) {
        Alert.alert('Limit Reached', 'You can only select up to 5 tags');
        return;
      }
      setProfile({
        ...profile,
        tags: [...currentTags, tag]
      });
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Text key={i} style={styles.star}>★</Text>);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Text key={i} style={styles.star}>⯨</Text>);
      } else {
        stars.push(<Text key={i} style={styles.starEmpty}>☆</Text>);
      }
    }
    
    return stars;
  };

  const handleResetDuoData = async () => {
    Alert.alert(
      '🔄 Reset All Duo Data?',
      'This will delete all:\n• Duo likes (requests)\n• Swipe history\n• Matches\n• Group chats\n\nYou will see ALL profiles again!',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await resetAllDuoData();
              if (result.success) {
                Alert.alert(
                  '✅ Reset Complete!',
                  `Successfully deleted:\n` +
                  `• ${result.likesDeleted} likes\n` +
                  `• ${result.swipesDeleted} swipes\n` +
                  `• ${result.matchesDeleted} matches\n` +
                  `• ${result.chatsDeleted} chats\n\n` +
                  `All profiles will now reappear!`
                );
              } else {
                Alert.alert('Error', 'Failed to reset data. Please try again.');
              }
            } catch (error) {
              console.error('Error resetting duo data:', error);
              Alert.alert('Error', 'An error occurred while resetting data.');
            }
          }
        }
      ]
    );
  };

  const TagPickerModal = useMemo(() => {
    const selectedTags = Array.isArray(profile.tags) ? profile.tags : [];
    
    return (
      <Modal
        visible={showTagPicker}
        animationType="slide"
        transparent={false}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Your Tags</Text>
            <Text style={styles.modalSubtitle}>
              Select up to 5 tags ({selectedTags.length}/5)
            </Text>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.tagsGrid}>
              {AVAILABLE_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagOption,
                      isSelected && styles.tagOptionSelected
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[
                      styles.tagOptionText,
                      isSelected && styles.tagOptionTextSelected
                    ]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowTagPicker(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }, [showTagPicker, profile.tags]);

  const PendingRequestsModal = useMemo(() => {
    return (
      <Modal
        visible={showPendingRequests}
        animationType="slide"
        transparent={false}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Duo Requests</Text>
            <Text style={styles.modalSubtitle}>
              {pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''}
            </Text>
          </View>

          <FlatList
            data={pendingRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.requestItem}>
                <View style={styles.requestHeader}>
                  <View style={styles.requestAvatar}>
                    {item.requesterProfile.photos && item.requesterProfile.photos.length > 0 ? (
                      <Image 
                        source={{ uri: item.requesterProfile.photos[0] }} 
                        style={styles.requestAvatarImage} 
                      />
                    ) : (
                      <Text style={styles.requestAvatarText}>👤</Text>
                    )}
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>
                      {item.requesterProfile.name}, {item.requesterProfile.age}
                    </Text>
                    {item.requesterProfile.description && (
                      <Text style={styles.requestDescription} numberOfLines={2}>
                        {item.requesterProfile.description}
                      </Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRequest(item)}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => handleDeclineRequest(item)}
                  >
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyRequestsContainer}>
                <Text style={styles.emptyRequestsText}>No pending duo requests</Text>
              </View>
            }
          />

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => setShowPendingRequests(false)}
            >
              <Text style={styles.cancelModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }, [showPendingRequests, pendingRequests]);

  const PartnerSearchModal = useMemo(() => {
    const isValidSearch = searchQuery && searchQuery.trim().length >= 2;
    
    return (
      <Modal
        visible={showPartnerSearch}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowPartnerSearch(false);
          setSearchQuery('');
          setSearchResults([]);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Find Duo Partner</Text>
            <Text style={styles.modalSubtitle}>Search by name (min 2 characters)</Text>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Enter name to search..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                debouncedSearch(text);
              }}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          {searching ? (
            <View style={styles.searchingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.searchingText}>Searching...</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => handleSendDuoRequest(item)}
                >
                  <View style={styles.searchResultAvatar}>
                    {item.photos && item.photos.length > 0 ? (
                      <Image source={{ uri: item.photos[0] }} style={styles.searchResultImage} />
                    ) : (
                      <Text style={styles.searchResultAvatarText}>👤</Text>
                    )}
                  </View>
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName}>{item.name}, {item.age}</Text>
                    {item.description ? (
                      <Text style={styles.searchResultDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptySearchContainer}>
                  {!isValidSearch ? (
                    <Text style={styles.emptySearchText}>
                      Please enter at least 2 characters to search
                    </Text>
                  ) : (
                    <Text style={styles.emptySearchText}>
                      No users found with that name
                    </Text>
                  )}
                </View>
              }
            />
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => {
                setShowPartnerSearch(false);
                setSearchQuery('');
                setSearchResults([]);
                if (searchTimeout) {
                  clearTimeout(searchTimeout);
                }
              }}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }, [showPartnerSearch, searchQuery, searchResults, searching, searchTimeout, debouncedSearch]);

  if (!isEditing) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Profile</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.photosSection}>
          <Text style={styles.photosSectionTitle}>You</Text>
          {profile.photos && profile.photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {profile.photos.map((photo, index) => (
                <Image
                  key={index}
                  source={{ uri: photo }}
                  style={styles.photo}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noPhotos}>
              <Text style={styles.noPhotosText}>No photos added</Text>
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.name}>
            {profile.name || 'No name'}, {profile.age || '?'}
          </Text>
          
          {/* Rating Display */}
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {renderStars(parseFloat(rating.average))}
            </View>
            <Text style={styles.ratingText}>
              {rating.count > 0 ? `${rating.average} (${rating.count} rating${rating.count !== 1 ? 's' : ''})` : 'No ratings yet'}
            </Text>
          </View>

          <Text style={styles.description}>
            {profile.description || 'No description'}
          </Text>

          {Array.isArray(profile.tags) && profile.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              <Text style={styles.tagsLabel}>Interests:</Text>
              <View style={styles.tagsDisplay}>
                {profile.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.duoSection}>
          <Text style={styles.duoSectionTitle}>Your Duo Partner</Text>
          
          {duoPartnerProfile ? (
            <>
              {duoPartnerProfile.photos && duoPartnerProfile.photos.length > 0 && (
                <View style={styles.photosSection}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {duoPartnerProfile.photos.map((photo, index) => (
                      <Image
                        key={index}
                        source={{ uri: photo }}
                        style={styles.photo}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.infoSection}>
                <Text style={styles.name}>
                  {duoPartnerProfile.name || 'No name'}, {duoPartnerProfile.age || '?'}
                </Text>
                <Text style={styles.description}>
                  {duoPartnerProfile.description || 'No description'}
                </Text>

                {duoPartnerProfile && Array.isArray(duoPartnerProfile.tags) && duoPartnerProfile.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    <Text style={styles.tagsLabel}>Interests:</Text>
                    <View style={styles.tagsDisplay}>
                      {duoPartnerProfile.tags.map((tag, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </>
          ) : (
            <View style={styles.noDuoPartner}>
              <Text style={styles.noDuoPartnerText}>
                No duo partner added yet. Tap Edit to find your duo partner!
              </Text>
            </View>
          )}
        </View>

        {/* Reset Duo Data Button */}
        <View style={styles.resetSection}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetDuoData}
          >
            <Text style={styles.resetButtonText}>🔄 Reset All Duo Data</Text>
          </TouchableOpacity>
          <Text style={styles.resetHint}>
            Use this to delete all likes and swipes so profiles reappear
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              loadProfile();
              setIsEditing(false);
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rating Display in Edit Mode */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Rating</Text>
        <View style={styles.ratingDisplayCard}>
          <View style={styles.starsContainer}>
            {renderStars(parseFloat(rating.average))}
          </View>
          <Text style={styles.ratingText}>
            {rating.count > 0 ? `${rating.average} out of 5 (${rating.count} rating${rating.count !== 1 ? 's' : ''})` : 'No ratings yet'}
          </Text>
          <Text style={styles.ratingHint}>
            Your rating is based on feedback from other users
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photos</Text>
        <PhotoPicker
          photos={profile.photos || []}
          onPhotosChange={handlePhotosChange}
          maxPhotos={6}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Name</Text>
        <TextInput
          style={styles.input}
          value={profile.name}
          onChangeText={(text) => setProfile({ ...profile, name: text })}
          placeholder="Enter your name"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Age</Text>
        <TextInput
          style={styles.input}
          value={profile.age}
          onChangeText={(text) => setProfile({ ...profile, age: text })}
          placeholder="Enter your age"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About Me</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={profile.description}
          onChangeText={(text) => setProfile({ ...profile, description: text })}
          placeholder="Tell us about yourself..."
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tags ({Array.isArray(profile.tags) ? profile.tags.length : 0}/5)</Text>
          <TouchableOpacity
            style={styles.addTagsButton}
            onPress={() => setShowTagPicker(true)}
          >
            <Text style={styles.addTagsButtonText}>
              {(!Array.isArray(profile.tags) || profile.tags.length === 0) ? 'Add Tags' : 'Edit Tags'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {Array.isArray(profile.tags) && profile.tags.length > 0 ? (
          <View style={styles.selectedTagsContainer}>
            {profile.tags.map((tag, index) => (
              <View key={index} style={styles.selectedTag}>
                <Text style={styles.selectedTagText}>{tag}</Text>
                <TouchableOpacity
                  onPress={() => toggleTag(tag)}
                  style={styles.removeTagButton}
                >
                  <Text style={styles.removeTagButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noTagsText}>
            No tags selected. Tap "Add Tags" to choose up to 5 tags.
          </Text>
        )}
      </View>

      <View style={styles.editSectionDivider}>
        <Text style={styles.editSectionTitle}>👥 Duo Partner</Text>
      </View>

      <View style={styles.section}>
        {duoPartnerProfile ? (
          <>
            <View style={styles.currentPartnerCard}>
              <View style={styles.currentPartnerInfo}>
                {duoPartnerProfile.photos && duoPartnerProfile.photos.length > 0 ? (
                  <Image 
                    source={{ uri: duoPartnerProfile.photos[0] }} 
                    style={styles.currentPartnerAvatar} 
                  />
                ) : (
                  <View style={styles.currentPartnerAvatar}>
                    <Text style={styles.currentPartnerAvatarText}>👤</Text>
                  </View>
                )}
                <View style={styles.currentPartnerDetails}>
                  <Text style={styles.currentPartnerName}>
                    {duoPartnerProfile.name}, {duoPartnerProfile.age}
                  </Text>
                  {duoPartnerProfile.description && (
                    <Text style={styles.currentPartnerDescription} numberOfLines={2}>
                      {duoPartnerProfile.description}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.removePartnerButton}
                onPress={handleRemovePartner}
              >
                <Text style={styles.removePartnerButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.noPartnerText}>
              You haven't added a duo partner yet.
            </Text>
            
            {pendingRequests.length > 0 && (
              <TouchableOpacity
                style={styles.viewRequestsButton}
                onPress={() => setShowPendingRequests(true)}
              >
                <Text style={styles.viewRequestsButtonText}>
                  📬 View Pending Requests ({pendingRequests.length})
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.findPartnerButton}
              onPress={() => setShowPartnerSearch(true)}
            >
              <Text style={styles.findPartnerButtonText}>🔍 Find Duo Partner</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {TagPickerModal}
      {PendingRequestsModal}
      {PartnerSearchModal}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  photosSection: {
    backgroundColor: '#fff',
    padding: 15,
    marginTop: 10,
  },
  photosSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  photo: {
    width: 120,
    height: 160,
    borderRadius: 10,
    marginRight: 10,
  },
  noPhotos: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  noPhotosText: {
    color: '#999',
    fontSize: 16,
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 10,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 10,
  },
  star: {
    fontSize: 20,
    color: '#FFD700',
  },
  starEmpty: {
    fontSize: 20,
    color: '#ddd',
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  ratingDisplayCard: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  ratingHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  tagsContainer: {
    marginTop: 10,
  },
  tagsLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  tagsDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  tagText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  duoSection: {
    marginTop: 20,
    backgroundColor: '#fff',
    padding: 20,
  },
  duoSectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  noDuoPartner: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    alignItems: 'center',
  },
  noDuoPartnerText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  addTagsButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addTagsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FF',
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  selectedTagText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  removeTagButton: {
    marginLeft: 4,
    padding: 4,
  },
  removeTagButtonText: {
    color: '#007AFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  noTagsText: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
  },
  editSectionDivider: {
    backgroundColor: '#007AFF',
    padding: 15,
    marginTop: 20,
  },
  editSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  currentPartnerCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  currentPartnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  currentPartnerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  currentPartnerAvatarText: {
    fontSize: 30,
  },
  currentPartnerDetails: {
    flex: 1,
  },
  currentPartnerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  currentPartnerDescription: {
    fontSize: 14,
    color: '#666',
  },
  removePartnerButton: {
    backgroundColor: '#ff4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  removePartnerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noPartnerText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  viewRequestsButton: {
    backgroundColor: '#FF9500',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  viewRequestsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  findPartnerButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  findPartnerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    padding: 20,
    backgroundColor: '#007AFF',
    paddingTop: 60,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  modalContent: {
    flex: 1,
    padding: 15,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  tagOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tagOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  tagOptionTextSelected: {
    color: '#fff',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  doneButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  searchingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  searchResultItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  searchResultAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  searchResultImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  searchResultAvatarText: {
    fontSize: 30,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  searchResultDescription: {
    fontSize: 14,
    color: '#666',
  },
  emptySearchContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
  },
  requestItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  requestHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  requestAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  requestAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  requestAvatarText: {
    fontSize: 30,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  requestDescription: {
    fontSize: 14,
    color: '#666',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyRequestsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyRequestsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  resetSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});