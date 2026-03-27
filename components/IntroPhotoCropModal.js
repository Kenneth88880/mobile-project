// components/IntroPhotoCropModal.js
import React, { useState, useRef, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  View,
  Image,
  Modal,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
} from "react-native";
import { Text, Button, IconButton, useTheme } from "react-native-paper";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const FRAME_HEIGHT = 250;
const HEADER_HEIGHT = 60;
const FOOTER_HEIGHT = 150;
const AVAILABLE_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;
const FRAME_TOP = (AVAILABLE_HEIGHT - FRAME_HEIGHT) / 2;

export default function IntroPhotoCropModal({
  visible,
  photoUri,
  initialCropY = 0,
  onConfirm,
  onCancel,
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [imageNaturalSize, setImageNaturalSize] = useState(null);
  const panY = useRef(new Animated.Value(0)).current;
  const lastPanY = useRef(0);
  const maxOffsetRef = useRef(0);

  useEffect(() => {
    if (photoUri && visible) {
      Image.getSize(
        photoUri,
        (width, height) => {
          const displayHeight = (height / width) * SCREEN_WIDTH;
          setImageNaturalSize({ width: SCREEN_WIDTH, height: displayHeight });

          const maxOff = Math.max(0, displayHeight - FRAME_HEIGHT);
          maxOffsetRef.current = maxOff;

          const initOff = -(initialCropY * maxOff);
          panY.setValue(initOff);
          lastPanY.current = initOff;
        },
        (error) => console.error("Failed to get image size:", error),
      );
    }

    if (!visible) {
      setImageNaturalSize(null);
      panY.setValue(0);
      lastPanY.current = 0;
      maxOffsetRef.current = 0;
    }
  }, [photoUri, visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 3,
      onPanResponderGrant: () => {
        panY.setOffset(lastPanY.current);
        panY.setValue(0);
      },
      onPanResponderMove: Animated.event([null, { dy: panY }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gs) => {
        panY.flattenOffset();
        let val = lastPanY.current + gs.dy;
        val = Math.min(0, Math.max(-maxOffsetRef.current, val));
        lastPanY.current = val;
        Animated.spring(panY, {
          toValue: val,
          useNativeDriver: false,
          damping: 20,
          stiffness: 200,
        }).start();
      },
    }),
  ).current;

  const handleConfirm = () => {
    const maxOff = maxOffsetRef.current;
    if (maxOff === 0) {
      onConfirm(0);
      return;
    }
    const normalized = Math.abs(lastPanY.current) / maxOff;
    onConfirm(Math.max(0, Math.min(1, normalized)));
  };

  if (!visible || !photoUri) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {/* Header */}
        <View
          style={[styles.header, { borderBottomColor: theme.colors.outline }]}
        >
          <Text variant="titleMedium" style={{ fontWeight: "600" }}>
            Position Your Photo
          </Text>
          <IconButton icon="close" onPress={onCancel} />
        </View>

        {/* Crop area */}
        <View style={styles.cropArea} {...panResponder.panHandlers}>
          {imageNaturalSize && (
            <Animated.Image
              source={{ uri: photoUri }}
              style={{
                position: "absolute",
                top: FRAME_TOP,
                left: 0,
                width: imageNaturalSize.width,
                height: imageNaturalSize.height,
                transform: [{ translateY: panY }],
              }}
              resizeMode="cover"
            />
          )}

          {/* Top dark overlay */}
          <View style={[styles.overlay, { height: FRAME_TOP }]} />

          {/* Frame window */}
          <View style={styles.frame}>
            <View style={styles.frameBorder}>
              <Text style={styles.frameLabel}>Dating Card Preview</Text>
            </View>
          </View>

          {/* Bottom dark overlay */}
          <View
            style={[
              styles.overlay,
              { height: AVAILABLE_HEIGHT - FRAME_TOP - FRAME_HEIGHT },
            ]}
          />
        </View>

        {/* Footer */}
        <View
          style={[styles.footer, { backgroundColor: theme.colors.surface }]}
        >
          <Text
            variant="bodySmall"
            style={{
              color: theme.colors.onSurfaceVariant,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            Drag the photo up or down to center your face in the frame.
            {"\n"}This is how your intro photo will appear on the dating card.
          </Text>
          <View style={styles.buttonRow}>
            <Button mode="outlined" onPress={onCancel} style={{ flex: 1 }}>
              Cancel
            </Button>
            <View style={{ width: 12 }} />
            <Button
              mode="contained"
              onPress={handleConfirm}
              style={{ flex: 1 }}
            >
              Confirm Position
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: HEADER_HEIGHT,
    borderBottomWidth: 1,
  },
  cropArea: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: "100%",
    zIndex: 2,
  },
  frame: {
    height: FRAME_HEIGHT,
    width: "100%",
    zIndex: 2,
  },
  frameBorder: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#8B4A61",
    borderStyle: "dashed",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 8,
  },
  frameLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: FOOTER_HEIGHT,
    justifyContent: "center",
  },
  buttonRow: {
    flexDirection: "row",
  },
});
