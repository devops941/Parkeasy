import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { Header } from '../../components/common/Header.js';
import { Card } from '../../components/common/Card.js';
import { Button } from '../../components/common/Button.js';
import { apiClient } from '../../api/client.js';
import { colors, spacing, typography } from '../../utils/theme.js';

export const UserFeedbackScreen = ({ navigation }) => {
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || message.trim().length < 5) {
      Alert.alert('Feedback Required', 'Please enter at least 5 characters in your message.');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post('/feedback', {
        rating,
        message: message.trim(),
      });

      Alert.alert(
        'Thank You!',
        'Your feedback has been sent directly to the ParkEasy management team.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Send Feedback"
        subtitle="Help us improve ParkEasy"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>HOW WAS YOUR PARKING EXPERIENCE?</Text>

          {/* Star Rating Selector */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                activeOpacity={0.7}
                style={styles.starBtn}
              >
                <Text style={[styles.starIcon, rating >= star && styles.activeStar]}>
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingText}>
            {rating === 5
              ? '⭐⭐⭐⭐⭐ Outstanding!'
              : rating === 4
              ? '⭐⭐⭐⭐ Very Good'
              : rating === 3
              ? '⭐⭐⭐ Average'
              : rating === 2
              ? '⭐⭐ Needs Improvement'
              : '⭐ Poor'}
          </Text>

          {/* Feedback Message Input */}
          <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
            YOUR COMMENTS OR SUGGESTIONS
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder="Tell us what you loved or what we can do better..."
            placeholderTextColor={colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <Button
            title="Submit Feedback"
            onPress={handleSubmit}
            loading={isSubmitting}
            style={styles.submitBtn}
          />
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 20,
  },
  sectionLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
    letterSpacing: 0.5,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  starBtn: {
    padding: spacing.xs,
  },
  starIcon: {
    fontSize: 38,
    color: colors.border,
  },
  activeStar: {
    color: '#fbbf24', // Golden yellow
  },
  ratingText: {
    textAlign: 'center',
    ...typography.bodySecondary,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    color: colors.text,
    fontSize: 14,
    height: 120,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
});

