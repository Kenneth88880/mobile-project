import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import {
  Gender,
  DuoPreference,
  getGenderColor,
  getGenderLabel,
} from "../types";

interface DuoPreferenceComponentProps {
  yourGender: Gender;
  partnerGender: Gender;
  yourPreference: DuoPreference;
  partnerPreference: DuoPreference;
  onUpdatePreference: (newPreference: DuoPreference) => Promise<void>;
}

export const DuoPreferenceComponent: React.FC<DuoPreferenceComponentProps> = ({
  yourGender,
  partnerGender,
  yourPreference,
  partnerPreference,
  onUpdatePreference,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedGenders, setSelectedGenders] = useState<Gender[]>(
    yourPreference?.interestedIn || []
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const allGenders: Gender[] = ["male", "female", "non-binary"];

  useEffect(() => {
    setSelectedGenders(yourPreference?.interestedIn || []);
  }, [yourPreference]);

  const toggleGender = (gender: Gender) => {
    if (selectedGenders.includes(gender)) {
      setSelectedGenders(selectedGenders.filter((g) => g !== gender));
    } else {
      setSelectedGenders([...selectedGenders, gender]);
    }
  };

  const handleSave = async () => {
    if (selectedGenders.length === 0) {
      alert("Please select at least one gender preference");
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdatePreference({ interestedIn: selectedGenders });
      setIsModalVisible(false);
    } catch (error) {
      console.error("Error updating preference:", error);
      alert("Failed to update preference");
    } finally {
      setIsUpdating(false);
    }
  };

  const renderGenderBox = (
    gender: Gender,
    isSelected: boolean,
    onPress?: () => void
  ) => {
    const color = getGenderColor(gender);
    const label = getGenderLabel(gender);

    return (
      <TouchableOpacity
        style={[
          styles.genderBox,
          { backgroundColor: isSelected ? color : "#F0F0F0" },
          { borderColor: color, borderWidth: 2 },
        ]}
        onPress={onPress}
        disabled={!onPress}
      >
        <Text
          style={[styles.genderText, { color: isSelected ? "#FFFFFF" : color }]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Duo Gender Preferences</Text>

      {/* Your Duo Display */}
      <View style={styles.duoContainer}>
        <View style={styles.duoMember}>
          <Text style={styles.label}>You</Text>
          {renderGenderBox(yourGender, true)}
        </View>

        <View style={styles.arrow}>
          <Text style={styles.arrowText}>+</Text>
        </View>

        <View style={styles.duoMember}>
          <Text style={styles.label}>Partner</Text>
          {renderGenderBox(partnerGender, true)}
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.preferencesContainer}>
        {/* Your Preference */}
        <View style={styles.preferenceRow}>
          <Text style={styles.preferenceLabel}>Your Duo Preference:</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsModalVisible(true)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.preferenceDisplay}>
          {yourPreference?.interestedIn?.length > 0 ? (
            yourPreference.interestedIn.map((gender) => (
              <View key={gender} style={styles.miniGenderBox}>
                {renderGenderBox(gender, true)}
              </View>
            ))
          ) : (
            <Text style={styles.noPreferenceText}>Not set</Text>
          )}
        </View>

        {/* Partner's Preference (Read-only) */}
        <View style={[styles.preferenceRow, { marginTop: 16 }]}>
          <Text style={styles.preferenceLabel}>Partner's Duo Preference:</Text>
        </View>
        <View style={styles.preferenceDisplay}>
          {partnerPreference?.interestedIn?.length > 0 ? (
            partnerPreference.interestedIn.map((gender) => (
              <View key={gender} style={styles.miniGenderBox}>
                {renderGenderBox(gender, true)}
              </View>
            ))
          ) : (
            <Text style={styles.noPreferenceText}>Not set</Text>
          )}
        </View>
      </View>

      {/* Selection Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Gender Preferences</Text>
              <Text style={styles.modalSubtitle}>
                Choose which genders your duo is interested in matching with
              </Text>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.instructionText}>
                Tap on the other duo gender to change preference:
              </Text>

              <View style={styles.modalDuoDisplay}>
                <Text style={styles.otherDuoLabel}>Other Duo Gender</Text>
                <View style={styles.genderOptionsGrid}>
                  {allGenders.map((gender) => (
                    <View key={gender} style={styles.genderOption}>
                      {renderGenderBox(
                        gender,
                        selectedGenders.includes(gender),
                        () => toggleGender(gender)
                      )}
                    </View>
                  ))}
                </View>
              </View>

              <Text style={styles.selectionSummary}>
                Selected:{" "}
                {selectedGenders.length > 0
                  ? selectedGenders.map(getGenderLabel).join(", ")
                  : "None"}
              </Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setSelectedGenders(yourPreference?.interestedIn || []);
                  setIsModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
                disabled={isUpdating}
              >
                <Text style={styles.saveButtonText}>
                  {isUpdating ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  duoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  duoMember: {
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  arrow: {
    marginHorizontal: 16,
  },
  arrowText: {
    fontSize: 24,
    color: "#999",
  },
  genderBox: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  genderText: {
    fontSize: 16,
    fontWeight: "600",
  },
  preferencesContainer: {
    marginTop: 16,
  },
  preferenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  preferenceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  editButton: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  preferenceDisplay: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  miniGenderBox: {
    marginRight: 8,
    marginBottom: 8,
  },
  noPreferenceText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  modalScroll: {
    padding: 20,
  },
  instructionText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  modalDuoDisplay: {
    marginBottom: 20,
  },
  otherDuoLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  genderOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  genderOption: {
    marginBottom: 8,
  },
  selectionSummary: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    marginTop: 16,
    padding: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F0F0F0",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#4A90E2",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
