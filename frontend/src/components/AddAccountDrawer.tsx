import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Formik } from 'formik';
import * as Yup from 'yup';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { TextInput } from 'react-native-gesture-handler';

const accountIcons = [
  { name: 'credit-card', label: 'Credit Card' },
  { name: 'bank', label: 'Bank' },
  { name: 'wallet', label: 'Wallet' },
  { name: 'piggy-bank', label: 'Savings' },
  { name: 'cash', label: 'Cash' },
];

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Account name is required'),
  type: Yup.string().required('Account type is required'),
  balance: Yup.number().required('Initial balance is required'),
  currency: Yup.string().required('Currency is required'),
  includeInTotal: Yup.boolean(),
  description: Yup.string(),
  creditLimit: Yup.number().when('type', {
    is: 'debt',
    then: schema => schema.required('Credit limit is required for debt accounts'),
  }),
});

const initialValues = {
  name: '',
  description: '',
  type: 'regular',
  balance: '',
  currency: 'PHP',
  icon: 'credit-card',
  includeInTotal: true,
  creditLimit: '',
};

export type AddAccountDrawerProps = {
  bottomSheetModalRef: React.RefObject<BottomSheetModal>;
  onSubmit: (values: any) => void;
};

export default function AddAccountDrawer({ bottomSheetModalRef, onSubmit }: AddAccountDrawerProps) {
  const snapPoints = useMemo(() => ['90%'], []);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />,
    []
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.indicator}>
      <View style={styles.container}>
        <Text style={styles.title}>Add New Account</Text>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={onSubmit}>
          {({ handleChange, handleSubmit, values, errors, setFieldValue }) => (
            <ScrollView style={styles.form}>
              {/* Account Type Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Type</Text>
                <View style={styles.typeContainer}>
                  {['regular', 'debt', 'savings'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        values.type === type && styles.typeButtonActive,
                      ]}
                      onPress={() => setFieldValue('type', type)}>
                      <Text
                        style={[
                          styles.typeButtonText,
                          values.type === type && styles.typeButtonTextActive,
                        ]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
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
                    onChangeText={handleChange('name')}
                    value={values.name}
                    placeholder="Enter account name"
                    placeholderTextColor="#8E8E93"
                  />
                  {errors.name && <Text style={styles.error}>{errors.name}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={styles.input}
                    onChangeText={handleChange('description')}
                    value={values.description}
                    placeholder="Optional description"
                    placeholderTextColor="#8E8E93"
                    multiline
                  />
                </View>
              </View>

              {/* Icon Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Icon</Text>
                <View style={styles.iconGrid}>
                  {accountIcons.map((icon) => (
                    <TouchableOpacity
                      key={icon.name}
                      style={[
                        styles.iconButton,
                        values.icon === icon.name && styles.iconButtonActive,
                      ]}
                      onPress={() => setFieldValue('icon', icon.name)}>
                      <MaterialCommunityIcons
                        name={icon.name as any}
                        size={24}
                        color={values.icon === icon.name ? '#6B8AFE' : '#8E8E93'}
                      />
                      <Text style={styles.iconLabel}>{icon.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Financial Details */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Financial Details</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Currency *</Text>
                  <TextInput
                    style={styles.input}
                    onChangeText={handleChange('currency')}
                    value={values.currency}
                    placeholder="PHP"
                    placeholderTextColor="#8E8E93"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Initial Balance *</Text>
                  <TextInput
                    style={styles.input}
                    onChangeText={handleChange('balance')}
                    value={values.balance}
                    placeholder="0.00"
                    placeholderTextColor="#8E8E93"
                    keyboardType="numeric"
                  />
                  {errors.balance && <Text style={styles.error}>{errors.balance}</Text>}
                </View>

                {values.type === 'debt' && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Credit Limit *</Text>
                    <TextInput
                      style={styles.input}
                      onChangeText={handleChange('creditLimit')}
                      value={values.creditLimit}
                      placeholder="0.00"
                      placeholderTextColor="#8E8E93"
                      keyboardType="numeric"
                    />
                    {errors.creditLimit && (
                      <Text style={styles.error}>{errors.creditLimit}</Text>
                    )}
                  </View>
                )}
              </View>

              {/* Include in Total */}
              <View style={styles.section}>
                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    style={[
                      styles.checkbox,
                      values.includeInTotal && styles.checkboxChecked,
                    ]}
                    onPress={() => setFieldValue('includeInTotal', !values.includeInTotal)}>
                    {values.includeInTotal && (
                      <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                  <Text style={styles.checkboxLabel}>Include in total balance</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={() => handleSubmit()}>
                <Text style={styles.submitButtonText}>Add Account</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </Formik>
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
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
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
  error: {
    color: '#FF4B8C',
    fontSize: 12,
    marginTop: 4,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconButton: {
    width: '18%',
    aspectRatio: 1,
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
  iconLabel: {
    color: '#8E8E93',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#8E8E93',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6B8AFE',
    borderColor: '#6B8AFE',
  },
  checkboxLabel: {
    color: '#FFFFFF',
    fontSize: 16,
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