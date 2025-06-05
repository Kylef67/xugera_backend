import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, StatusBar, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type CategoryFormProps = {
  category?: {
    id: string;
    name: string;
    type: 'Income' | 'Expense';
    icon: string;
    color: string;
  };
  onSave: (category: any) => void;
  onCancel: () => void;
};

const categoryTypes = [
  { id: 'Income', name: 'Income', icon: 'arrow-up' },
  { id: 'Expense', name: 'Expense', icon: 'arrow-down' },
];

const categoryIcons = [
  { icon: 'cart', name: 'Groceries' },
  { icon: 'silverware-fork-knife', name: 'Food' },
  { icon: 'ticket', name: 'Leisure' },
  { icon: 'bus', name: 'Transport' },
  { icon: 'heart-pulse', name: 'Health' },
  { icon: 'gift', name: 'Gifts' },
  { icon: 'account-group', name: 'Family' },
  { icon: 'shopping', name: 'Shopping' },
  { icon: 'file-document', name: 'Bills' },
  { icon: 'gas-station', name: 'Gas' },
  { icon: 'bank-transfer', name: 'Transfer' },
  { icon: 'home', name: 'Home' },
  { icon: 'car', name: 'Car' },
  { icon: 'airplane', name: 'Travel' },
  { icon: 'phone', name: 'Phone' },
  { icon: 'laptop', name: 'Tech' },
  { icon: 'book', name: 'Education' },
  { icon: 'music', name: 'Music' },
  { icon: 'gamepad', name: 'Games' },
  { icon: 'camera', name: 'Photo' },
  { icon: 'coffee', name: 'Coffee' },
  { icon: 'pizza', name: 'Pizza' },
  { icon: 'dumbbell', name: 'Fitness' },
  { icon: 'wallet', name: 'Wallet' },
  { icon: 'credit-card', name: 'Card' },
  { icon: 'bank', name: 'Bank' },
  { icon: 'briefcase', name: 'Work' },
  { icon: 'school', name: 'School' },
  { icon: 'hospital-marker', name: 'Medical' },
  { icon: 'wrench', name: 'Tools' },
  { icon: 'lightbulb', name: 'Ideas' },
];

const colorOptions = [
  '#6B8AFE',
  '#505F92',
  '#E6427B',
  '#C09046',
  '#3A8A47',
  '#E74C3C',
  '#5D3F92',
  '#C1834B',
  '#FF5B9E',
  '#F39C12',
  '#3498DB',
  '#95A5A6',
  '#1ABC9C',
  '#9B59B6',
  '#2ECC71',
  '#E67E22',
  '#34495E',
  '#16A085',
];

export default function CategoryForm({ category, onSave, onCancel }: CategoryFormProps) {
  const insets = useSafeAreaInsets();
  const isEditing = !!category?.id;
  
  const [name, setName] = useState(category?.name || '');
  const [type, setType] = useState(category?.type || 'Expense');
  const [icon, setIcon] = useState(category?.icon || 'cart');
  const [color, setColor] = useState(category?.color || '#6B8AFE');
  
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showIconModal, setShowIconModal] = useState(false);

  const selectedTypeInfo = categoryTypes.find(t => t.id === type) || categoryTypes[1];

  const handleSave = () => {
    onSave({
      id: category?.id,
      name,
      type,
      icon,
      color,
    });
  };

  const renderTypeModal = () => (
    <Modal
      visible={showTypeModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowTypeModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { paddingTop: insets.top > 0 ? insets.top : 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category Type</Text>
            <TouchableOpacity onPress={() => setShowTypeModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalList}>
            {categoryTypes.map(categoryType => (
              <TouchableOpacity
                key={categoryType.id}
                style={styles.modalItem}
                onPress={() => {
                  setType(categoryType.id as 'Income' | 'Expense');
                  setShowTypeModal(false);
                }}
              >
                <View style={styles.typeInfo}>
                  <MaterialCommunityIcons name={categoryType.icon as any} size={24} color="#666" />
                  <Text style={styles.typeText}>{categoryType.name}</Text>
                </View>
                {type === categoryType.id && (
                  <MaterialCommunityIcons name="check" size={24} color="#6B8AFE" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderIconModal = () => (
    <Modal
      visible={showIconModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowIconModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { paddingTop: insets.top > 0 ? insets.top : 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Icon & Color</Text>
            <TouchableOpacity onPress={() => setShowIconModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalList}>
            <Text style={styles.sectionTitle}>Icon</Text>
            <View style={styles.iconGrid}>
              {categoryIcons.map(item => (
                <TouchableOpacity
                  key={item.icon}
                  style={[
                    styles.iconItem,
                    icon === item.icon && { borderColor: color }
                  ]}
                  onPress={() => setIcon(item.icon)}
                >
                  <MaterialCommunityIcons name={item.icon as any} size={32} color="#fff" />
                  <Text style={styles.iconText}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.sectionTitle}>Color</Text>
            <View style={styles.colorGrid}>
              {colorOptions.map(colorOption => (
                <TouchableOpacity
                  key={colorOption}
                  style={[
                    styles.colorItem,
                    { backgroundColor: colorOption },
                    color === colorOption && styles.colorItemSelected
                  ]}
                  onPress={() => setColor(colorOption)}
                />
              ))}
            </View>
            
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => setShowIconModal(false)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" />
      <View style={styles.statusBarSpace} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
          <MaterialCommunityIcons name="close" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit category' : 'New category'}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.doneButton}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.inputGroup}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Category name"
              placeholderTextColor="#999"
              maxLength={20}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Type</Text>
            <TouchableOpacity 
              style={styles.typeSelector}
              onPress={() => setShowTypeModal(true)}
            >
              <View style={styles.typeInfo}>
                <MaterialCommunityIcons name={selectedTypeInfo.icon as any} size={24} color="#666" />
                <Text style={styles.typeText}>{selectedTypeInfo.name}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Icon & Color</Text>
            <TouchableOpacity 
              style={styles.typeSelector}
              onPress={() => setShowIconModal(true)}
            >
              <View style={styles.typeInfo}>
                <View style={[styles.iconPreview, { backgroundColor: color }]}>
                  <MaterialCommunityIcons name={icon as any} size={24} color="#fff" />
                </View>
                <Text style={styles.typeText}>Customize</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Preview */}
        <View style={styles.inputGroup}>
          <Text style={styles.groupHeader}>Preview</Text>
          <View style={styles.previewContainer}>
            <View style={[styles.previewIconContainer, { backgroundColor: color }]}>
              <MaterialCommunityIcons
                name={icon as any}
                size={24}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.previewName}>{name || 'Category Name'}</Text>
            <Text style={styles.previewType}>{type}</Text>
          </View>
        </View>
      </ScrollView>
      
      {renderTypeModal()}
      {renderIconModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  statusBarSpace: {
    height: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '500',
  },
  doneButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#6B8AFE',
    borderRadius: 20,
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  inputGroup: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 24,
    overflow: 'hidden',
  },
  groupHeader: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  label: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    color: '#fff',
    padding: 0,
  },
  typeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '100%',
    marginTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
  },
  modalList: {
    padding: 16,
    paddingBottom: 80,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
    marginTop: 16,
    marginBottom: 12,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 8,
  },
  iconItem: {
    width: '30%',
    alignItems: 'center',
    padding: 12,
    paddingVertical: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#2C2C2E',
  },
  iconText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 14,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginHorizontal: -4,
  },
  colorItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    margin: 4,
    marginBottom: 8,
  },
  colorItemSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  applyButton: {
    backgroundColor: '#6B8AFE',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 60,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  iconPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
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
}); 