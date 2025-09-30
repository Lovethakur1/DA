import React, { useEffect, useRef } from 'react'
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native'

interface CustomAlertProps {
  visible: boolean
  title: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  onClose: () => void
  buttons?: Array<{
    text: string
    onPress: () => void
    style?: 'default' | 'cancel' | 'destructive'
    disabled?: boolean
  }>
  /** If true, tapping the dimmed backdrop closes the alert. */
  dismissOnBackdropPress?: boolean
}

const { width } = Dimensions.get('window')

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  type = 'info',
  onClose,
  buttons = [{ text: 'OK', onPress: onClose }],
  dismissOnBackdropPress = false
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.92)).current
  const isAnimatingRef = useRef(false)

  useEffect(() => {
    isAnimatingRef.current = true
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          // spring API (RN keeps tension/friction for legacy);
          // these values give a subtle pop without overshoot.
          friction: 8,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start(() => { isAnimatingRef.current = false })
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.92,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start(() => { isAnimatingRef.current = false })
    }
  }, [visible, fadeAnim, scaleAnim])

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return { iconColor: '#10B981', borderColor: '#10B981', backgroundColor: '#ECFDF5', icon: '✅' }
      case 'error':
        return { iconColor: '#EF4444', borderColor: '#EF4444', backgroundColor: '#FEF2F2', icon: '❌' }
      case 'warning':
        return { iconColor: '#F59E0B', borderColor: '#F59E0B', backgroundColor: '#FFFBEB', icon: '⚠️' }
      default:
        return { iconColor: '#3B82F6', borderColor: '#3B82F6', backgroundColor: '#EFF6FF', icon: 'ℹ️' }
    }
  }

  const getButtonStyle = (buttonStyle?: string) => {
    switch (buttonStyle) {
      case 'cancel':
        return { backgroundColor: '#F3F4F6', textColor: '#374151' }
      case 'destructive':
        return { backgroundColor: '#EF4444', textColor: '#FFFFFF' }
      default:
        return { backgroundColor: '#289294', textColor: '#FFFFFF' }
    }
  }

  const typeStyles = getTypeStyles()

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={() => {
        // Handle Android back
        if (!isAnimatingRef.current) onClose()
      }}
    >
      {/* Backdrop (Pressable so we can conditionally close on outside press) */}
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable
          style={styles.overlayPressable}
          onPress={dismissOnBackdropPress ? onClose : undefined}
        >
          {/* Dialog container: Pressable with empty onPress to consume touches */}
          <Pressable onPress={() => { /* consume, do nothing */ }} style={{ width: '100%', alignItems: 'center' }}>
            <Animated.View
              style={[
                styles.alertContainer,
                {
                  borderLeftColor: typeStyles.borderColor,
                  backgroundColor: typeStyles.backgroundColor,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <View style={styles.header}>
                <Text style={[styles.icon, { color: typeStyles.iconColor }]}>
                  {typeStyles.icon}
                </Text>
                <Text style={styles.title}>{title}</Text>
              </View>

              <Text style={styles.message}>{message}</Text>

              <View style={styles.buttonContainer}>
                {buttons.map((button, index) => {
                  const buttonStyles = getButtonStyle(button.style)
                  const isDisabled = button.disabled || false
                  return (
                    <Pressable
                      key={`${button.text}-${index}` }
                      style={[
                        styles.button,
                        { backgroundColor: buttonStyles.backgroundColor },
                        buttons.length > 1 && index > 0 && styles.buttonMargin,
                        isDisabled && styles.buttonDisabled
                      ]}
                      android_ripple={{ borderless: false }}
                      onPress={() => {
                        // Run button handler first; caller decides whether to keep open or call onClose.
                        if (!isDisabled) {
                          button.onPress()
                        }
                      }}
                      disabled={isDisabled}
                    >
                      <Text style={[
                        styles.buttonText, 
                        { color: buttonStyles.textColor },
                        isDisabled && styles.buttonTextDisabled
                      ]}>
                        {button.text}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayPressable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 32,
    maxWidth: width - 64,
    minWidth: width * 0.7,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  message: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonMargin: {
    marginLeft: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonTextDisabled: {
    opacity: 0.6,
  },
})

export default CustomAlert
