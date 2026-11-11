import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  XCircle,
  ArrowRight,
  Settings,
  Server,
  X,
  CheckCircle2,
  Crown,
  Ticket,
  Car,
  Check,
} from '../../components/common/Icons.js';
import { useAuthStore } from '../../store/authStore.js';
import {
  apiClient,
  setApiBaseUrl,
  getAutoDetectedUrl,
  DEFAULT_API_URL,
  resolveEffectiveApiUrl,
} from '../../api/client.js';
import { storage } from '../../utils/storage.js';

export const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('admin@parkeasy.com');
  const [password, setPassword] = useState('Admin@12345');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [activeRole, setActiveRole] = useState('admin');
  const [errors, setErrors] = useState({});

  // Toast
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastAnim] = useState(new Animated.Value(0));

  // Server URL editor
  const [currentServerUrl, setCurrentServerUrl] = useState(apiClient.defaults.baseURL);
  const [isUrlModalVisible, setIsUrlModalVisible] = useState(false);
  const [tempUrl, setTempUrl] = useState(apiClient.defaults.baseURL);

  const { login, isLoading, error, clearError } = useAuthStore();

  useEffect(() => {
    resolveEffectiveApiUrl().then((resolved) => {
      if (resolved) {
        setCurrentServerUrl(resolved);
        setTempUrl(resolved);
      } else {
        // No URL configured and auto-detection failed (physical device without Expo bundler)
        setIsUrlModalVisible(true);
      }
    });
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => setToastVisible(false));
    }, 2800);
  };

  const validate = () => {
    const errs = {};
    if (!email.trim()) {
      errs.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      errs.email = 'Enter a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    clearError();
    if (!validate()) return;
    const res = await login(email.trim().toLowerCase(), password);
    if (!res?.success && res?.message) {
      showToast(res.message);
    }
  };

  // Role preset definitions
  const ROLE_PRESETS = {
    admin: {
      email: 'admin@parkeasy.com',
      password: 'Admin@12345',
      label: 'Admin',
    },
    handler: {
      email: 'handler@parkeasy.com',
      password: 'Handler@12345',
      label: 'Handler',
    },
    car_owner: {
      email: 'user@parkeasy.com',
      password: 'User@12345',
      label: 'Owner',
    },
  };

  const selectRole = (roleKey) => {
    setActiveRole(roleKey);
    const data = ROLE_PRESETS[roleKey];
    if (data) {
      setEmail(data.email);
      setPassword(data.password);
      setErrors({});
      clearError();
      showToast(`Loaded ${data.label} demo credentials`);
    }
  };

  const handleSaveServerUrl = async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.activeElement?.blur?.();
    }
    const trimmed = tempUrl.trim().replace(/\/+$/, '');
    if (!trimmed.startsWith('http')) {
      showToast('URL must start with http:// or https://');
      return;
    }
    setApiBaseUrl(trimmed);
    if (DEFAULT_API_URL && trimmed === DEFAULT_API_URL.trim()) {
      await storage.removeItem('customApiUrl');
    } else {
      await storage.setItem('customApiUrl', trimmed);
    }
    setCurrentServerUrl(trimmed);
    setTempUrl(trimmed);
    setIsUrlModalVisible(false);
    clearError();
    showToast(`Server set to: ${trimmed}`);
  };

  const setPresetUrl = (url) => {
    setTempUrl(url);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Ambient Glow Meshes */}
        <View style={styles.meshBlob1} pointerEvents="none" />
        <View style={styles.meshBlob2} pointerEvents="none" />

        <View style={styles.contentWrapper}>
          {/* Branding Header */}
          <View style={styles.header}>
            {/* App Logo with neon parking icon */}
            <View style={styles.logoOuter}>
              <View style={styles.logoBlur} />
              <View style={styles.logoCard}>
                <View style={styles.logoBadge}>
                  <Text style={styles.logoBadgeText}>P</Text>
                </View>
                {/* Active Pulse Dot */}
                <View style={styles.pulseDot} />
              </View>
            </View>

            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to your <Text style={styles.brandAccent}>ParkEasy</Text> account
            </Text>
          </View>

          {/* Main Glass Login Card */}
          <View style={styles.glassCard}>
            {/* Top highlight gradient border line */}
            <View style={styles.topHighlightLine} />

            {/* Error Banner */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{error}</Text>
              </View>
            )}

            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>EMAIL OR USERNAME</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.email && styles.inputWrapperError,
                ]}
              >
                <View style={styles.inputIconLeft}>
                  <Mail size={17} color="#94a3b8" />
                </View>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g. admin@parkeasy.com"
                  placeholderTextColor="#64748b"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (errors.email) setErrors({ ...errors, email: null });
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="username"
                />
                {email.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={() => setEmail('')}
                  >
                    <XCircle size={16} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>
              {errors.email && (
                <Text style={styles.fieldErrorText}>{errors.email}</Text>
              )}
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <View style={styles.passwordHeaderRow}>
                <Text style={styles.fieldLabel}>PASSWORD</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  errors.password && styles.inputWrapperError,
                ]}
              >
                <View style={styles.inputIconLeft}>
                  <Lock size={17} color="#94a3b8" />
                </View>
                <TextInput
                  style={styles.inputField}
                  placeholder="••••••••••••"
                  placeholderTextColor="#64748b"
                  secureTextEntry={!isPasswordVisible}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errors.password) setErrors({ ...errors, password: null });
                  }}
                  autoCapitalize="none"
                  autoComplete="current-password"
                />
                <TouchableOpacity
                  style={styles.eyeToggleBtn}
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                >
                  {isPasswordVisible ? (
                    <EyeOff size={15} color="#60a5fa" />
                  ) : (
                    <Eye size={15} color="#60a5fa" />
                  )}
                  <Text style={styles.eyeToggleText}>
                    {isPasswordVisible ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.fieldErrorText}>{errors.password}</Text>
              )}
            </View>

            {/* Remember Me Checkbox */}
            <TouchableOpacity
              style={styles.rememberRow}
              activeOpacity={0.8}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View
                style={[
                  styles.checkboxBox,
                  rememberMe && styles.checkboxBoxChecked,
                ]}
              >
                {rememberMe && <Check size={12} color="#ffffff" strokeWidth={3} />}
              </View>
              <Text style={styles.rememberText}>Remember this device</Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.88}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <View style={styles.btnContentRow}>
                  <Text style={styles.submitButtonText}>Sign In</Text>
                  <ArrowRight size={17} color="#ffffff" style={styles.btnArrow} />
                </View>
              )}
            </TouchableOpacity>

            {/* Quick Test As / Role Preset Buttons */}
            <View style={styles.rolePresetContainer}>
              <View style={styles.roleDividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>OR QUICK TEST AS</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.rolePillsGrid}>
                {/* Admin */}
                <TouchableOpacity
                  style={[
                    styles.rolePill,
                    activeRole === 'admin' && styles.rolePillActive,
                  ]}
                  onPress={() => selectRole('admin')}
                  activeOpacity={0.8}
                >
                  <Crown
                    size={14}
                    color={activeRole === 'admin' ? '#93c5fd' : '#cbd5e1'}
                  />
                  <Text
                    style={[
                      styles.rolePillText,
                      activeRole === 'admin' && styles.rolePillTextActive,
                    ]}
                  >
                    Admin
                  </Text>
                </TouchableOpacity>

                {/* Handler */}
                <TouchableOpacity
                  style={[
                    styles.rolePill,
                    activeRole === 'handler' && styles.rolePillActive,
                  ]}
                  onPress={() => selectRole('handler')}
                  activeOpacity={0.8}
                >
                  <Ticket
                    size={14}
                    color={activeRole === 'handler' ? '#93c5fd' : '#cbd5e1'}
                  />
                  <Text
                    style={[
                      styles.rolePillText,
                      activeRole === 'handler' && styles.rolePillTextActive,
                    ]}
                  >
                    Handler
                  </Text>
                </TouchableOpacity>

                {/* Car Owner */}
                <TouchableOpacity
                  style={[
                    styles.rolePill,
                    activeRole === 'car_owner' && styles.rolePillActive,
                  ]}
                  onPress={() => selectRole('car_owner')}
                  activeOpacity={0.8}
                >
                  <Car
                    size={14}
                    color={activeRole === 'car_owner' ? '#93c5fd' : '#cbd5e1'}
                  />
                  <Text
                    style={[
                      styles.rolePillText,
                      activeRole === 'car_owner' && styles.rolePillTextActive,
                    ]}
                  >
                    Owner
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Register Footer Link */}
            <View style={styles.registerFooter}>
              <Text style={styles.registerPrompt}>
                Don't have an account?{' '}
                <Text
                  style={styles.registerLink}
                  onPress={() => navigation.navigate('Register')}
                >
                  Register
                </Text>
              </Text>
            </View>
          </View>

          {/* Bottom Server Configuration Pill */}
          <TouchableOpacity
            style={styles.serverPill}
            onPress={() => {
              if (Platform.OS === 'web' && typeof document !== 'undefined') {
                document.activeElement?.blur?.();
              }
              setTempUrl(currentServerUrl);
              setIsUrlModalVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Settings size={13} color="#60a5fa" />
            <Text style={styles.serverPillLabel}>Server:</Text>
            <Text style={styles.serverPillUrl} numberOfLines={1}>
              {currentServerUrl}
            </Text>
            <Text style={styles.serverPillChange}>(Tap to change)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Server Configuration Modal */}
      <Modal
        visible={isUrlModalVisible}
        transparent
        animationType="fade"
        onShow={() => {
          if (Platform.OS === 'web' && typeof document !== 'undefined') {
            document.activeElement?.blur?.();
          }
        }}
        onRequestClose={() => {
          if (Platform.OS === 'web' && typeof document !== 'undefined') {
            document.activeElement?.blur?.();
          }
          setIsUrlModalVisible(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleRow}>
                <View style={styles.modalIconBox}>
                  <Server size={16} color="#60a5fa" />
                </View>
                <Text style={styles.modalTitle}>Configure Server</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === 'web' && typeof document !== 'undefined') {
                    document.activeElement?.blur?.();
                  }
                  setIsUrlModalVisible(false);
                }}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Set the API endpoint for authentication and parking microservices.
            </Text>

            <View style={styles.modalFieldGroup}>
              <Text style={styles.modalInputLabel}>API BASE URL</Text>
              <View style={styles.modalInputWrapper}>
                <TextInput
                  style={styles.modalInputField}
                  value={tempUrl}
                  onChangeText={setTempUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Quick URL Presets */}
            <View style={styles.presetButtonsRow}>
              <TouchableOpacity
                style={styles.presetBtn}
                onPress={() => setPresetUrl('http://localhost:5000/api/v1')}
              >
                <Text style={styles.presetBtnText}>Localhost</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetBtn}
                onPress={() => setPresetUrl(getAutoDetectedUrl())}
              >
                <Text style={styles.presetBtnText}>Wi-Fi Network</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetBtn}
                onPress={() => setPresetUrl('https://api.parkeasy.cloud/v1')}
              >
                <Text style={styles.presetBtnText}>Cloud/Prod</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  if (Platform.OS === 'web' && typeof document !== 'undefined') {
                    document.activeElement?.blur?.();
                  }
                  setIsUrlModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveServerUrl}
              >
                <Text style={styles.modalSaveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Toast Notification */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <CheckCircle2 size={18} color="#60a5fa" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#070b14',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    position: 'relative',
  },
  meshBlob1: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(37, 99, 235, 0.18)',
  },
  meshBlob2: {
    position: 'absolute',
    bottom: -40,
    right: -40,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(147, 51, 234, 0.12)',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logoOuter: {
    position: 'relative',
    marginBottom: 14,
  },
  logoBlur: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    opacity: 0.35,
  },
  logoCard: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: '#0b1120',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  logoBadgeText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -1,
  },
  pulseDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#0b1120',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  brandAccent: {
    color: '#60a5fa',
    fontWeight: '700',
  },
  glassCard: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 24,
    paddingVertical: 26,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.65,
    shadowRadius: 30,
  },
  topHighlightLine: {
    position: 'absolute',
    top: 0,
    left: 40,
    right: 40,
    height: 1.5,
    backgroundColor: 'rgba(96, 165, 250, 0.35)',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorBoxText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#cbd5e1',
    marginBottom: 6,
  },
  passwordHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 12,
    color: '#60a5fa',
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    height: 46,
    paddingHorizontal: 12,
  },
  inputWrapperError: {
    borderColor: '#ef4444',
  },
  inputIconLeft: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  eyeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  eyeToggleText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
  },
  fieldErrorText: {
    color: '#ef4444',
    fontSize: 11,
    marginTop: 4,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  checkboxBox: {
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxBoxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#3b82f6',
  },
  rememberText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.25)',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  btnArrow: {
    marginTop: 1,
  },
  rolePresetContainer: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.07)',
  },
  roleDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
  },
  dividerLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 10,
  },
  rolePillsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  rolePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  rolePillActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    borderColor: '#3b82f6',
  },
  rolePillText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  rolePillTextActive: {
    color: '#93c5fd',
    fontWeight: '700',
  },
  registerFooter: {
    marginTop: 18,
    alignItems: 'center',
  },
  registerPrompt: {
    color: '#94a3b8',
    fontSize: 12,
  },
  registerLink: {
    color: '#60a5fa',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    marginTop: 18,
  },
  serverPillLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
  serverPillUrl: {
    color: '#93c5fd',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    maxWidth: 160,
  },
  serverPillChange: {
    color: '#64748b',
    fontSize: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.7,
    shadowRadius: 28,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 17,
  },
  modalFieldGroup: {
    marginBottom: 12,
  },
  modalInputLabel: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  modalInputWrapper: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    height: 42,
    justifyContent: 'center',
  },
  modalInputField: {
    color: '#93c5fd',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  presetButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 18,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 6,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    alignItems: 'center',
  },
  presetBtnText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '600',
  },
  modalActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalCancelText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  modalSaveBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    zIndex: 999,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
