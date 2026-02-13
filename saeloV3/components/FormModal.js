import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';

export default function FormModal({ visible, title, fields, onSubmit, onClose, loading }) {
  const [values, setValues] = useState({});

  useEffect(() => {
    if (visible) {
      const defaults = {};
      fields.forEach(f => {
        defaults[f.key] = f.defaultValue || '';
      });
      setValues(defaults);
    }
  }, [visible]);

  const setValue = (key, val) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = () => {
    const errors = [];
    fields.forEach(f => {
      const val = values[f.key];
      if (f.required && !val) {
        errors.push(`${f.label} is required`);
        return;
      }
      if (!val) return;
      if (f.type === 'number') {
        const num = Number(val);
        if (isNaN(num)) {
          errors.push(`${f.label} must be a number`);
        } else if (f.min !== undefined && num < f.min) {
          errors.push(`${f.label} must be at least ${f.min}`);
        } else if (f.max !== undefined && num > f.max) {
          errors.push(`${f.label} must be at most ${f.max}`);
        }
      }
      if (f.maxLength && typeof val === 'string' && val.length > f.maxLength) {
        errors.push(`${f.label} must be ${f.maxLength} characters or less`);
      }
    });
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }
    onSubmit(values);
  };

  const renderField = (field) => {
    if (field.type === 'select') {
      return (
        <View key={field.key} style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{field.label}{field.required ? ' *' : ''}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
            {field.options.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.pill, values[field.key] === opt && styles.pillActive]}
                onPress={() => setValue(field.key, opt)}
              >
                <Text style={[styles.pillText, values[field.key] === opt && styles.pillTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }

    return (
      <View key={field.key} style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{field.label}{field.required ? ' *' : ''}</Text>
        <TextInput
          style={styles.textInput}
          value={values[field.key] || ''}
          onChangeText={val => setValue(field.key, val)}
          placeholder={field.placeholder || ''}
          placeholderTextColor="#BBB"
          keyboardType={field.type === 'number' ? 'numeric' : 'default'}
          autoCapitalize={field.type === 'number' ? 'none' : 'sentences'}
          maxLength={field.maxLength || 500}
        />
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <View style={styles.dragHandle} />

              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={24} color="#000" />
              </TouchableOpacity>

              <Text style={styles.title}>{title}</Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                {fields.map(renderField)}

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitText}>Save</Text>
                  )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#EEE',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 15,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    zIndex: 10,
  },
  title: {
    ...typography.heading1,
    fontSize: 22,
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  pillRow: {
    flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F3F5',
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  pillTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
