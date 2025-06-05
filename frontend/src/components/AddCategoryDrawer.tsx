import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface AddCategoryDrawerProps {
  bottomSheetModalRef: React.RefObject<BottomSheetModal | null>;
  onSave: (category: {
    name: string;
    type: 'Income' | 'Expense';
    icon: string;
    color: string;
  }) => void;
}

const availableIcons = [
  'cart', 'silverware-fork-knife', 'ticket', 'bus', 'heart-pulse', 'gift',
  'account-group', 'shopping', 'file-document', 'gas-station', 'bank-transfer',
  'home', 'car', 'airplane', 'phone', 'laptop', 'book', 'music', 'gamepad',
  'camera', 'coffee', 'pizza', 'dumbbell', 'wallet', 'credit-card',
  'bank', 'briefcase', 'school', 'hospital-marker', 'wrench', 'lightbulb',
];

const availableColors = [
  '#6B8AFE', '#505F92', '#E6427B', '#C09046', '#3A8A47', '#E74C3C',
  '#5D3F92', '#C1834B', '#FF5B9E', '#F39C12', '#3498DB', '#95A5A6',
  '#1ABC9C', '#9B59B6', '#2ECC71', '#E67E22', '#34495E', '#16A085',
];

export default function AddCategoryDrawer({ bottomSheetModalRef, onSave }: AddCategoryDrawerProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'Income' | 'Expense'>('Expense');
  const [selectedIcon, setSelectedIcon] = useState('cart');
  const [selectedColor, setSelectedColor] = useState('#6B8AFE');

  const snapPoints = useMemo(() => ['90%'], []);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />,
    []
  );

  const handleSave = () => {
    if (name.trim()) {
      onSave({
        name: name.trim(),
        type,
        icon: selectedIcon,
        color: selectedColor,
      });
      // Reset form
      setName('');
      setType('Expense');
      setSelectedIcon('cart');
      setSelectedColor('#6B8AFE');
      bottomSheetModalRef.current?.dismiss();
    }
  };

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.indicator}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Add Category</Text>
        <ScrollView style={styles.form}>
          {/* Category Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category Type</Text>
            <View style={styles.typeContainer}>
              {['Income', 'Expense'].map((categoryType) => (
                <TouchableOpacity
                  key={categoryType}
                  style={[
                    styles.typeButton,
                    type === categoryType && styles.typeButtonActive,
                  ]}
                  onPress={() => setType(categoryType as 'Income' | 'Expense')}
                >
                  <MaterialCommunityIcons
                    name={categoryType === 'Income' ? 'arrow-up' : 'arrow-down'}
                    size={20}
                    color={type === categoryType ? '#FFFFFF' : '#8E8E93'}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      type === categoryType && styles.typeButtonTextActive,
                    ]}
                  >
                    {categoryType}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter category name"
                placeholderTextColor="#8E8E93"
                maxLength={20}
              />
            </View>
          </View>

          {/* Icon Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Icon</Text>
            <View style={styles.iconGrid}>
              {availableIcons.map((iconName) => (
                <TouchableOpacity
                  key={iconName}
                  style={[
                    styles.iconButton,
                    selectedIcon === iconName && styles.iconButtonActive,
                  ]}
                  onPress={() => setSelectedIcon(iconName)}
                >
                  <MaterialCommunityIcons
                    name={iconName as any}
                    size={24}
                    color={selectedIcon === iconName ? '#6B8AFE' : '#8E8E93'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Color Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Color</Text>
            <View style={styles.colorGrid}>
              {availableColors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorButtonSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Preview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <View style={styles.previewContainer}>
              <View style={[styles.previewIconContainer, { backgroundColor: selectedColor }]}>
                <MaterialCommunityIcons
                  name={selectedIcon as any}
                  size={24}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.previewName}>{name || 'Category Name'}</Text>
              <Text style={styles.previewType}>{type}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSave}>
            <Text style={styles.submitButtonText}>Add Category</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#1E1E1E',
  },
  indicator: {
    backgroundColor: '#8E8E93',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  form: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: '#6B8AFE',
  },
  typeButtonText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    color: '#8E8E93',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconButton: {
    width: 48,
    height: 48,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonActive: {
    backgroundColor: '#2C2C2E',
    borderWidth: 2,
    borderColor: '#6B8AFE',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorButtonSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
  },
  previewIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  previewType: {
    color: '#8E8E93',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#6B8AFE',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 