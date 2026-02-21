import React, { useState } from "react";
import { View, StyleSheet, ScrollView, SafeAreaView } from "react-native";
import {
  Text,
  Chip,
  Button,
  useTheme,
  Surface,
  IconButton,
} from "react-native-paper";
import { AVAILABLE_TAGS } from "../../tags";

const TagSelectionScreen = ({ onNext, onBack, initialTags = [] }) => {
  const theme = useTheme();
  const [selectedTags, setSelectedTags] = useState(initialTags);

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      if (selectedTags.length >= 5) {
        alert("You can select up to 5 tags maximum");
        return;
      }
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleNext = () => {
    if (selectedTags.length < 3) {
      alert("Please select at least 3 tags");
      return;
    }
    onNext(selectedTags);
  };

  const canContinue = selectedTags.length >= 3 && selectedTags.length <= 5;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {onBack && (
        <View style={styles.backButton}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={onBack}
            iconColor={theme.colors.primary}
          />
        </View>
      )}
      <View style={styles.progressCounter}>
        <Text
          style={[styles.counterText, { color: theme.colors.onSurfaceVariant }]}
        >
          6/6
        </Text>
      </View>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.primary }]}>
          Pick your interests
        </Text>
        <Text
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Select at least 3, up to 5 tags
        </Text>
        <Surface
          style={[
            styles.counterCard,
            { backgroundColor: theme.colors.secondaryContainer },
          ]}
        >
          <Text
            style={[
              styles.counterText,
              { color: theme.colors.onSecondaryContainer },
            ]}
          >
            {selectedTags.length} / 5 selected
            {selectedTags.length < 3 && (
              <Text style={{ fontSize: 14 }}> (minimum 3)</Text>
            )}
          </Text>
        </Surface>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.tagsGrid}>
          {AVAILABLE_TAGS.map((tag, index) => (
            <Chip
              key={index}
              selected={selectedTags.includes(tag)}
              onPress={() => toggleTag(tag)}
              style={styles.tagChip}
              mode={selectedTags.includes(tag) ? "flat" : "outlined"}
            >
              {tag}
            </Chip>
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outline,
          },
        ]}
      >
        <Button
          mode="contained"
          onPress={handleNext}
          style={styles.button}
          disabled={!canContinue}
        >
          Finish
        </Button>
      </View>
    </SafeAreaView>
  );
};

export default TagSelectionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 10,
    zIndex: 10,
  },
  progressCounter: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  counterText: {
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    padding: 20,
    paddingTop: 10,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  counterCard: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  counterText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  tagChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  button: {
    marginVertical: 5,
  },
});
