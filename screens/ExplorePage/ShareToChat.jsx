import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { ActivityIndicator, Avatar, Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { getPhotoUrl } from "../../services/placesService";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.6;
const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80";

function resolveImageUrl(place) {
  // Matches PlaceInfo priority: photo_name first, then photo_reference, then image_url
  if (place.photo_name) {
    const url = getPhotoUrl(place.photo_name, 800);
    if (url) return url;
  }
  if (place.photo_reference) {
    const url = getPlacesPhotoUrl(place.photo_reference);
    if (url) return url;
  }
  if (place.image_url && place.image_url.length > 0) {
    return place.image_url;
  }
  return PLACEHOLDER_IMAGE;
}

export default function ShareToChat({
  visible,
  place,
  currentUserId,
  onClose,
}) {
  const theme = useTheme();
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Slide in / out
  useEffect(() => {
    if (visible) {
      setSelectedIds(new Set());
      setSent(false);
      setSending(false);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Load chats
  useEffect(() => {
    if (!visible || !currentUserId) return;
    setLoadingChats(true);

    const unsub = firestore()
      .collection("chats")
      .where("participants", "array-contains", currentUserId)
      .onSnapshot((snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter(
            (c) =>
              c.status !== "archived" &&
              !(c.hiddenFor || []).includes(currentUserId),
          )
          .sort((a, b) => {
            const at = a.lastMessageTime?.seconds || 0;
            const bt = b.lastMessageTime?.seconds || 0;
            return bt - at;
          });
        setChats(list);
        setLoadingChats(false);
      });

    return () => unsub();
  }, [visible, currentUserId]);

  const toggleSelect = (chatId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) {
        next.delete(chatId);
      } else {
        next.add(chatId);
      }
      return next;
    });
  };

  const handleSendAll = async () => {
    if (selectedIds.size === 0 || sending || sent || !place) return;
    setSending(true);

    // Use the same image resolution as PlaceInfo
    const imageUrl = resolveImageUrl(place);

    const suggestionText = `📅 Date Suggestion\n📍 ${place.name}${
      place.address ? `\n📌 ${place.address.replace(/\n/g, ", ")}` : ""
    }${place.category ? `\n🏷 ${place.category}` : ""}`;

    const selectedChats = chats.filter((c) => selectedIds.has(c.id));

    await Promise.all(
      selectedChats.map(async (chat) => {
        try {
          await firestore()
            .collection("chats")
            .doc(chat.id)
            .collection("messages")
            .add({
              text: suggestionText,
              type: "place_suggestion",
              suggestion: {
                place: place.name,
                address: place.address || "",
                category: place.category || "",
                imageUrl: imageUrl, 
                allInfo: place,
              },
              createdAt: firestore.FieldValue.serverTimestamp(),
              user: {
                _id: currentUserId,
                name: "You",
              },
            });

          const unreadUpdate = {};
          (chat.participants || []).forEach((id) => {
            if (id !== currentUserId) {
              unreadUpdate[`unreadCount.${id}`] =
                (chat.unreadCount?.[id] || 0) + 1;
            }
          });

          await firestore()
            .collection("chats")
            .doc(chat.id)
            .update({
              lastMessageText: `📅 ${place.name}`,
              lastMessageTime: firestore.FieldValue.serverTimestamp(),
              ...unreadUpdate,
            });
        } catch (err) {
          console.error(`Error sending to chat ${chat.id}:`, err);
        }
      }),
    );

    setSending(false);
    setSent(true);

    setTimeout(() => {
      onClose();
    }, 800);
  };

  const selectedCount = selectedIds.size;

  const renderChat = ({ item }) => {
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={styles.chatRow}
        onPress={() => toggleSelect(item.id)}
        activeOpacity={0.7}
      >
        {/* Avatar with selection ring */}
        <View style={styles.avatarWrapper}> 
          {(
            <Avatar.Image size={52} source={{ uri: item.isPrivate ? currentUserId === item.creatorID ? item.curPhoto : item.otherPhoto : item.groupPhoto }}/>
          )}
          {isSelected && (
            <View
              style={[
                styles.selectedRing,
                { borderColor: theme.colors.primary },
              ]}
            />
          )}
        </View>

        <Text
          style={[styles.chatName, { color: theme.colors.onSurface }]}
          numberOfLines={1}
        >
          {console.log(item)}
          {item.isPrivate ? currentUserId === item.creatorID ? item.curUserName : item.otherUserName : item.groupName }
        </Text>

        {/* Checkbox */}
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: isSelected
                ? theme.colors.primary
                : "transparent",
              borderColor: isSelected
                ? theme.colors.primary
                : theme.colors.outline,
            },
          ]}
        >
          {isSelected && (
            <MaterialCommunityIcons
              name="check"
              size={16}
              color={theme.colors.onPrimary}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Dim backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Sliding sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: theme.colors.surface },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle bar */}
        <View style={styles.handleBar}>
          <View
            style={[
              styles.handle,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />
        </View>

        {/* Header */}
        <View
          style={[
            styles.sheetHeader,
            { borderBottomColor: theme.colors.outlineVariant },
          ]}
        >
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            Share to Chat
          </Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons
              name="close"
              size={22}
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>

        {/* Place preview */}
        {place && (
          <View
            style={[
              styles.placePreview,
              { borderBottomColor: theme.colors.outlineVariant },
            ]}
          >
            <MaterialCommunityIcons
              name="map-marker"
              size={20}
              color={theme.colors.primary}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text
                variant="titleSmall"
                style={{ color: theme.colors.onSurface }}
                numberOfLines={1}
              >
                {place.name}
              </Text>
              {place.category ? (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {place.category}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Chat list */}
        {loadingChats ? (
          <ActivityIndicator
            size="large"
            color={theme.colors.primary}
            style={{ marginTop: 32 }}
          />
        ) : chats.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="chat-outline"
              size={40}
              color={theme.colors.outlineVariant}
            />
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
            >
              No chats yet
            </Text>
          </View>
        ) : (
          <FlatList
            data={chats}
            renderItem={renderChat}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.chatList,
              selectedCount > 0 && { paddingBottom: 90 },
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Send button */}
        {selectedCount > 0 && (
          <View
            style={[
              styles.sendBar,
              {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: sent
                    ? theme.colors.primaryContainer
                    : theme.colors.primary,
                },
              ]}
              onPress={handleSendAll}
              disabled={sending || sent}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.onPrimary}
                />
              ) : sent ? (
                <>
                  <MaterialCommunityIcons
                    name="check"
                    size={20}
                    color={theme.colors.onPrimaryContainer}
                  />
                  <Text
                    style={[
                      styles.sendBtnText,
                      { color: theme.colors.onPrimaryContainer },
                    ]}
                  >
                    Sent!
                  </Text>
                </>
              ) : (
                <Text
                  style={[
                    styles.sendBtnText,
                    { color: theme.colors.onPrimary },
                  ]}
                >
                  Send to {selectedCount}{" "}
                  {selectedCount === 1 ? "chat" : "chats"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  handleBar: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  placePreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  chatList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  avatarWrapper: {
    position: "relative",
    width: 52,
    height: 52,
  },
  selectedRing: {
    position: "absolute",
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 30,
    borderWidth: 2.5,
  },
  chatName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
});